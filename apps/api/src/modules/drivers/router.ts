import { Router } from "express";
import multer from "multer";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { driverOnlineSchema, driverRegisterSchema } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { drivers, ledgerEntries } from "../../db/schema/index.js";
import type { StorageProvider } from "../../lib/storage.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../middleware/errorHandler.js";
import {
  addDriverDocument,
  getDocumentForDownload,
  getDriverByUserId,
  getDriverProfile,
  registerDriver,
} from "./service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const documentTypeSchema = z.object({
  type: z.enum(["license", "registration", "insurance", "profile_photo"]),
});

export function driversRouter(db: Db, storage: StorageProvider): Router {
  const router = Router();

  // Public: one-shot driver signup (account + application). Approval comes later via admin KYC.
  router.post("/register", validate(driverRegisterSchema), async (req, res) => {
    const result = await registerDriver(db, req.body);
    res.status(201).json({
      success: true,
      data: { ...result, message: "Application received. Verify your email; approval follows document review." },
    });
  });

  router.get("/me", requireAuth(db), requireRole("driver"), async (req, res) => {
    const profile = await getDriverProfile(db, req.user!.id);
    res.json({ success: true, data: { driver: profile } });
  });

  // Availability toggle — approved drivers only
  router.post(
    "/me/online",
    requireAuth(db),
    requireRole("driver"),
    validate(driverOnlineSchema),
    async (req, res) => {
      const driver = await getDriverByUserId(db, req.user!.id);
      if (driver.status !== "approved") {
        throw new AppError(403, "NOT_APPROVED", "Your application has not been approved yet");
      }
      const [updated] = await db
        .update(drivers)
        .set({ isOnline: req.body.online })
        .where(eq(drivers.id, driver.id))
        .returning({ isOnline: drivers.isOnline });
      res.json({ success: true, data: { isOnline: updated?.isOnline ?? false } });
    },
  );

  // Today's earnings (driver_payout ledger entries since local midnight)
  router.get("/me/earnings", requireAuth(db), requireRole("driver"), async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [row] = await db
      .select({
        total: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)::float`,
        ridesCount: sql<number>`count(*)::int`,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.userId, req.user!.id),
          eq(ledgerEntries.type, "driver_payout"),
          gte(ledgerEntries.createdAt, startOfDay),
        ),
      );
    res.json({
      success: true,
      data: { today: { total: row?.total ?? 0, rides: row?.ridesCount ?? 0, currency: "NPR" } },
    });
  });

  router.post(
    "/me/documents",
    requireAuth(db),
    requireRole("driver"),
    upload.single("file"),
    async (req, res) => {
      if (!req.file) throw new AppError(400, "FILE_REQUIRED", "Attach a file in the 'file' field");
      const parsed = documentTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION", "type must be license, registration, insurance or profile_photo");
      }
      const doc = await addDriverDocument(db, storage, req.user!.id, parsed.data.type, req.file);
      res.status(201).json({ success: true, data: { document: doc } });
    },
  );

  router.get(
    "/me/documents/:id/download",
    requireAuth(db),
    requireRole("driver"),
    async (req, res) => {
      const doc = await getDocumentForDownload(db, String(req.params.id));
      const driver = await getDriverByUserId(db, req.user!.id);
      if (doc.driverId !== driver.id) throw new AppError(403, "FORBIDDEN", "Not your document");
      const data = await storage.read(doc.storagePath);
      res.setHeader("Content-Type", doc.mimeType ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${doc.originalName ?? "document"}"`);
      res.send(data);
    },
  );

  return router;
}
