import { Router } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  DRIVER_STATUSES,
  RIDE_STATUSES,
  RIDE_TYPES,
  USER_ROLES,
  fareConfigUpdateSchema,
} from "@ridex/shared";
import type { Db } from "../../db/index.js";
import type { StorageProvider } from "../../lib/storage.js";
import { driverDocuments, drivers, users, vehicles } from "../../db/schema/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../middleware/errorHandler.js";
import { toPublicUser } from "../auth/service.js";
import { getDocumentForDownload } from "../drivers/service.js";
import { adminForceCancel } from "../rides/service.js";
import type { RideNotifier } from "../rides/notify.js";
import { listFareConfigs, updateFareConfig } from "../pricing/service.js";
import {
  getDriverBalance,
  getOpsOverview,
  getRideForAdmin,
  listAuditLogs,
  listRides,
  setDriverStatus,
  setUserActive,
} from "./service.js";

const listDriversQuery = z.object({
  status: z.enum(DRIVER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listUsersQuery = z.object({
  role: z.enum(USER_ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listRidesQuery = z.object({
  status: z.enum(RIDE_STATUSES).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const listAuditQuery = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const rejectSchema = z.object({ reason: z.string().trim().min(1).max(500) });
const reasonSchema = z.object({ reason: z.string().trim().min(1).max(500) });
const optionalReasonSchema = z.object({ reason: z.string().trim().min(1).max(500).optional() });

export function adminRouter(db: Db, storage: StorageProvider, notifier: RideNotifier): Router {
  const router = Router();

  router.use(requireAuth(db), requireRole("admin"));

  const auditCtx = (req: import("express").Request) => ({
    actorUserId: req.user!.id,
    ip: req.ip ?? null,
  });

  router.get("/drivers", async (req, res) => {
    const q = listDriversQuery.parse(req.query);
    const where = q.status ? eq(drivers.status, q.status) : undefined;

    const rows = await db
      .select({
        id: drivers.id,
        licenseNumber: drivers.licenseNumber,
        status: drivers.status,
        rejectionReason: drivers.rejectionReason,
        isOnline: drivers.isOnline,
        ratingAvg: drivers.ratingAvg,
        ratingCount: drivers.ratingCount,
        createdAt: drivers.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          emailVerifiedAt: users.emailVerifiedAt,
        },
      })
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(where)
      .orderBy(desc(drivers.createdAt))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit);

    const [total] = await db.select({ value: count() }).from(drivers).where(where);

    res.json({
      success: true,
      data: { drivers: rows, page: q.page, limit: q.limit, total: total?.value ?? 0 },
    });
  });

  router.get("/drivers/:id", async (req, res) => {
    const [driver] = await db
      .select()
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.id, String(req.params.id)))
      .limit(1);
    if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found");

    const driverVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.driverId, driver.drivers.id));
    const documents = await db
      .select()
      .from(driverDocuments)
      .where(eq(driverDocuments.driverId, driver.drivers.id));

    const balance = await getDriverBalance(db, driver.users.id);

    res.json({
      success: true,
      data: {
        driver: {
          ...driver.drivers,
          user: toPublicUser(driver.users),
          vehicles: driverVehicles,
          documents: documents.map(({ storagePath: _sp, ...doc }) => doc),
          balance,
        },
      },
    });
  });

  router.post("/drivers/:id/suspend", validate(optionalReasonSchema), async (req, res) => {
    const driver = await setDriverStatus(db, auditCtx(req), String(req.params.id), true, req.body.reason);
    res.json({ success: true, data: { driver } });
  });

  router.post("/drivers/:id/reactivate", validate(optionalReasonSchema), async (req, res) => {
    const driver = await setDriverStatus(db, auditCtx(req), String(req.params.id), false, req.body.reason);
    res.json({ success: true, data: { driver } });
  });

  router.post("/drivers/:id/approve", async (req, res) => {
    const [updated] = await db
      .update(drivers)
      .set({
        status: "approved",
        rejectionReason: null,
        approvedAt: new Date(),
        approvedBy: req.user!.id,
      })
      .where(and(eq(drivers.id, String(req.params.id)), eq(drivers.status, "pending")))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "No pending driver with this id");
    res.json({ success: true, data: { driver: updated } });
  });

  router.post("/drivers/:id/reject", validate(rejectSchema), async (req, res) => {
    const [updated] = await db
      .update(drivers)
      .set({ status: "rejected", rejectionReason: req.body.reason })
      .where(and(eq(drivers.id, String(req.params.id)), eq(drivers.status, "pending")))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "No pending driver with this id");
    res.json({ success: true, data: { driver: updated } });
  });

  router.get("/drivers/:id/documents/:docId/download", async (req, res) => {
    const doc = await getDocumentForDownload(db, req.params.docId);
    if (doc.driverId !== req.params.id) throw new AppError(404, "NOT_FOUND", "Document not found");
    const data = await storage.read(doc.storagePath);
    res.setHeader("Content-Type", doc.mimeType ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName ?? "document"}"`);
    res.send(data);
  });

  router.get("/users", async (req, res) => {
    const q = listUsersQuery.parse(req.query);
    const where = q.role ? eq(users.role, q.role) : undefined;

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(q.limit)
      .offset((q.page - 1) * q.limit);
    const [total] = await db.select({ value: count() }).from(users).where(where);

    res.json({
      success: true,
      data: { users: rows.map(toPublicUser), page: q.page, limit: q.limit, total: total?.value ?? 0 },
    });
  });

  router.post("/users/:id/suspend", validate(optionalReasonSchema), async (req, res) => {
    const user = await setUserActive(db, auditCtx(req), String(req.params.id), false, req.body.reason);
    res.json({ success: true, data: { user } });
  });

  router.post("/users/:id/reactivate", validate(optionalReasonSchema), async (req, res) => {
    const user = await setUserActive(db, auditCtx(req), String(req.params.id), true, req.body.reason);
    res.json({ success: true, data: { user } });
  });

  // ── Rides ────────────────────────────────────────────────────────────────
  router.get("/rides", async (req, res) => {
    const q = listRidesQuery.parse(req.query);
    const data = await listRides(db, q);
    res.json({ success: true, data });
  });

  router.get("/rides/:id", async (req, res) => {
    const data = await getRideForAdmin(db, String(req.params.id));
    res.json({ success: true, data });
  });

  router.post("/rides/:id/force-cancel", validate(reasonSchema), async (req, res) => {
    const ride = await adminForceCancel(db, notifier, auditCtx(req), String(req.params.id), req.body.reason);
    res.json({ success: true, data: { ride } });
  });

  // ── Pricing console ────────────────────────────────────────────────────────
  router.get("/pricing", async (_req, res) => {
    const configs = await listFareConfigs(db);
    res.json({ success: true, data: { configs } });
  });

  router.patch("/pricing/:rideType", validate(fareConfigUpdateSchema), async (req, res) => {
    const rideType = z.enum(RIDE_TYPES).parse(req.params.rideType);
    const config = await updateFareConfig(db, auditCtx(req), rideType, req.body);
    res.json({ success: true, data: { config } });
  });

  // ── Audit log ──────────────────────────────────────────────────────────────
  router.get("/audit", async (req, res) => {
    const q = listAuditQuery.parse(req.query);
    const data = await listAuditLogs(db, q);
    res.json({ success: true, data });
  });

  // ── Live ops snapshot ────────────────────────────────────────────────────
  router.get("/overview", async (_req, res) => {
    const data = await getOpsOverview(db);
    res.json({ success: true, data });
  });

  return router;
}
