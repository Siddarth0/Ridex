import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { RideStatus } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import {
  auditLogs,
  driverLocations,
  drivers,
  ledgerEntries,
  rideEvents,
  rideOffers,
  rides,
  users,
  vehicles,
} from "../../db/schema/index.js";
import { AppError } from "../../middleware/errorHandler.js";
import { writeAudit, type AuditContext } from "../../lib/audit.js";
import { toPublicUser } from "../auth/service.js";

const ACTIVE_STATUSES = ["searching", "accepted", "arrived", "in_progress"] as const;

/** Paginated rides list with rider/driver names, optional status + text search. */
export async function listRides(
  db: Db,
  filters: { status?: RideStatus; q?: string; page: number; limit: number },
) {
  const conds = [];
  if (filters.status) conds.push(eq(rides.status, filters.status));
  if (filters.q) {
    const like = `%${filters.q}%`;
    conds.push(
      or(
        ilike(rides.pickupAddress, like),
        ilike(rides.destinationAddress, like),
        sql`${rides.id}::text ilike ${like}`,
      ),
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: rides.id,
      status: rides.status,
      rideType: rides.rideType,
      pickupAddress: rides.pickupAddress,
      destinationAddress: rides.destinationAddress,
      estimatedFare: rides.estimatedFare,
      finalFare: rides.finalFare,
      currency: rides.currency,
      requestedAt: rides.requestedAt,
      completedAt: rides.completedAt,
      cancelledAt: rides.cancelledAt,
      cancelledBy: rides.cancelledBy,
      riderId: rides.riderId,
      riderFirstName: users.firstName,
      riderLastName: users.lastName,
      riderPhone: users.phone,
      driverId: rides.driverId,
    })
    .from(rides)
    .innerJoin(users, eq(rides.riderId, users.id))
    .where(where)
    .orderBy(desc(rides.requestedAt))
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);

  // Resolve driver names in a second pass (rides.driverId → drivers → users).
  const driverIds = [...new Set(rows.map((r) => r.driverId).filter((x): x is string => !!x))];
  const driverMap = new Map<string, { firstName: string; lastName: string; phone: string }>();
  if (driverIds.length) {
    const dRows = await db
      .select({
        id: drivers.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
      })
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(inArray(drivers.id, driverIds));
    for (const d of dRows) driverMap.set(d.id, d);
  }

  const [total] = await db.select({ value: count() }).from(rides).where(where);

  return {
    rides: rows.map((r) => {
      const d = r.driverId ? driverMap.get(r.driverId) : null;
      return {
        id: r.id,
        status: r.status,
        rideType: r.rideType,
        pickupAddress: r.pickupAddress,
        destinationAddress: r.destinationAddress,
        estimatedFare: r.estimatedFare,
        finalFare: r.finalFare,
        currency: r.currency,
        requestedAt: r.requestedAt,
        completedAt: r.completedAt,
        cancelledAt: r.cancelledAt,
        cancelledBy: r.cancelledBy,
        rider: {
          id: r.riderId,
          name: `${r.riderFirstName} ${r.riderLastName}`.trim(),
          phone: r.riderPhone,
        },
        driver: d ? { id: r.driverId, name: `${d.firstName} ${d.lastName}`.trim(), phone: d.phone } : null,
      };
    }),
    page: filters.page,
    limit: filters.limit,
    total: total?.value ?? 0,
  };
}

/** Full ride detail for an admin: participants, vehicle, event trail, offers, ledger. */
export async function getRideForAdmin(db: Db, rideId: string) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw new AppError(404, "NOT_FOUND", "Ride not found");

  const [rider] = await db.select().from(users).where(eq(users.id, ride.riderId)).limit(1);

  let driver = null;
  let vehicle = null;
  if (ride.driverId) {
    const [d] = await db
      .select({
        id: drivers.id,
        userId: drivers.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        ratingAvg: drivers.ratingAvg,
        ratingCount: drivers.ratingCount,
      })
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.id, ride.driverId))
      .limit(1);
    driver = d ?? null;
  }
  if (ride.vehicleId) {
    const [v] = await db.select().from(vehicles).where(eq(vehicles.id, ride.vehicleId)).limit(1);
    vehicle = v ?? null;
  }

  const events = await db
    .select()
    .from(rideEvents)
    .where(eq(rideEvents.rideId, rideId))
    .orderBy(rideEvents.createdAt);
  const offers = await db
    .select()
    .from(rideOffers)
    .where(eq(rideOffers.rideId, rideId))
    .orderBy(rideOffers.offeredAt);
  const ledger = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.rideId, rideId))
    .orderBy(ledgerEntries.createdAt);

  return {
    ride,
    rider: rider ? toPublicUser(rider) : null,
    driver,
    vehicle,
    events,
    offers,
    ledger,
  };
}

