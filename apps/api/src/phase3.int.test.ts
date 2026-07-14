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

let app: ReturnType<typeof createApp>;
let db: Db;

const THAMEL = { lat: 27.7154, lng: 85.3123 };
const PATAN = { lat: 27.6644, lng: 85.3188 };
const NEAR_THAMEL = { lat: 27.7215, lng: 85.3135 };

function cookieHeader(res: request.Response): string {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

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
  const login = await request(app).post("/api/auth/login").send({ email, password: "password-123" });
  return { user: user!, cookies: cookieHeader(login) };
}

let driverSeq = 0;
async function makeDriver(email: string, pos = NEAR_THAMEL) {
  const seq = ++driverSeq;
  const { user } = await makeUser(email);
  await db.update(dbSchema.users).set({ role: "driver" }).where(eq(dbSchema.users.id, user.id));
  const [driver] = await db
    .insert(dbSchema.drivers)
    .values({ userId: user.id, licenseNumber: `LIC3-${seq}`, status: "approved", isOnline: true })
    .returning();
  await db.insert(dbSchema.vehicles).values({
    driverId: driver!.id,
    rideType: "bike",
    make: "Honda",
    model: "Shine",
    plateNumber: `BA-3-${seq}`,
  });
  await db
    .insert(dbSchema.driverLocations)
    .values({ driverId: driver!.id, lat: pos.lat, lng: pos.lng, updatedAt: new Date() });
  const login = await request(app).post("/api/auth/login").send({ email, password: "password-123" });
  return { user: user!, driver: driver!, cookies: cookieHeader(login) };
}

function rideRequestBody() {
  return {
    pickup: { address: "Thamel", coordinates: [THAMEL.lng, THAMEL.lat] },
    destination: { address: "Patan", coordinates: [PATAN.lng, PATAN.lat] },
    rideType: "bike",
    paymentMethod: "cash",
  };
}

/** Directly seat an accepted ride assigned to a driver, acceptedAt secondsAgo in the past. */
async function seatAcceptedRide(riderId: string, driverId: string, acceptedSecondsAgo: number) {
  const [ride] = await db
    .insert(dbSchema.rides)
    .values({
      riderId,
      driverId,
      rideType: "bike",
      status: "accepted",
      pickupAddress: "Thamel",
      pickupLat: THAMEL.lat,
      pickupLng: THAMEL.lng,
      destinationAddress: "Patan",
      destinationLat: PATAN.lat,
      destinationLng: PATAN.lng,
      distanceM: 5000,
      durationS: 900,
      estimatedFare: 160,
      acceptedAt: new Date(Date.now() - acceptedSecondsAgo * 1000),
    })
    .returning();
  return ride!;
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
});

