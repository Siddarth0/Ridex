import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { RideRequest, RideStatus } from "@ridex/shared";
import { MIN_RIDE_DISTANCE_M, NEPAL_BBOX, RIDE_SEARCH_TTL_S } from "@ridex/shared";
import type { Db, DbConn, Tx } from "../../db/index.js";
import {
  drivers,
  fareConfigs,
  ledgerEntries,
  rideEvents,
  rideOffers,
  rides,
  users,
  vehicles,
} from "../../db/schema/index.js";
import { AppError } from "../../middleware/errorHandler.js";
import { writeAudit } from "../../lib/audit.js";
import type { GeoProvider } from "../geo/provider.js";
import { computeFare, getFareConfig, splitFare } from "../pricing/service.js";
import type { RideNotifier } from "./notify.js";
import { getRideDetail } from "./dto.js";

type RideRow = typeof rides.$inferSelect;

export const ACTIVE_RIDE_STATUSES = ["searching", "accepted", "arrived", "in_progress"] as const;

/**
 * The one and only way a ride changes status: atomic compare-and-swap plus an
 * audit event, inside the caller's transaction. Returns null when the guard
 * fails (someone else transitioned first) — callers decide how to error.
 */
export async function casTransition(
  tx: DbConn,
  opts: {
    rideId: string;
    from: readonly RideStatus[];
    to: RideStatus;
    set?: Partial<typeof rides.$inferInsert>;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
    /** Extra SQL guard, e.g. driver ownership. */
    guard?: ReturnType<typeof eq>;
  },
): Promise<RideRow | null> {
  const conditions = [eq(rides.id, opts.rideId), inArray(rides.status, [...opts.from])];
  if (opts.guard) conditions.push(opts.guard);

  const [updated] = await tx
    .update(rides)
    .set({ status: opts.to, ...opts.set })
    .where(and(...conditions))
    .returning();
  if (!updated) return null;

  await tx.insert(rideEvents).values({
    rideId: updated.id,
    actorUserId: opts.actorUserId ?? null,
    // The CAS matched one of opts.from; for a single-element from we know which.
    fromStatus: opts.from.length === 1 ? opts.from[0] : null,
    toStatus: opts.to,
    metadata: opts.metadata ?? null,
  });

  return updated;
}

function assertInNepal(lng: number, lat: number, label: string): void {
  if (
    lat < NEPAL_BBOX.minLat ||
    lat > NEPAL_BBOX.maxLat ||
    lng < NEPAL_BBOX.minLng ||
    lng > NEPAL_BBOX.maxLng
  ) {
    throw new AppError(400, "OUT_OF_SERVICE_AREA", `${label} is outside the service area`);
  }
}

export async function requestRide(
  db: Db,
  geo: GeoProvider,
  riderId: string,
  input: RideRequest,
): Promise<RideRow & { estimateDegraded: boolean }> {
  const [pickupLng, pickupLat] = input.pickup.coordinates;
  const [destLng, destLat] = input.destination.coordinates;
  assertInNepal(pickupLng, pickupLat, "Pickup");
  assertInNepal(destLng, destLat, "Destination");

  // One live ride per rider
  const [active] = await db
    .select({ id: rides.id })
    .from(rides)
    .where(and(eq(rides.riderId, riderId), inArray(rides.status, [...ACTIVE_RIDE_STATUSES])))
    .limit(1);
  if (active) throw new AppError(409, "ACTIVE_RIDE_EXISTS", "You already have a ride in progress");

  const route = await geo.route(input.pickup.coordinates, input.destination.coordinates);
  if (route.distanceM < MIN_RIDE_DISTANCE_M) {
    throw new AppError(400, "RIDE_TOO_SHORT", "Pickup and destination are basically the same place");
  }

  const cfg = await getFareConfig(db, input.rideType);
  const estimatedFare = computeFare(cfg, route.distanceM, route.durationS, cfg.surgeMultiplier);

  const ride = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(rides)
      .values({
        riderId,
        rideType: input.rideType,
        status: "searching",
        pickupAddress: input.pickup.address,
        pickupLat,
        pickupLng,
        destinationAddress: input.destination.address,
        destinationLat: destLat,
        destinationLng: destLng,
        distanceM: route.distanceM,
        durationS: route.durationS,
        routePolyline: route.polyline,
        estimatedFare,
        surgeMultiplier: cfg.surgeMultiplier,
        paymentMethod: input.paymentMethod,
        currency: cfg.currency,
        searchExpiresAt: new Date(Date.now() + RIDE_SEARCH_TTL_S * 1000),
      })
      .returning();
    if (!created) throw new AppError(500, "INTERNAL", "Failed to create ride");

    await tx.insert(rideEvents).values({
      rideId: created.id,
      actorUserId: riderId,
      fromStatus: null,
      toStatus: "searching",
      metadata: { estimatedFare, degraded: route.degraded },
    });
    return created;
  });

  return { ...ride, estimateDegraded: route.degraded };
}

