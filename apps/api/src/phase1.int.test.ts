import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { fileURLToPath } from "node:url";

// Capture outbound emails (and their one-time tokens) instead of sending
const sentEmails: { kind: "verify" | "reset"; to: string; token: string }[] = [];
vi.mock("./lib/email.js", () => ({
  sendVerificationEmail: vi.fn(async (to: string, _name: string, token: string) => {
    sentEmails.push({ kind: "verify", to, token });
  }),
  sendPasswordResetEmail: vi.fn(async (to: string, _name: string, token: string) => {
    sentEmails.push({ kind: "reset", to, token });
  }),
}));

import { createApp } from "./app.js";
import type { Db } from "./db/index.js";
import * as dbSchema from "./db/schema/index.js";
import type { StorageProvider } from "./lib/storage.js";
import { hashPassword } from "./lib/password.js";

let app: ReturnType<typeof createApp>;
let db: Db;

const files = new Map<string, Buffer>();
const memoryStorage: StorageProvider = {
  async save(folder, originalName, _mime, data) {
    const path = `${folder}/${originalName}`;
    files.set(path, data);
    return { path };
  },
  async read(path) {
    const data = files.get(path);
    if (!data) throw new Error("not found");
    return data;
  },
};

function cookiesOf(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

function cookieHeader(res: request.Response): string {
  return cookiesOf(res)
    .map((c) => c.split(";")[0])
    .join("; ");
}

function lastToken(kind: "verify" | "reset", to: string): string {
  const hit = [...sentEmails].reverse().find((e) => e.kind === kind && e.to === to);
  if (!hit) throw new Error(`no ${kind} email sent to ${to}`);
  return hit.token;
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
  app = createApp({ db, storage: memoryStorage });
});

describe("platform", () => {
  it("responds on /health and returns the error envelope on unknown routes", async () => {
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe("ok");

    const missing = await request(app).get("/nope");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});

describe("rider auth lifecycle", () => {
  const rider = {
    firstName: "Sita",
    lastName: "Sharma",
    email: "sita@example.com",
    phone: "+9779812345678",
    password: "sup3r-secret",
  };

  it("registers a rider and rejects duplicates", async () => {
    const res = await request(app).post("/api/auth/register").send(rider);
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("rider");
    expect(res.body.data.user.emailVerified).toBe(false);

    const dup = await request(app).post("/api/auth/register").send(rider);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects invalid payloads with field details", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("blocks login until the email is verified, then logs in with cookies", async () => {
    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: rider.password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    const token = lastToken("verify", rider.email);
    const verify = await request(app).get(`/api/auth/verify-email/${token}`);
    expect(verify.status).toBe(200);

    // Token is single-use
    const again = await request(app).get(`/api/auth/verify-email/${token}`);
    expect(again.status).toBe(400);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: rider.password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.emailVerified).toBe(true);
    expect(cookiesOf(login).some((c) => c.startsWith("access_token="))).toBe(true);
    expect(cookiesOf(login).some((c) => c.startsWith("refresh_token="))).toBe(true);

    const me = await request(app).get("/api/auth/me").set("Cookie", cookieHeader(login));
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(rider.email);
  });

  it("rejects bad credentials and missing tokens", async () => {
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: "wrong-password" });
    expect(bad.status).toBe(401);

    const anon = await request(app).get("/api/auth/me");
    expect(anon.status).toBe(401);
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: rider.password });
    const firstCookies = cookieHeader(login);

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", firstCookies);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    // Replaying the already-rotated token must fail and kill the session family
    const replay = await request(app).post("/api/auth/refresh").set("Cookie", firstCookies);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("TOKEN_REUSED");

    const rotatedCookies = cookieHeader(refreshed);
    const afterKill = await request(app).post("/api/auth/refresh").set("Cookie", rotatedCookies);
    expect(afterKill.status).toBe(401);
  });

  it("resets a forgotten password and revokes existing sessions", async () => {
    await request(app).post("/api/auth/forgot-password").send({ email: rider.email });
    const token = lastToken("reset", rider.email);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass1" });
    expect(reset.status).toBe(200);

    const oldPw = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: rider.password });
    expect(oldPw.status).toBe(401);

    const newPw = await request(app)
      .post("/api/auth/login")
      .send({ email: rider.email, password: "brand-new-pass1" });
    expect(newPw.status).toBe(200);
  });
});

