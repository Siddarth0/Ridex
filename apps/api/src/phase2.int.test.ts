import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";

vi.mock("./lib/email.js", () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

import { createApp } from "./app.js";
import type { Db } from "./db/index.js";
import * as dbSchema from "./db/schema/index.js";
import { hashPassword } from "./lib/password.js";
import type { GeoProvider } from "./modules/geo/provider.js";
import type { RideNotifier } from "./modules/rides/notify.js";
import { createDispatcher, type Dispatcher } from "./modules/matching/dispatcher.js";
import { PLATFORM_COMMISSION } from "@ridex/shared";

// ── Test doubles ──────────────────────────────────────────────────────────────

/** Deterministic routing: 5km / 15min, no network. */
const fakeGeo: GeoProvider = {
  async route() {
    return { distanceM: 5_000, durationS: 900, polyline: "fake_polyline", degraded: false };
  },
  async geocode() {
    return [{ name: "Thamel", address: "Thamel, Kathmandu", coordinates: [85.3123, 27.7154] }];
  },
  async reverseGeocode() {
    return "Somewhere in Kathmandu";
  },
};

interface Notification {
  kind: string;
  userId?: string;
  payload?: unknown;
}
const sent: Notification[] = [];
const notifier: RideNotifier = {
  rideUpdate: (riderUserId, driverUserId, ride) =>
    sent.push({ kind: "ride:update", userId: riderUserId, payload: { driverUserId, ride } }),
  offer: (driverUserId, payload) => sent.push({ kind: "ride:offer", userId: driverUserId, payload }),
  offerRevoked: (driverUserId, rideId, reason) =>
    sent.push({ kind: "ride:offer_revoked", userId: driverUserId, payload: { rideId, reason } }),
  rideExpired: (riderUserId, rideId) =>
    sent.push({ kind: "ride:expired", userId: riderUserId, payload: { rideId } }),
  driverLocation: (riderUserId, payload) =>
    sent.push({ kind: "driver:location", userId: riderUserId, payload }),
};
const notificationsOf = (kind: string) => sent.filter((n) => n.kind === kind);

let app: ReturnType<typeof createApp>;
let db: Db;
let dispatcher: Dispatcher;

// Kathmandu coordinates
const THAMEL = { lat: 27.7154, lng: 85.3123 };
const PATAN = { lat: 27.6644, lng: 85.3188 };
/** ~700m from Thamel — inside the 2km initial dispatch ring. */
const NEAR_THAMEL = { lat: 27.7215, lng: 85.3135 };

function cookieHeader(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

/** Register+verify+login a user directly through the DB + API. */
async function makeUser(email: string, role: "rider" | "admin" = "rider") {
  const [user] = await db
    .insert(dbSchema.users)
    .values({
      email,
      phone: `+977980${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`,
      passwordHash: await hashPassword("password-123"),
      firstName: "Test",
      lastName: role,
      role,
      emailVerifiedAt: new Date(),
    })
    .returning();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password-123" });
  return { user: user!, cookies: cookieHeader(login) };
}

/** Approved online driver with a bike at the given position. */
let driverSeq = 0;
async function makeDriver(email: string, pos: { lat: number; lng: number }) {
  const seq = ++driverSeq;
  const { user, cookies } = await makeUser(email);
  await db.update(dbSchema.users).set({ role: "driver" }).where(eq(dbSchema.users.id, user.id));
  const [driver] = await db
    .insert(dbSchema.drivers)
    .values({ userId: user.id, licenseNumber: `LIC-${seq}`, status: "approved", isOnline: true })
    .returning();
  await db.insert(dbSchema.vehicles).values({
    driverId: driver!.id,
    rideType: "bike",
    make: "Honda",
    model: "Shine",
    plateNumber: `BA-2-${seq}`,
  });
  await db
    .insert(dbSchema.driverLocations)
    .values({ driverId: driver!.id, lat: pos.lat, lng: pos.lng, updatedAt: new Date() });
  // Re-login so the JWT carries the driver role
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password-123" });
  return { user: user!, driver: driver!, cookies: cookieHeader(login) };
}

/** Test isolation: sideline every driver created by earlier tests. */
async function allDriversOffline() {
  await db.update(dbSchema.drivers).set({ isOnline: false });
}

function rideRequestBody() {
  return {
    pickup: { address: "Thamel", coordinates: [THAMEL.lng, THAMEL.lat] },
    destination: { address: "Patan", coordinates: [PATAN.lng, PATAN.lat] },
    rideType: "bike",
    paymentMethod: "cash",
  };
}

beforeAll(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const client = new PGlite();
  const pgliteDb = drizzle(client, { schema: dbSchema, casing: "snake_case" });
  await migrate(pgliteDb, {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  db = pgliteDb as unknown as Db;

  // Seed fare configs (what db/seed.ts does in prod)
  await db.insert(dbSchema.fareConfigs).values([
    { rideType: "bike", baseFare: 30, perKm: 20, perMin: 2, minFare: 60 },
    { rideType: "car", baseFare: 60, perKm: 40, perMin: 3, minFare: 120 },
    { rideType: "premium", baseFare: 100, perKm: 60, perMin: 5, minFare: 200 },
  ]);

  const storage = {
    async save() {
      return { path: "x" };
    },
    async read() {
      return Buffer.from("");
    },
  };
  app = createApp({ db, storage, geo: fakeGeo, notifier });
  dispatcher = createDispatcher(db, notifier);
});

describe("estimates", () => {
  it("prices all ride types from the routed distance", async () => {
    const { cookies } = await makeUser("estimator@test.np");
    const res = await request(app)
      .post("/api/rides/estimate")
      .set("Cookie", cookies)
      .send({ pickup: [THAMEL.lng, THAMEL.lat], destination: [PATAN.lng, PATAN.lat] });
    expect(res.status).toBe(200);
    expect(res.body.data.distanceM).toBe(5000);
    const bike = res.body.data.estimates.find((e: { rideType: string }) => e.rideType === "bike");
    // 30 + 20×5 + 2×15 = 160
    expect(bike.estimatedFare).toBe(160);
  });
});

describe("golden path: request → offer → accept → arrive → start → complete → rate", () => {
  let riderCookies = "";
  let riderId = "";
  let driverCookies = "";
  let driverUserId = "";
  let rideId = "";

  it("creates a searching ride with an estimate", async () => {
    const rider = await makeUser("rider1@test.np");
    riderCookies = rider.cookies;
    riderId = rider.user.id;
    const driver = await makeDriver("driver1@test.np", NEAR_THAMEL);
    driverCookies = driver.cookies;
    driverUserId = driver.user.id;

    const res = await request(app).post("/api/rides").set("Cookie", riderCookies).send(rideRequestBody());
    expect(res.status).toBe(201);
    expect(res.body.data.ride.status).toBe("searching");
    expect(res.body.data.ride.estimatedFare).toBe(160);
    rideId = res.body.data.ride.id;
  });

  it("dispatcher offers the ride to the nearby driver", async () => {
    await dispatcher.tick();
    const offers = notificationsOf("ride:offer");
    expect(offers.some((o) => o.userId === driverUserId)).toBe(true);
    const [offerRow] = await db
      .select()
      .from(dbSchema.rideOffers)
      .where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offerRow?.status).toBe("offered");
  });

  it("does not re-offer to the same driver on the next tick", async () => {
    const before = notificationsOf("ride:offer").length;
    await dispatcher.tick();
    expect(notificationsOf("ride:offer").length).toBe(before);
  });

  it("driver accepts and the ride is assigned", async () => {
    const res = await request(app).post(`/api/rides/${rideId}/accept`).set("Cookie", driverCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.ride.status).toBe("accepted");
    expect(res.body.data.ride.driver.firstName).toBe("Test");
    expect(res.body.data.ride.vehicle.plateNumber).toMatch(/^BA-2-/);
  });

  it("walks the lifecycle to completed with correct ledger entries", async () => {
    const arrive = await request(app).post(`/api/rides/${rideId}/arrive`).set("Cookie", driverCookies);
    expect(arrive.status).toBe(200);
    const start = await request(app).post(`/api/rides/${rideId}/start`).set("Cookie", driverCookies);
    expect(start.status).toBe(200);
    const complete = await request(app)
      .post(`/api/rides/${rideId}/complete`)
      .set("Cookie", driverCookies);
    expect(complete.status).toBe(200);
    expect(complete.body.data.ride.status).toBe("completed");
    const finalFare = complete.body.data.ride.finalFare;
    expect(finalFare).toBeGreaterThan(0);

    // Ledger invariant: fare − commission − payout = 0
    const entries = await db
      .select()
      .from(dbSchema.ledgerEntries)
      .where(eq(dbSchema.ledgerEntries.rideId, rideId));
    expect(entries).toHaveLength(3);
    const byType = Object.fromEntries(entries.map((e) => [e.type, e.amount]));
    expect(byType.ride_fare).toBe(finalFare);
    expect(
      Math.abs(byType.ride_fare! - byType.commission! - byType.driver_payout!),
    ).toBeLessThan(0.01);
    expect(byType.commission).toBeCloseTo(finalFare * PLATFORM_COMMISSION, 1);

    // Full audit trail exists
    const events = await db
      .select()
      .from(dbSchema.rideEvents)
      .where(eq(dbSchema.rideEvents.rideId, rideId));
    const statuses = events.map((e) => e.toStatus);
    expect(statuses).toEqual(
      expect.arrayContaining(["searching", "accepted", "arrived", "in_progress", "completed"]),
    );
  });

  it("blocks invalid transitions (complete twice)", async () => {
    const res = await request(app).post(`/api/rides/${rideId}/complete`).set("Cookie", driverCookies);
    expect(res.status).toBe(409);
  });

  it("both sides rate once, driver aggregate updates", async () => {
    const riderRates = await request(app)
      .post(`/api/rides/${rideId}/rating`)
      .set("Cookie", riderCookies)
      .send({ score: 5, comment: "smooth ride" });
    expect(riderRates.status).toBe(201);

    const again = await request(app)
      .post(`/api/rides/${rideId}/rating`)
      .set("Cookie", riderCookies)
      .send({ score: 4 });
    expect(again.status).toBe(409);

    const driverRates = await request(app)
      .post(`/api/rides/${rideId}/rating`)
      .set("Cookie", driverCookies)
      .send({ score: 4 });
    expect(driverRates.status).toBe(201);

    const [driverRow] = await db
      .select()
      .from(dbSchema.drivers)
      .where(eq(dbSchema.drivers.userId, driverUserId));
    expect(driverRow?.ratingAvg).toBe(5);
    expect(driverRow?.ratingCount).toBe(1);

    const earnings = await request(app).get("/api/drivers/me/earnings").set("Cookie", driverCookies);
    expect(earnings.body.data.today.rides).toBe(1);
    expect(earnings.body.data.today.total).toBeGreaterThan(0);
  });
});

describe("dispatch races and expiry", () => {
  it("exactly one of two simultaneous accepts wins", async () => {
    await allDriversOffline();
    const rider = await makeUser("rider2@test.np");
    const d1 = await makeDriver("race-a@test.np", THAMEL);
    const d2 = await makeDriver("race-b@test.np", THAMEL);

    const create = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    const rideId = create.body.data.ride.id;
    await dispatcher.tick();

    const [resA, resB] = await Promise.all([
      request(app).post(`/api/rides/${rideId}/accept`).set("Cookie", d1.cookies),
      request(app).post(`/api/rides/${rideId}/accept`).set("Cookie", d2.cookies),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const [ride] = await db.select().from(dbSchema.rides).where(eq(dbSchema.rides.id, rideId));
    expect(ride?.status).toBe("accepted");
    // Loser's offer is superseded
    const offers = await db
      .select()
      .from(dbSchema.rideOffers)
      .where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offers.filter((o) => o.status === "accepted")).toHaveLength(1);
    expect(offers.filter((o) => o.status === "offered")).toHaveLength(0);

    // cleanup: complete is not needed; cancel to free the winner for later tests
    const winner = resA.status === 200 ? d1 : d2;
    await request(app).post(`/api/rides/${rideId}/cancel`).set("Cookie", winner.cookies).send({ reason: "test" });
  });

  it("expired offers are revoked and dispatch widens to a farther driver", async () => {
    await allDriversOffline();
    const rider = await makeUser("rider3@test.np");
    // ~5.5km away — outside the 2km initial ring, inside a widened one
    const far = await makeDriver("far-driver@test.np", { lat: 27.766, lng: 85.32 });

    const create = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    const rideId = create.body.data.ride.id;

    // First tick: nobody in 2km
    await dispatcher.tick();
    let offers = await db.select().from(dbSchema.rideOffers).where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offers).toHaveLength(0);

    // Pretend 45s elapsed → radius 2000 + 2×1500 = 5000... still short; 65s → 6500m reaches
    await db
      .update(dbSchema.rides)
      .set({ requestedAt: new Date(Date.now() - 65_000) })
      .where(eq(dbSchema.rides.id, rideId));
    await dispatcher.tick();
    offers = await db.select().from(dbSchema.rideOffers).where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offers).toHaveLength(1);
    expect(offers[0]?.driverId).toBe(far.driver.id);

    // Force the offer past its TTL → next tick expires it and notifies the driver
    await db
      .update(dbSchema.rideOffers)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(dbSchema.rideOffers.rideId, rideId));
    await dispatcher.tick();
    offers = await db.select().from(dbSchema.rideOffers).where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offers[0]?.status).toBe("expired");
    expect(
      notificationsOf("ride:offer_revoked").some(
        (n) => n.userId === far.user.id && (n.payload as { reason: string }).reason === "expired",
      ),
    ).toBe(true);

    // Accepting the expired offer fails
    const late = await request(app).post(`/api/rides/${rideId}/accept`).set("Cookie", far.cookies);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("OFFER_EXPIRED");

    // Search deadline passes → ride expires, rider notified
    await db
      .update(dbSchema.rides)
      .set({ searchExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(dbSchema.rides.id, rideId));
    await dispatcher.tick();
    const [ride] = await db.select().from(dbSchema.rides).where(eq(dbSchema.rides.id, rideId));
    expect(ride?.status).toBe("expired");
    expect(notificationsOf("ride:expired").some((n) => n.userId === rider.user.id)).toBe(true);
  });

  it("rider cancel during search supersedes outstanding offers", async () => {
    await allDriversOffline();
    const rider = await makeUser("rider4@test.np");
    const nearby = await makeDriver("cancel-driver@test.np", THAMEL);

    const create = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    const rideId = create.body.data.ride.id;
    await dispatcher.tick();

    const cancel = await request(app)
      .post(`/api/rides/${rideId}/cancel`)
      .set("Cookie", rider.cookies)
      .send({ reason: "changed my mind" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.ride.status).toBe("cancelled");

    const offers = await db.select().from(dbSchema.rideOffers).where(eq(dbSchema.rideOffers.rideId, rideId));
    expect(offers.every((o) => o.status === "superseded")).toBe(true);
    expect(
      notificationsOf("ride:offer_revoked").some(
        (n) => n.userId === nearby.user.id && (n.payload as { reason: string }).reason === "cancelled",
      ),
    ).toBe(true);
  });

  it("rejects a second active ride and out-of-Nepal pickups", async () => {
    const rider = await makeUser("rider5@test.np");
    const first = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ACTIVE_RIDE_EXISTS");

    const abroad = await request(app)
      .post("/api/rides")
      .set("Cookie", rider.cookies)
      .send({
        ...rideRequestBody(),
        pickup: { address: "London", coordinates: [-0.1276, 51.5072] },
      });
    expect(abroad.status).toBe(400);
    expect(abroad.body.error.code).toBe("OUT_OF_SERVICE_AREA");

    // cleanup so this searching ride doesn't absorb later tests' offers
    await request(app)
      .post(`/api/rides/${first.body.data.ride.id}/cancel`)
      .set("Cookie", rider.cookies)
      .send({});
  });

  it("location updates relay to the rider only during an active ride", async () => {
    await allDriversOffline();
    const rider = await makeUser("rider6@test.np");
    const driver = await makeDriver("tracker@test.np", THAMEL);

    const { updateDriverLocation } = await import("./modules/matching/dispatcher.js");

    // No active ride → no relay target
    let active = await updateDriverLocation(db, driver.user.id, { lat: 27.71, lng: 85.31 });
    expect(active).toBeNull();

    const create = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    const rideId = create.body.data.ride.id;
    await dispatcher.tick();
    await request(app).post(`/api/rides/${rideId}/accept`).set("Cookie", driver.cookies);

    active = await updateDriverLocation(db, driver.user.id, { lat: 27.712, lng: 85.312 });
    expect(active?.rideId).toBe(rideId);
    expect(active?.riderUserId).toBe(rider.user.id);
  });
});
