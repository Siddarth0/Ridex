import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { RIDE_OFFER_TTL_S } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { driverLocations, drivers, rideOffers, rides, vehicles } from "../../db/schema/index.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../middleware/errorHandler.js";
import { casTransition, getRideOrThrow } from "../rides/service.js";
import type { RideNotifier } from "../rides/notify.js";
import { findCandidateDrivers } from "./candidates.js";

const TICK_INTERVAL_MS = 5_000;
const OFFER_BATCH_SIZE = 3;
const INITIAL_RADIUS_M = 2_000;
const RADIUS_STEP_M = 1_500;
const MAX_RADIUS_M = 8_000;
/** Widen the search ring every N ms of unanswered searching. */
const WIDEN_EVERY_MS = 20_000;

export interface Dispatcher {
  start(): void;
  stop(): void;
  /** One pass — exported so tests drive the loop deterministically. */
  tick(now?: Date): Promise<void>;
}

export function createDispatcher(db: Db, notifier: RideNotifier): Dispatcher {
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function expireStaleOffers(now: Date): Promise<void> {
    const expired = await db
      .update(rideOffers)
      .set({ status: "expired", respondedAt: now })
      .where(and(eq(rideOffers.status, "offered"), lte(rideOffers.expiresAt, now)))
      .returning({ rideId: rideOffers.rideId, driverId: rideOffers.driverId });
    if (expired.length === 0) return;

    const rows = await db
      .select({ id: drivers.id, userId: drivers.userId })
      .from(drivers)
      .where(inArray(drivers.id, expired.map((e) => e.driverId)));
    const userByDriver = new Map(rows.map((r) => [r.id, r.userId]));
    for (const offer of expired) {
      const userId = userByDriver.get(offer.driverId);
      if (userId) notifier.offerRevoked(userId, offer.rideId, "expired");
    }
  }

  async function expireStaleRides(now: Date): Promise<void> {
    const stale = await db
      .select({ id: rides.id, riderId: rides.riderId })
      .from(rides)
      .where(and(eq(rides.status, "searching"), lte(rides.searchExpiresAt, now)));

    for (const ride of stale) {
      const updated = await db.transaction(async (tx) => {
        const r = await casTransition(tx, {
          rideId: ride.id,
          from: ["searching"],
          to: "expired",
          set: { cancelledBy: "system" },
          metadata: { reason: "no driver found" },
        });
        if (r) {
          await tx
            .update(rideOffers)
            .set({ status: "superseded", respondedAt: now })
            .where(and(eq(rideOffers.rideId, ride.id), eq(rideOffers.status, "offered")));
        }
        return r;
      });
      if (updated) notifier.rideExpired(ride.riderId, ride.id);
    }
  }

  async function offerSearchingRides(now: Date): Promise<void> {
    // Searching rides with fewer live offers than the batch size
    const searching = await db
      .select({
        ride: rides,
        liveOffers: sql<number>`(
          select count(*)::int from ${rideOffers}
          where ${rideOffers.rideId} = ${rides.id} and ${rideOffers.status} = 'offered'
        )`,
      })
      .from(rides)
      .where(eq(rides.status, "searching"));

    for (const { ride, liveOffers } of searching) {
      const wanted = OFFER_BATCH_SIZE - liveOffers;
      if (wanted <= 0) continue;

      const elapsedMs = now.getTime() - ride.requestedAt.getTime();
      const radiusM = Math.min(
        INITIAL_RADIUS_M + Math.floor(elapsedMs / WIDEN_EVERY_MS) * RADIUS_STEP_M,
        MAX_RADIUS_M,
      );

      const candidates = await findCandidateDrivers(db, {
        rideId: ride.id,
        rideType: ride.rideType,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        radiusM,
        limit: wanted,
        now,
      });

      for (const candidate of candidates) {
        await db.insert(rideOffers).values({
          rideId: ride.id,
          driverId: candidate.driverId,
          expiresAt: new Date(now.getTime() + RIDE_OFFER_TTL_S * 1000),
        });
        notifier.offer(candidate.driverUserId, {
          rideId: ride.id,
          rideType: ride.rideType,
          pickup: { address: ride.pickupAddress, coordinates: [ride.pickupLng, ride.pickupLat] },
          destination: {
            address: ride.destinationAddress,
            coordinates: [ride.destinationLng, ride.destinationLat],
          },
          distanceM: ride.distanceM,
          durationS: ride.durationS,
          estimatedFare: ride.estimatedFare,
          currency: ride.currency,
          pickupDistanceM: candidate.distanceM,
          expiresInS: RIDE_OFFER_TTL_S,
        });
      }
    }
  }

  async function tick(now = new Date()): Promise<void> {
    // Guard against overlapping passes if a tick runs long
    if (running) return;
    running = true;
    try {
      await expireStaleOffers(now);
      await expireStaleRides(now);
      await offerSearchingRides(now);
    } catch (err) {
      logger.error({ err }, "dispatcher tick failed");
    } finally {
      running = false;
    }
  }

  return {
    tick,
    start() {
      if (timer) return;
      timer = setInterval(() => void tick(), TICK_INTERVAL_MS);
      timer.unref();
      logger.info("dispatcher started");
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

/** Driver accepts an offer: offer CAS + ride CAS in one transaction — exactly one winner. */
export async function acceptOffer(
  db: Db,
  notifier: RideNotifier,
  driverUserId: string,
  rideId: string,
  now = new Date(),
) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, driverUserId)).limit(1);
  if (!driver) throw new AppError(403, "NOT_A_DRIVER", "No driver profile");

  const { ride, supersededUserIds } = await db.transaction(async (tx) => {
    // 1. Win the offer (must still be live)
    const [offer] = await tx
      .update(rideOffers)
      .set({ status: "accepted", respondedAt: now })
      .where(
        and(
          eq(rideOffers.rideId, rideId),
          eq(rideOffers.driverId, driver.id),
          eq(rideOffers.status, "offered"),
          sql`${rideOffers.expiresAt} > ${now}`,
        ),
      )
      .returning();
    if (!offer) {
      throw new AppError(409, "OFFER_EXPIRED", "This offer is no longer available");
    }

    // 2. Driver's vehicle for this ride type
    const currentRide = await getRideOrThrow(tx, rideId);
    const [vehicle] = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.driverId, driver.id),
          eq(vehicles.rideType, currentRide.rideType),
          eq(vehicles.isActive, true),
        ),
      )
      .limit(1);
    if (!vehicle) {
      throw new AppError(409, "NO_VEHICLE", "No active vehicle for this ride type");
    }

    // 3. Win the ride — the race is decided here
    const updated = await casTransition(tx, {
      rideId,
      from: ["searching"],
      to: "accepted",
      set: { driverId: driver.id, vehicleId: vehicle.id, acceptedAt: now },
      actorUserId: driverUserId,
      metadata: { offerId: offer.id },
    });
    if (!updated) {
      // rolls back the offer acceptance too
      throw new AppError(409, "RIDE_ALREADY_TAKEN", "Another driver got this ride first");
    }

    // 4. Everyone else's offers are gone
    const superseded = await tx
      .update(rideOffers)
      .set({ status: "superseded", respondedAt: now })
      .where(and(eq(rideOffers.rideId, rideId), eq(rideOffers.status, "offered")))
      .returning({ driverId: rideOffers.driverId });

    let supersededUserIds: string[] = [];
    if (superseded.length > 0) {
      const rows = await tx
        .select({ userId: drivers.userId })
        .from(drivers)
        .where(inArray(drivers.id, superseded.map((s) => s.driverId)));
      supersededUserIds = rows.map((r) => r.userId);
    }
    return { ride: updated, supersededUserIds };
  });

  for (const userId of supersededUserIds) notifier.offerRevoked(userId, rideId, "taken");
  return ride;
}

