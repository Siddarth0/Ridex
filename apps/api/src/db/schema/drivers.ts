import {
  boolean,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import {
  documentStatusEnum,
  documentTypeEnum,
  driverStatusEnum,
  rideTypeEnum,
} from "./enums.js";

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    licenseNumber: varchar("license_number", { length: 50 }).notNull().unique(),
    status: driverStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id),
    isOnline: boolean("is_online").notNull().default(false),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2, mode: "number" }),
    ratingCount: integer("rating_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("drivers_status_idx").on(t.status)],
);

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => drivers.id, { onDelete: "cascade" }),
  rideType: rideTypeEnum("ride_type").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year"),
  plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
  color: varchar("color", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Latest known position per driver — upserted on every location ping, never appended. */
export const driverLocations = pgTable(
  "driver_locations",
  {
    driverId: uuid("driver_id")
      .primaryKey()
      .references(() => drivers.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    heading: smallint("heading"),
    speedKmh: real("speed_kmh"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("driver_locations_lat_lng_idx").on(t.lat, t.lng)],
);

export const driverDocuments = pgTable(
  "driver_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    type: documentTypeEnum("type").notNull(),
    storagePath: text("storage_path").notNull(),
    originalName: varchar("original_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    status: documentStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("driver_documents_driver_idx").on(t.driverId)],
);
