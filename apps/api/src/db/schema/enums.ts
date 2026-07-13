import { pgEnum } from "drizzle-orm/pg-core";
import {
  DRIVER_STATUSES,
  PAYMENT_METHODS,
  RIDE_STATUSES,
  RIDE_TYPES,
  USER_ROLES,
} from "@ridex/shared";

export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const rideTypeEnum = pgEnum("ride_type", RIDE_TYPES);
export const rideStatusEnum = pgEnum("ride_status", RIDE_STATUSES);
export const driverStatusEnum = pgEnum("driver_status", DRIVER_STATUSES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);

export const userTokenPurposeEnum = pgEnum("user_token_purpose", [
  "email_verification",
  "password_reset",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "license",
  "registration",
  "insurance",
  "profile_photo",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
]);

export const cancelledByEnum = pgEnum("cancelled_by", ["rider", "driver", "system"]);

export const offerStatusEnum = pgEnum("offer_status", [
  "offered", // waiting for the driver's response
  "accepted", // driver won the ride
  "declined", // driver said no
  "expired", // TTL passed without a response
  "superseded", // another driver won, or the rider cancelled
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "ride_fare", // what the rider owes/paid for a ride
  "commission", // platform's cut of a fare
  "driver_payout", // settlement owed/paid to the driver
  "adjustment", // manual correction by an admin
]);