describe("admin authorization", () => {
  it("rejects non-admins from admin routes", async () => {
    const { cookies } = await makeUser("notadmin@test.np");
    const res = await request(app).get("/api/admin/rides").set("Cookie", cookies);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("admin rides + force-cancel", () => {
  it("lists rides and force-cancels an active one, audited + notified", async () => {
    const rider = await makeUser("fcrider@test.np");
    const admin = await makeUser("fcadmin@test.np", "admin");
    const res = await request(app).post("/api/rides").set("Cookie", rider.cookies).send(rideRequestBody());
    expect(res.status).toBe(201);
    const rideId = res.body.data.ride.id as string;

    const list = await request(app).get("/api/admin/rides?status=searching").set("Cookie", admin.cookies);
    expect(list.status).toBe(200);
    expect(list.body.data.rides.some((r: { id: string }) => r.id === rideId)).toBe(true);

    sent.length = 0;
    const fc = await request(app)
      .post(`/api/admin/rides/${rideId}/force-cancel`)
      .set("Cookie", admin.cookies)
      .send({ reason: "operator override" });
    expect(fc.status).toBe(200);
    expect(fc.body.data.ride.status).toBe("cancelled");
    expect(fc.body.data.ride.cancelledBy).toBe("system");
    expect(sent.some((n) => n.kind === "ride:update")).toBe(true);

    const [audit] = await db
      .select()
      .from(dbSchema.auditLogs)
      .where(eq(dbSchema.auditLogs.action, "ride.force_cancel"));
    expect(audit?.entityId).toBe(rideId);

    // Can't force-cancel a terminal ride
    const again = await request(app)
      .post(`/api/admin/rides/${rideId}/force-cancel`)
      .set("Cookie", admin.cookies)
      .send({ reason: "again" });
    expect(again.status).toBe(409);
  });
});

describe("cancellation fee policy", () => {
  it("free within the window, charges a ledger adjustment past it", async () => {
    await db
      .update(dbSchema.fareConfigs)
      .set({ cancelFee: 50, cancelFreeWindowS: 120 })
      .where(eq(dbSchema.fareConfigs.rideType, "bike"));

    const rider = await makeUser("cfrider@test.np");
    const driver = await makeDriver("cfdriver@test.np");

    // Accepted 10s ago → within free window → no fee
    const fresh = await seatAcceptedRide(rider.user.id, driver.driver.id, 10);
    const free = await request(app)
      .post(`/api/rides/${fresh.id}/cancel`)
      .set("Cookie", rider.cookies)
      .send({ reason: "changed mind" });
    expect(free.status).toBe(200);
    expect(free.body.data.ride.cancellationFee).toBe(0);

    // Accepted 5min ago → past free window → 50 NPR adjustment
    const stale = await seatAcceptedRide(rider.user.id, driver.driver.id, 300);
    const fee = await request(app)
      .post(`/api/rides/${stale.id}/cancel`)
      .set("Cookie", rider.cookies)
      .send({ reason: "too late" });
    expect(fee.status).toBe(200);
    expect(fee.body.data.ride.cancellationFee).toBe(50);

    const ledger = await db
      .select()
      .from(dbSchema.ledgerEntries)
      .where(and(eq(dbSchema.ledgerEntries.rideId, stale.id), eq(dbSchema.ledgerEntries.type, "adjustment")));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.amount).toBe(50);
    expect(ledger[0]?.note).toBe("cancellation_fee");
  });
});

describe("pricing console", () => {
  it("updates surge and the next estimate reflects it, audited", async () => {
    const admin = await makeUser("pcadmin@test.np", "admin");
    const rider = await makeUser("pcrider@test.np");

    // Baseline bike estimate: 30 + 20×5 + 2×15 = 160
    const before = await request(app)
      .post("/api/rides/estimate")
      .set("Cookie", rider.cookies)
      .send({ pickup: [THAMEL.lng, THAMEL.lat], destination: [PATAN.lng, PATAN.lat] });
    const bikeBefore = before.body.data.estimates.find((e: { rideType: string }) => e.rideType === "bike");
    expect(bikeBefore.estimatedFare).toBe(160);

    const upd = await request(app)
      .patch("/api/admin/pricing/bike")
      .set("Cookie", admin.cookies)
      .send({ surgeMultiplier: 2 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.config.surgeMultiplier).toBe(2);

    const after = await request(app)
      .post("/api/rides/estimate")
      .set("Cookie", rider.cookies)
      .send({ pickup: [THAMEL.lng, THAMEL.lat], destination: [PATAN.lng, PATAN.lat] });
    const bikeAfter = after.body.data.estimates.find((e: { rideType: string }) => e.rideType === "bike");
    expect(bikeAfter.estimatedFare).toBe(320);

    const [audit] = await db
      .select()
      .from(dbSchema.auditLogs)
      .where(eq(dbSchema.auditLogs.action, "pricing.update"));
    expect(audit).toBeTruthy();

    // reset surge so other tests are unaffected
    await request(app).patch("/api/admin/pricing/bike").set("Cookie", admin.cookies).send({ surgeMultiplier: 1 });
  });

  it("rejects surge outside bounds", async () => {
    const admin = await makeUser("pcadmin2@test.np", "admin");
    const res = await request(app)
      .patch("/api/admin/pricing/bike")
      .set("Cookie", admin.cookies)
      .send({ surgeMultiplier: 9 });
    expect(res.status).toBe(400);
  });
});

describe("user + driver moderation", () => {
  it("suspends and reactivates a user, blocking login while suspended", async () => {
    const admin = await makeUser("modadmin@test.np", "admin");
    const target = await makeUser("suspendme@test.np");

    const susp = await request(app)
      .post(`/api/admin/users/${target.user.id}/suspend`)
      .set("Cookie", admin.cookies)
      .send({ reason: "fraud" });
    expect(susp.status).toBe(200);

    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ email: "suspendme@test.np", password: "password-123" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("ACCOUNT_DISABLED");

    const react = await request(app)
      .post(`/api/admin/users/${target.user.id}/reactivate`)
      .set("Cookie", admin.cookies)
      .send({});
    expect(react.status).toBe(200);

    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: "suspendme@test.np", password: "password-123" });
    expect(ok.status).toBe(200);
  });

  it("won't let an admin suspend themselves or another admin", async () => {
    const admin = await makeUser("selfadmin@test.np", "admin");
    const other = await makeUser("otheradmin@test.np", "admin");
    const self = await request(app)
      .post(`/api/admin/users/${admin.user.id}/suspend`)
      .set("Cookie", admin.cookies)
      .send({ reason: "x" });
    expect(self.status).toBe(400);
    const onAdmin = await request(app)
      .post(`/api/admin/users/${other.user.id}/suspend`)
      .set("Cookie", admin.cookies)
      .send({ reason: "x" });
    expect(onAdmin.status).toBe(403);
  });

  it("suspends a driver and forces them offline", async () => {
    const admin = await makeUser("dmodadmin@test.np", "admin");
    const driver = await makeDriver("suspenddriver@test.np");
    const res = await request(app)
      .post(`/api/admin/drivers/${driver.driver.id}/suspend`)
      .set("Cookie", admin.cookies)
      .send({ reason: "complaints" });
    expect(res.status).toBe(200);
    expect(res.body.data.driver.status).toBe("suspended");
    expect(res.body.data.driver.isOnline).toBe(false);
  });
});

describe("driver balance", () => {
  it("nets payout minus commission from the ledger", async () => {
    const admin = await makeUser("baladmin@test.np", "admin");
    const driver = await makeDriver("baldriver@test.np");
    await db.insert(dbSchema.ledgerEntries).values([
      { userId: driver.user.id, type: "driver_payout", amount: 136, method: "cash" },
      { userId: driver.user.id, type: "commission", amount: 24, method: "cash" },
    ]);
    const res = await request(app)
      .get(`/api/admin/drivers/${driver.driver.id}`)
      .set("Cookie", admin.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.driver.balance.balance).toBe(112);
  });
});

describe("audit log viewer", () => {
  it("lists audit entries with actor info", async () => {
    const admin = await makeUser("auditadmin@test.np", "admin");
    const res = await request(app).get("/api/admin/audit").set("Cookie", admin.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
    expect(res.body.data.logs[0].actor).toHaveProperty("email");
  });
});

describe("login backoff", () => {
  it("locks an account after repeated wrong passwords", async () => {
    await makeUser("backoff@test.np");
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const r = await request(app)
        .post("/api/auth/login")
        .send({ email: "backoff@test.np", password: "wrong-password" });
      last = r.status;
    }
    expect(last).toBe(401);
    const locked = await request(app)
      .post("/api/auth/login")
      .send({ email: "backoff@test.np", password: "wrong-password" });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("TOO_MANY_ATTEMPTS");
  });
});