export async function getRideOrThrow(db: DbConn, rideId: string): Promise<RideRow> {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw new AppError(404, "NOT_FOUND", "Ride not found");
  return ride;
}

export async function assertRideAccess(
  db: DbConn,
  ride: RideRow,
  user: { id: string; role: string },
): Promise<void> {
  if (user.role === "admin") return;
  if (ride.riderId === user.id) return;
  if (ride.driverId) {
    const [d] = await db
      .select({ userId: drivers.userId })
      .from(drivers)
      .where(eq(drivers.id, ride.driverId))
      .limit(1);
    if (d?.userId === user.id) return;
  }
  throw new AppError(403, "FORBIDDEN", "Not your ride");
}

async function driverByUserIdOrThrow(db: DbConn, userId: string) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  if (!driver) throw new AppError(403, "NOT_A_DRIVER", "No driver profile");
  return driver;
}

/** arrived / in_progress transitions share the same shape. */
async function driverTransition(
  db: Db,
  notifier: RideNotifier,
  driverUserId: string,
  rideId: string,
  from: RideStatus,
  to: RideStatus,
  set: Partial<typeof rides.$inferInsert>,
) {
  const driver = await driverByUserIdOrThrow(db, driverUserId);
  const ride = await db.transaction(async (tx) => {
    const updated = await casTransition(tx, {
      rideId,
      from: [from],
      to,
      set,
      actorUserId: driverUserId,
      guard: eq(rides.driverId, driver.id),
    });
    if (!updated) {
      throw new AppError(409, "INVALID_TRANSITION", `Ride is not in the ${from} state (or not yours)`);
    }
    return updated;
  });

  const detail = await getRideDetail(db, ride);
  notifier.rideUpdate(ride.riderId, driverUserId, detail);
  return detail;
}

export function driverArrive(db: Db, notifier: RideNotifier, driverUserId: string, rideId: string) {
  return driverTransition(db, notifier, driverUserId, rideId, "accepted", "arrived", {
    arrivedAt: new Date(),
  });
}

export function driverStart(db: Db, notifier: RideNotifier, driverUserId: string, rideId: string) {
  return driverTransition(db, notifier, driverUserId, rideId, "arrived", "in_progress", {
    startedAt: new Date(),
  });
}

