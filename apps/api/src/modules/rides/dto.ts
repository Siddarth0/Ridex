import { eq } from "drizzle-orm";
import type { DbConn } from "../../db/index.js";
import { drivers, rides, users, vehicles } from "../../db/schema/index.js";

type RideRow = typeof rides.$inferSelect;

export function toRideDto(ride: RideRow) {
  return {
    id: ride.id,
    status: ride.status,
    rideType: ride.rideType,
    pickup: {
      address: ride.pickupAddress,
      coordinates: [ride.pickupLng, ride.pickupLat] as [number, number],
    },
    destination: {
      address: ride.destinationAddress,
      coordinates: [ride.destinationLng, ride.destinationLat] as [number, number],
    },
    distanceM: ride.distanceM,
    durationS: ride.durationS,
    routePolyline: ride.routePolyline,
    estimatedFare: ride.estimatedFare,
    finalFare: ride.finalFare,
    surgeMultiplier: ride.surgeMultiplier,
    paymentMethod: ride.paymentMethod,
    currency: ride.currency,
    requestedAt: ride.requestedAt,
    acceptedAt: ride.acceptedAt,
    arrivedAt: ride.arrivedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    cancelledAt: ride.cancelledAt,
    cancelledBy: ride.cancelledBy,
    cancellationReason: ride.cancellationReason,
  };
}

/** Ride + the participant info each side is allowed to see. */
export async function getRideDetail(db: DbConn, ride: RideRow) {
  const dto = toRideDto(ride);

  const [rider] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
    .from(users)
    .where(eq(users.id, ride.riderId))
    .limit(1);

  let driver = null;
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

  let vehicle = null;
  if (ride.vehicleId) {
    const [v] = await db
      .select({
        make: vehicles.make,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
        color: vehicles.color,
        rideType: vehicles.rideType,
      })
      .from(vehicles)
      .where(eq(vehicles.id, ride.vehicleId))
      .limit(1);
    vehicle = v ?? null;
  }

  return { ...dto, rider: rider ?? null, driver, vehicle };
}
