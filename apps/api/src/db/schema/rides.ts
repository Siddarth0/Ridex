import {
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { drivers, vehicles } from "./drivers.js";
import {
  cancelledByEnum,
  offerStatusEnum,
  paymentMethodEnum,
  rideStatusEnum,
  rideTypeEnum,
} from "./enums.js";

/**
 * Coordinates are plain lat/lng doubles for now; a PostGIS geography column
 * (and the matching KNN index) is added in Phase 2 with the dispatch service.
 */
export const rides = pgTable(
  "rides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    riderId: uuid("rider_id")
      .notNull()
      .references(() => users.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    rideType: rideTypeEnum("ride_type").notNull(),
    status: rideStatusEnum("status").notNull().default("searching"),

    pickupAddress: text("pickup_address").notNull(),
    pickupLat: doublePrecision("pickup_lat").notNull(),
    pickupLng: doublePrecision("pickup_lng").notNull(),
    destinationAddress: text("destination_address").notNull(),
    destinationLat: doublePrecision("destination_lat").notNull(),
    destinationLng: doublePrecision("destination_lng").notNull(),

    distanceM: integer("distance_m"),
    durationS: integer("duration_s"),
    routePolyline: text("route_polyline"),
    /** Dispatch gives up and expires the ride after this moment. */
    searchExpiresAt: timestamp("search_expires_at", { withTimezone: true }),
    estimatedFare: numeric("estimated_fare", { precision: 10, scale: 2, mode: "number" }),
    finalFare: numeric("final_fare", { precision: 10, scale: 2, mode: "number" }),
    surgeMultiplier: numeric("surge_multiplier", { precision: 4, scale: 2, mode: "number" })
      .notNull()
      .default(1),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
    currency: varchar("currency", { length: 3 }).notNull().default("NPR"),

    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: cancelledByEnum("cancelled_by"),
    cancellationReason: text("cancellation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("rides_rider_idx").on(t.riderId, t.createdAt),
    index("rides_driver_idx").on(t.driverId, t.createdAt),
    index("rides_status_idx").on(t.status, t.createdAt),
  ],
);

/** Dispatch work queue + audit: one row per (ride, driver) offer. */
export const rideOffers = pgTable(
  "ride_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    status: offerStatusEnum("status").notNull().default("offered"),
    offeredAt: timestamp("offered_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("ride_offers_ride_driver_uq").on(t.rideId, t.driverId),
    index("ride_offers_status_idx").on(t.status, t.expiresAt),
    index("ride_offers_driver_idx").on(t.driverId, t.status),
  ],
);

/** Mutual post-ride ratings; driver aggregates updated in the same transaction. */
export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id, { onDelete: "cascade" }),
    raterUserId: uuid("rater_user_id")
      .notNull()
      .references(() => users.id),
    rateeUserId: uuid("ratee_user_id")
      .notNull()
      .references(() => users.id),
    score: smallint("score").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("ratings_ride_rater_uq").on(t.rideId, t.raterUserId),
    index("ratings_ratee_idx").on(t.rateeUserId),
  ],
);

/** Append-only audit trail of every ride state change. */
export const rideEvents = pgTable(
  "ride_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => rides.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    fromStatus: rideStatusEnum("from_status"),
    toStatus: rideStatusEnum("to_status").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ride_events_ride_idx").on(t.rideId)],
);