export async function declineOffer(db: Db, driverUserId: string, rideId: string): Promise<void> {
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, driverUserId)).limit(1);
  if (!driver) return;
  await db
    .update(rideOffers)
    .set({ status: "declined", respondedAt: new Date() })
    .where(
      and(
        eq(rideOffers.rideId, rideId),
        eq(rideOffers.driverId, driver.id),
        eq(rideOffers.status, "offered"),
      ),
    );
}

/** Upsert a driver's live position; returns their active ride's rider for relaying. */
export async function updateDriverLocation(
  db: Db,
  driverUserId: string,
  loc: { lat: number; lng: number; heading?: number; speedKmh?: number },
): Promise<{ rideId: string; riderUserId: string } | null> {
  const [driver] = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(eq(drivers.userId, driverUserId))
    .limit(1);
  if (!driver) return null;

  await db
    .insert(driverLocations)
    .values({ driverId: driver.id, ...loc, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: driverLocations.driverId,
      set: { lat: loc.lat, lng: loc.lng, heading: loc.heading, speedKmh: loc.speedKmh, updatedAt: new Date() },
    });

  const [active] = await db
    .select({ rideId: rides.id, riderUserId: rides.riderId })
    .from(rides)
    .where(
      and(
        eq(rides.driverId, driver.id),
        inArray(rides.status, ["accepted", "arrived", "in_progress"]),
      ),
    )
    .limit(1);
  return active ?? null;
}