/** Complete: final fare from actuals + the three ledger entries, atomically. */
export async function driverComplete(
  db: Db,
  notifier: RideNotifier,
  driverUserId: string,
  rideId: string,
) {
  const driver = await driverByUserIdOrThrow(db, driverUserId);

  const ride = await db.transaction(async (tx) => {
    const current = await getRideOrThrow(tx, rideId);
    if (current.driverId !== driver.id) throw new AppError(403, "FORBIDDEN", "Not your ride");
    if (current.status !== "in_progress") {
      throw new AppError(409, "INVALID_TRANSITION", "Ride is not in progress");
    }

    const completedAt = new Date();
    const cfg = await getFareConfig(tx, current.rideType);
    const actualDurationS = current.startedAt
      ? Math.max(0, Math.round((completedAt.getTime() - current.startedAt.getTime()) / 1000))
      : (current.durationS ?? 0);
    const finalFare = computeFare(
      cfg,
      current.distanceM ?? 0,
      actualDurationS,
      current.surgeMultiplier,
    );

    const updated = await casTransition(tx, {
      rideId,
      from: ["in_progress"],
      to: "completed",
      set: { completedAt, finalFare },
      actorUserId: driverUserId,
      metadata: { finalFare, actualDurationS },
      guard: eq(rides.driverId, driver.id),
    });
    if (!updated) throw new AppError(409, "INVALID_TRANSITION", "Ride already transitioned");

    const { commission, driverPayout } = splitFare(finalFare);
    await tx.insert(ledgerEntries).values([
      // Rider paid the fare (cash, directly to the driver)
      { rideId, userId: updated.riderId, type: "ride_fare", amount: finalFare, method: "cash", currency: updated.currency },
      // Driver owes the platform its cut
      { rideId, userId: driverUserId, type: "commission", amount: commission, method: "cash", currency: updated.currency },
      // Driver's earning from the ride
      { rideId, userId: driverUserId, type: "driver_payout", amount: driverPayout, method: "cash", currency: updated.currency },
    ]);

    return updated;
  });

  const detail = await getRideDetail(db, ride);
  notifier.rideUpdate(ride.riderId, driverUserId, detail);
  return detail;
}

/** Cancel — rider from searching/accepted/arrived, driver from accepted/arrived. */
export async function cancelRide(
  db: Db,
  notifier: RideNotifier,
  user: { id: string; role: string },
  rideId: string,
  reason: string | undefined,
) {
  const current = await getRideOrThrow(db, rideId);
  await assertRideAccess(db, current, user);

  const isRider = current.riderId === user.id;
  const from: readonly RideStatus[] = isRider
    ? ["searching", "accepted", "arrived"]
    : ["accepted", "arrived"];

  const { ride, revokedDriverUserIds, cancellationFee } = await db.transaction(async (tx) => {
    // A rider who cancels after the free-cancel window (measured from the
    // driver's acceptance) owes a flat fee; searching-stage cancels are free.
    let cancellationFee = 0;
    if (isRider && current.acceptedAt) {
      const [cfg] = await tx
        .select({
          cancelFreeWindowS: fareConfigs.cancelFreeWindowS,
          cancelFee: fareConfigs.cancelFee,
        })
        .from(fareConfigs)
        .where(eq(fareConfigs.rideType, current.rideType))
        .limit(1);
      if (cfg && cfg.cancelFee > 0) {
        const elapsedS = (Date.now() - current.acceptedAt.getTime()) / 1000;
        if (elapsedS > cfg.cancelFreeWindowS) cancellationFee = cfg.cancelFee;
      }
    }

    const updated = await casTransition(tx, {
      rideId,
      from,
      to: "cancelled",
      set: {
        cancelledAt: new Date(),
        cancelledBy: isRider ? "rider" : "driver",
        cancellationReason: reason ?? null,
      },
      actorUserId: user.id,
      metadata: { reason, cancellationFee },
    });
    if (!updated) throw new AppError(409, "INVALID_TRANSITION", "Ride can no longer be cancelled");

    // Late rider cancel: the rider owes the platform a cancellation fee (ledger adjustment).
    if (cancellationFee > 0) {
      await tx.insert(ledgerEntries).values({
        rideId,
        userId: updated.riderId,
        type: "adjustment",
        amount: cancellationFee,
        method: "cash",
        currency: updated.currency,
        note: "cancellation_fee",
      });
    }

    // Kill any outstanding offers and tell those drivers
    const revoked = await tx
      .update(rideOffers)
      .set({ status: "superseded", respondedAt: new Date() })
      .where(and(eq(rideOffers.rideId, rideId), eq(rideOffers.status, "offered")))
      .returning({ driverId: rideOffers.driverId });

    let revokedDriverUserIds: string[] = [];
    if (revoked.length > 0) {
      const rows = await tx
        .select({ userId: drivers.userId })
        .from(drivers)
        .where(inArray(drivers.id, revoked.map((r) => r.driverId)));
      revokedDriverUserIds = rows.map((r) => r.userId);
    }
    return { ride: updated, revokedDriverUserIds, cancellationFee };
  });

  for (const driverUserId of revokedDriverUserIds) {
    notifier.offerRevoked(driverUserId, rideId, "cancelled");
  }

  let assignedDriverUserId: string | null = null;
  if (ride.driverId) {
    const [d] = await db
      .select({ userId: drivers.userId })
      .from(drivers)
      .where(eq(drivers.id, ride.driverId))
      .limit(1);
    assignedDriverUserId = d?.userId ?? null;
  }
  const detail = await getRideDetail(db, ride);
  notifier.rideUpdate(ride.riderId, assignedDriverUserId, detail);
  return { ...detail, cancellationFee };
}

