import { eq } from "drizzle-orm";
import type { DriverRegisterInput, PublicUser } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { driverDocuments, drivers, users, vehicles } from "../../db/schema/index.js";
import { AppError } from "../../middleware/errorHandler.js";
import { createUser, issueEmailVerification, toPublicUser } from "../auth/service.js";
import type { StorageProvider } from "../../lib/storage.js";

type DriverRow = typeof drivers.$inferSelect;
type DocumentType = (typeof driverDocuments.$inferSelect)["type"];

export async function registerDriver(
  db: Db,
  input: DriverRegisterInput,
): Promise<{ user: PublicUser; driverId: string }> {
  const [byLicense] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.licenseNumber, input.licenseNumber))
    .limit(1);
  if (byLicense) throw new AppError(409, "LICENSE_TAKEN", "This license number is already registered");

  const [byPlate] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.plateNumber, input.vehicle.plateNumber))
    .limit(1);
  if (byPlate) throw new AppError(409, "PLATE_TAKEN", "This plate number is already registered");

  const { user, driver } = await db.transaction(async (tx) => {
    const user = await createUser(tx, input, "driver");
    const [driver] = await tx
      .insert(drivers)
      .values({ userId: user.id, licenseNumber: input.licenseNumber })
      .returning();
    if (!driver) throw new AppError(500, "INTERNAL", "Failed to create driver profile");
    await tx.insert(vehicles).values({
      driverId: driver.id,
      rideType: input.vehicle.rideType,
      make: input.vehicle.make,
      model: input.vehicle.model,
      year: input.vehicle.year,
      plateNumber: input.vehicle.plateNumber,
      color: input.vehicle.color,
    });
    return { user, driver };
  });

  await issueEmailVerification(db, user);
  return { user: toPublicUser(user), driverId: driver.id };
}

export async function getDriverByUserId(db: Db, userId: string): Promise<DriverRow> {
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  if (!driver) throw new AppError(404, "NOT_A_DRIVER", "No driver profile for this account");
  return driver;
}

export async function getDriverProfile(db: Db, userId: string) {
  const driver = await getDriverByUserId(db, userId);
  const driverVehicles = await db.select().from(vehicles).where(eq(vehicles.driverId, driver.id));
  const documents = await db
    .select({
      id: driverDocuments.id,
      type: driverDocuments.type,
      status: driverDocuments.status,
      originalName: driverDocuments.originalName,
      createdAt: driverDocuments.createdAt,
    })
    .from(driverDocuments)
    .where(eq(driverDocuments.driverId, driver.id));

  return {
    id: driver.id,
    licenseNumber: driver.licenseNumber,
    status: driver.status,
    rejectionReason: driver.rejectionReason,
    isOnline: driver.isOnline,
    ratingAvg: driver.ratingAvg,
    ratingCount: driver.ratingCount,
    vehicles: driverVehicles,
    documents,
  };
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function addDriverDocument(
  db: Db,
  storage: StorageProvider,
  userId: string,
  type: DocumentType,
  file: { originalname: string; mimetype: string; buffer: Buffer },
) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError(400, "UNSUPPORTED_FILE", "Only JPEG, PNG, WebP images or PDF files are allowed");
  }

  const driver = await getDriverByUserId(db, userId);
  const stored = await storage.save(driver.id, file.originalname, file.mimetype, file.buffer);

  const [doc] = await db
    .insert(driverDocuments)
    .values({
      driverId: driver.id,
      type,
      storagePath: stored.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
    })
    .returning();
  if (!doc) throw new AppError(500, "INTERNAL", "Failed to save document");

  return { id: doc.id, type: doc.type, status: doc.status, createdAt: doc.createdAt };
}

export async function getDocumentForDownload(db: Db, documentId: string) {
  const [doc] = await db
    .select()
    .from(driverDocuments)
    .where(eq(driverDocuments.id, documentId))
    .limit(1);
  if (!doc) throw new AppError(404, "NOT_FOUND", "Document not found");
  return doc;
}

/** Used by the users module too — the public "am I a driver" summary. */
export async function driverSummaryOrNull(db: Db, userId: string) {
  const [driver] = await db
    .select({ id: drivers.id, status: drivers.status })
    .from(drivers)
    .where(eq(drivers.userId, userId))
    .limit(1);
  return driver ?? null;
}
