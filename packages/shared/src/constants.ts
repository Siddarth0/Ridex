/** Roles a user account can hold. A driver is a user with an approved driver profile. */
export const USER_ROLES = ["rider", "driver", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Vehicle categories offered at launch (Nepal market). */
export const RIDE_TYPES = ["bike", "car", "premium"] as const;
export type RideType = (typeof RIDE_TYPES)[number];

/**
 * Ride lifecycle. Transitions are enforced server-side via
 * RIDE_STATUS_TRANSITIONS — never set status directly.
 */
export const RIDE_STATUSES = [
  "searching", // matching service is offering the ride to drivers
  "accepted", // a driver won the offer
  "arrived", // driver at pickup point
  "in_progress", // ride started
  "completed", // ride finished, fare recorded
  "cancelled", // cancelled by rider, driver, or system
  "expired", // no driver found within the search window
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

export const RIDE_STATUS_TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  searching: ["accepted", "cancelled", "expired"],
  accepted: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  expired: [],
} as const;

export const PAYMENT_METHODS = ["cash"] as const; // eSewa/Khalti arrive in Phase 4
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CURRENCY = "NPR" as const;

export const DRIVER_STATUSES = ["pending", "approved", "suspended", "rejected"] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

// ── Dispatch & pricing (server-enforced; clients use these for display only) ──

/** Platform's cut of every fare. */
export const PLATFORM_COMMISSION = 0.15;

/** How long dispatch searches before expiring a ride. */
export const RIDE_SEARCH_TTL_S = 90;

/** How long a driver has to respond to an offer. */
export const RIDE_OFFER_TTL_S = 20;

/** Rides shorter than this are rejected at request time. */
export const MIN_RIDE_DISTANCE_M = 100;

/** Rough Nepal bounding box — sanity check on pickup coordinates. */
export const NEPAL_BBOX = { minLat: 26.3, maxLat: 30.5, minLng: 80.0, maxLng: 88.3 } as const;