/** Admin override: cancel any active ride with a reason. Audited. */
export async function adminForceCancel(
  db: Db,
  notifier: RideNotifier,
  ctx: { actorUserId: string; ip?: string | null },
  rideId: string,
  reason: string,
) {
  const { ride, revokedDriverUserIds } = await db.transaction(async (tx) => {
    const updated = await casTransition(tx, {
      rideId,
      from: [...ACTIVE_RIDE_STATUSES],
      to: "cancelled",
      set: {
        cancelledAt: new Date(),
        cancelledBy: "system",
        cancellationReason: reason,
      },
      actorUserId: ctx.actorUserId,
      metadata: { reason, forcedByAdmin: true },
    });
    if (!updated) throw new AppError(409, "INVALID_TRANSITION", "Ride is not active");

    const revoked = await tx
      .update(rideOffers)
      .set({ status: "superseded", respondedAt: new Date() })
      .where(and(eq(rideOffers.rideId, rideId), eq(rideOffers.status, "offered")))
      .returning({ driverId: rideOffers.driverId });

    let revokedDriverUserIds: string[] = [];
    if (revoked.length > 0) {
      const rows = await tx
        .select({ userId: drivers.userId })
        .from(drivers)
        .where(inArray(drivers.id, revoked.map((r) => r.driverId)));
      revokedDriverUserIds = rows.map((r) => r.userId);
    }

    await writeAudit(tx, ctx, {
      action: "ride.force_cancel",
      entityType: "ride",
      entityId: rideId,
      diff: { reason },
    });

    return { ride: updated, revokedDriverUserIds };
  });

  for (const driverUserId of revokedDriverUserIds) {
    notifier.offerRevoked(driverUserId, rideId, "cancelled");
  }

  let assignedDriverUserId: string | null = null;
  if (ride.driverId) {
    const [d] = await db
      .select({ userId: drivers.userId })
      .from(drivers)
      .where(eq(drivers.id, ride.driverId))
      .limit(1);
    assignedDriverUserId = d?.userId ?? null;
  }
  const detail = await getRideDetail(db, ride);
  notifier.rideUpdate(ride.riderId, assignedDriverUserId, detail);
  return detail;
}

export async function listMyRides(
  db: Db,
  user: { id: string; role: string },
  page: number,
  limit: number,
) {
  let where;
  if (user.role === "driver") {
    const driver = await driverByUserIdOrThrow(db, user.id);
    where = eq(rides.driverId, driver.id);
  } else {
    where = eq(rides.riderId, user.id);
  }
  return db
    .select()
    .from(rides)
    .where(where)
    .orderBy(desc(rides.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/** The ride a user should be looking at right now, if any. */
export async function getActiveRide(db: Db, user: { id: string; role: string }) {
  if (user.role === "driver") {
    const driver = await driverByUserIdOrThrow(db, user.id);
    const [ride] = await db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driver.id),
          inArray(rides.status, ["accepted", "arrived", "in_progress"]),
        ),
      )
      .limit(1);
    return ride ?? null;
  }
  const [ride] = await db
    .select()
    .from(rides)
    .where(and(eq(rides.riderId, user.id), inArray(rides.status, [...ACTIVE_RIDE_STATUSES])))
    .limit(1);
  return ride ?? null;
}