describe("driver onboarding + admin KYC", () => {
  const driver = {
    firstName: "Ram",
    lastName: "Thapa",
    email: "ram@example.com",
    phone: "+9779800000001",
    password: "driver-pass-123",
    licenseNumber: "NP-01-123456",
    vehicle: {
      rideType: "bike" as const,
      make: "Honda",
      model: "Shine",
      year: 2022,
      plateNumber: "BA-2-PA-1234",
      color: "Red",
    },
  };

  let driverCookies = "";
  let adminCookies = "";
  let driverId = "";

  it("registers a driver application in one shot", async () => {
    const res = await request(app).post("/api/drivers/register").send(driver);
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("driver");
    driverId = res.body.data.driverId;

    const dupPlate = await request(app)
      .post("/api/drivers/register")
      .send({ ...driver, email: "other@example.com", phone: "+9779800000002", licenseNumber: "NP-999" });
    expect(dupPlate.status).toBe(409);
    expect(dupPlate.body.error.code).toBe("PLATE_TAKEN");
  });

  it("lets the driver verify, log in, and upload documents", async () => {
    const token = lastToken("verify", driver.email);
    await request(app).get(`/api/auth/verify-email/${token}`);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: driver.email, password: driver.password });
    expect(login.status).toBe(200);
    driverCookies = cookieHeader(login);

    const profile = await request(app).get("/api/drivers/me").set("Cookie", driverCookies);
    expect(profile.status).toBe(200);
    expect(profile.body.data.driver.status).toBe("pending");
    expect(profile.body.data.driver.vehicles).toHaveLength(1);

    const upload = await request(app)
      .post("/api/drivers/me/documents")
      .set("Cookie", driverCookies)
      .field("type", "license")
      .attach("file", Buffer.from("fake-image-bytes"), {
        filename: "license.png",
        contentType: "image/png",
      });
    expect(upload.status).toBe(201);
    expect(upload.body.data.document.status).toBe("pending");

    const badMime = await request(app)
      .post("/api/drivers/me/documents")
      .set("Cookie", driverCookies)
      .field("type", "license")
      .attach("file", Buffer.from("#!/bin/sh"), {
        filename: "evil.sh",
        contentType: "application/x-sh",
      });
    expect(badMime.status).toBe(400);
  });

  it("blocks riders and anonymous users from admin routes", async () => {
    const anon = await request(app).get("/api/admin/drivers");
    expect(anon.status).toBe(401);

    const asDriver = await request(app).get("/api/admin/drivers").set("Cookie", driverCookies);
    expect(asDriver.status).toBe(403);
  });

  it("lets an admin review and approve the driver", async () => {
    await db.insert(dbSchema.users).values({
      email: "admin@ridex.example",
      phone: "+9779800000099",
      passwordHash: await hashPassword("admin-pass-123"),
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      emailVerifiedAt: new Date(),
    });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ridex.example", password: "admin-pass-123" });
    expect(login.status).toBe(200);
    adminCookies = cookieHeader(login);

    const pending = await request(app)
      .get("/api/admin/drivers?status=pending")
      .set("Cookie", adminCookies);
    expect(pending.status).toBe(200);
    expect(pending.body.data.total).toBe(1);
    expect(pending.body.data.drivers[0].user.email).toBe(driver.email);

    const detail = await request(app)
      .get(`/api/admin/drivers/${driverId}`)
      .set("Cookie", adminCookies);
    expect(detail.status).toBe(200);
    expect(detail.body.data.driver.documents).toHaveLength(1);

    const approve = await request(app)
      .post(`/api/admin/drivers/${driverId}/approve`)
      .set("Cookie", adminCookies);
    expect(approve.status).toBe(200);
    expect(approve.body.data.driver.status).toBe("approved");

    // Approving twice is a no-op 404 (no longer pending)
    const twice = await request(app)
      .post(`/api/admin/drivers/${driverId}/approve`)
      .set("Cookie", adminCookies);
    expect(twice.status).toBe(404);

    const profile = await request(app).get("/api/drivers/me").set("Cookie", driverCookies);
    expect(profile.body.data.driver.status).toBe("approved");
  });
});