/**
 * A driver's cash balance from the ledger. Drivers keep the cash fare and owe
 * commission, so: balance = Σ driver_payout − Σ commission. Negative = owes the
 * platform. Also returns lifetime gross for the ops screen.
 */
export async function getDriverBalance(db: Db, driverUserId: string) {
  const rows = await db
    .select({ type: ledgerEntries.type, sum: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, driverUserId))
    .groupBy(ledgerEntries.type);

  let payout = 0;
  let commission = 0;
  let adjustment = 0;
  for (const r of rows) {
    if (r.type === "driver_payout") payout = Number(r.sum);
    else if (r.type === "commission") commission = Number(r.sum);
    else if (r.type === "adjustment") adjustment = Number(r.sum);
  }
  return {
    payout: Math.round(payout * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    adjustment: Math.round(adjustment * 100) / 100,
    balance: Math.round((payout - commission + adjustment) * 100) / 100,
  };
}

export async function setUserActive(
  db: Db,
  ctx: AuditContext,
  userId: string,
  active: boolean,
  reason: string | undefined,
) {
  if (userId === ctx.actorUserId) {
    throw new AppError(400, "SELF_ACTION", "You cannot change your own account status");
  }
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found");
    if (target.role === "admin") {
      throw new AppError(403, "FORBIDDEN", "Admin accounts cannot be suspended here");
    }
    if (target.isActive === active) {
      throw new AppError(409, "NO_CHANGE", `User is already ${active ? "active" : "suspended"}`);
    }

    const [updated] = await tx
      .update(users)
      .set({ isActive: active })
      .where(eq(users.id, userId))
      .returning();

    await writeAudit(tx, ctx, {
      action: active ? "user.reactivate" : "user.suspend",
      entityType: "user",
      entityId: userId,
      diff: { isActive: { from: target.isActive, to: active }, reason },
    });
    return toPublicUser(updated!);
  });
}

export async function setDriverStatus(
  db: Db,
  ctx: AuditContext,
  driverId: string,
  suspend: boolean,
  reason: string | undefined,
) {
  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "Driver not found");

    const from = target.status;
    if (suspend && from !== "approved") {
      throw new AppError(409, "INVALID_STATE", "Only approved drivers can be suspended");
    }
    if (!suspend && from !== "suspended") {
      throw new AppError(409, "INVALID_STATE", "Only suspended drivers can be reactivated");
    }
    const to = suspend ? "suspended" : "approved";

    const [updated] = await tx
      .update(drivers)
      .set({ status: to, isOnline: suspend ? false : target.isOnline })
      .where(eq(drivers.id, driverId))
      .returning();

    await writeAudit(tx, ctx, {
      action: suspend ? "driver.suspend" : "driver.reactivate",
      entityType: "driver",
      entityId: driverId,
      diff: { status: { from, to }, reason },
    });
    return updated!;
  });
}

export async function listAuditLogs(
  db: Db,
  filters: { action?: string; page: number; limit: number },
) {
  const where = filters.action ? eq(auditLogs.action, filters.action) : undefined;
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      diff: auditLogs.diff,
      ip: auditLogs.ip,
      createdAt: auditLogs.createdAt,
      actorId: users.id,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);
  const [total] = await db.select({ value: count() }).from(auditLogs).where(where);

  return {
    logs: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      diff: r.diff,
      ip: r.ip,
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        name: `${r.actorFirstName} ${r.actorLastName}`.trim(),
        email: r.actorEmail,
      },
    })),
    page: filters.page,
    limit: filters.limit,
    total: total?.value ?? 0,
  };
}

/** Snapshot for the live ops map: online drivers with location + active rides. */
export async function getOpsOverview(db: Db) {
  const onlineDrivers = await db
    .select({
      driverId: drivers.id,
      userId: drivers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      ratingAvg: drivers.ratingAvg,
      lat: driverLocations.lat,
      lng: driverLocations.lng,
      heading: driverLocations.heading,
      updatedAt: driverLocations.updatedAt,
    })
    .from(drivers)
    .innerJoin(users, eq(drivers.userId, users.id))
    .innerJoin(driverLocations, eq(driverLocations.driverId, drivers.id))
    .where(and(eq(drivers.isOnline, true), eq(drivers.status, "approved")));

  const activeRides = await db
    .select({
      id: rides.id,
      status: rides.status,
      rideType: rides.rideType,
      pickupLat: rides.pickupLat,
      pickupLng: rides.pickupLng,
      destinationLat: rides.destinationLat,
      destinationLng: rides.destinationLng,
      driverId: rides.driverId,
      requestedAt: rides.requestedAt,
    })
    .from(rides)
    .where(inArray(rides.status, [...ACTIVE_STATUSES]))
    .orderBy(desc(rides.requestedAt));

  return {
    drivers: onlineDrivers,
    rides: activeRides,
    counts: { onlineDrivers: onlineDrivers.length, activeRides: activeRides.length },
  };
}
