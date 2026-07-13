import { and, eq, exists, gte, lte, notExists, sql } from "drizzle-orm";
import type { RideType } from "@ridex/shared";
import type { DbConn } from "../../db/index.js";
import { driverLocations, drivers, rideOffers, rides, vehicles } from "../../db/schema/index.js";

export interface Candidate {
  driverId: string;
  driverUserId: string;
  lat: number;
  lng: number;
  distanceM: number;
}

/** Location pings older than this don't count — the driver is effectively gone. */
export const LOCATION_STALE_S = 60;

/**
 * Nearest eligible drivers for a ride: approved + online + fresh location +
 * an active vehicle of the right type, not already busy, not already asked.
 * Bounding box narrows the scan, SQL haversine orders by real distance —
 * plain SQL so the exact query runs on PGlite in tests.
 */
export async function findCandidateDrivers(
  db: DbConn,
  opts: {
    rideId: string;
    rideType: RideType;
    pickupLat: number;
    pickupLng: number;
    radiusM: number;
    limit: number;
    now: Date;
  },
): Promise<Candidate[]> {
  const { pickupLat, pickupLng, radiusM } = opts;
  const latDelta = radiusM / 111_320;
  const lngDelta = radiusM / (111_320 * Math.max(0.2, Math.cos((pickupLat * Math.PI) / 180)));
  const staleCutoff = new Date(opts.now.getTime() - LOCATION_STALE_S * 1000);

  const distanceExpr = sql<number>`
    2 * 6371000 * asin(sqrt(
      power(sin(radians(${driverLocations.lat} - ${pickupLat}) / 2), 2) +
      cos(radians(${pickupLat})) * cos(radians(${driverLocations.lat})) *
      power(sin(radians(${driverLocations.lng} - ${pickupLng}) / 2), 2)
    ))`;

  const rows = await db
    .select({
      driverId: drivers.id,
      driverUserId: drivers.userId,
      lat: driverLocations.lat,
      lng: driverLocations.lng,
      distanceM: distanceExpr,
    })
    .from(driverLocations)
    .innerJoin(drivers, eq(driverLocations.driverId, drivers.id))
    .where(
      and(
        eq(drivers.status, "approved"),
        eq(drivers.isOnline, true),
        gte(driverLocations.updatedAt, staleCutoff),
        gte(driverLocations.lat, pickupLat - latDelta),
        lte(driverLocations.lat, pickupLat + latDelta),
        gte(driverLocations.lng, pickupLng - lngDelta),
        lte(driverLocations.lng, pickupLng + lngDelta),
        sql`${distanceExpr} <= ${radiusM}`,
        // has an active vehicle of the requested type
        exists(
          db
            .select({ one: sql`1` })
            .from(vehicles)
            .where(
              and(
                eq(vehicles.driverId, drivers.id),
                eq(vehicles.rideType, opts.rideType),
                eq(vehicles.isActive, true),
              ),
            ),
        ),
        // not on an active ride
        notExists(
          db
            .select({ one: sql`1` })
            .from(rides)
            .where(
              and(
                eq(rides.driverId, drivers.id),
                sql`${rides.status} in ('accepted', 'arrived', 'in_progress')`,
              ),
            ),
        ),
        // never asked for this ride before (offered/declined/expired all disqualify)
        notExists(
          db
            .select({ one: sql`1` })
            .from(rideOffers)
            .where(and(eq(rideOffers.rideId, opts.rideId), eq(rideOffers.driverId, drivers.id))),
        ),
        // no other live offer in hand
        notExists(
          db
            .select({ one: sql`1` })
            .from(rideOffers)
            .where(and(eq(rideOffers.driverId, drivers.id), eq(rideOffers.status, "offered"))),
        ),
      ),
    )
    .orderBy(distanceExpr)
    .limit(opts.limit);

  return rows.map((r) => ({ ...r, distanceM: Math.round(r.distanceM) }));
}
