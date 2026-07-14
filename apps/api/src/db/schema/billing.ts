import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { rides } from "./rides.js";
import { ledgerEntryTypeEnum, paymentMethodEnum, rideTypeEnum } from "./enums.js";

/** Per-ride-type pricing, editable by admins. */
export const fareConfigs = pgTable("fare_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideType: rideTypeEnum("ride_type").notNull().unique(),
  baseFare: numeric("base_fare", { precision: 10, scale: 2, mode: "number" }).notNull(),
  perKm: numeric("per_km", { precision: 10, scale: 2, mode: "number" }).notNull(),
  perMin: numeric("per_min", { precision: 10, scale: 2, mode: "number" }).notNull(),
  minFare: numeric("min_fare", { precision: 10, scale: 2, mode: "number" }).notNull(),
  /** Manual surge dial (1.0–3.0), applied to estimates immediately. */
  surgeMultiplier: numeric("surge_multiplier", { precision: 4, scale: 2, mode: "number" })
    .notNull()
    .default(1),
  /** Free-cancel grace period after acceptance, in seconds. */
  cancelFreeWindowS: integer("cancel_free_window_s").notNull().default(120),
  /** Flat fee charged when a rider cancels past the free window. */
  cancelFee: numeric("cancel_fee", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("NPR"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Append-only money trail. Cash rides are recorded here too, so switching to
 * digital payments later only adds entries — it never changes the model.
 * Positive amount = owed to the platform/user in `type`'s direction.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id").references(() => rides.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: ledgerEntryTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("NPR"),
    method: paymentMethodEnum("method").notNull().default("cash"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ledger_entries_user_idx").on(t.userId, t.createdAt),
    index("ledger_entries_ride_idx").on(t.rideId),
  ],
);
