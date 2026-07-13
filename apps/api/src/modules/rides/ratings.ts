import { and, eq, sql } from "drizzle-orm";
import type { RatingInput } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { drivers, ratings, rides } from "../../db/schema/index.js";
import { AppError } from "../../middleware/errorHandler.js";

/** Rate the other party of a completed ride — once, participants only. */
export async function rateRide(
  db: Db,
  raterUserId: string,
  rideId: string,
  input: RatingInput,
) {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, rideId)).limit(1);
    if (!ride) throw new AppError(404, "NOT_FOUND", "Ride not found");
    if (ride.status !== "completed") {
      throw new AppError(409, "RIDE_NOT_COMPLETED", "You can only rate completed rides");
    }
    if (!ride.driverId) throw new AppError(409, "NO_DRIVER", "Ride has no driver");

    const [driver] = await tx
      .select({ id: drivers.id, userId: drivers.userId })
      .from(drivers)
      .where(eq(drivers.id, ride.driverId))
      .limit(1);
    if (!driver) throw new AppError(404, "NOT_FOUND", "Driver not found");

    let rateeUserId: string;
    if (raterUserId === ride.riderId) rateeUserId = driver.userId;
    else if (raterUserId === driver.userId) rateeUserId = ride.riderId;
    else throw new AppError(403, "FORBIDDEN", "Not your ride");

    const [existing] = await tx
      .select({ id: ratings.id })
      .from(ratings)
      .where(and(eq(ratings.rideId, rideId), eq(ratings.raterUserId, raterUserId)))
      .limit(1);
    if (existing) throw new AppError(409, "ALREADY_RATED", "You already rated this ride");

    const [rating] = await tx
      .insert(ratings)
      .values({
        rideId,
        raterUserId,
        rateeUserId,
        score: input.score,
        comment: input.comment,
      })
      .returning();

    // Rider→driver ratings roll into the driver's aggregate
    if (rateeUserId === driver.userId) {
      await tx
        .update(drivers)
        .set({
          ratingAvg: sql`round(((coalesce(${drivers.ratingAvg}, 0) * ${drivers.ratingCount}) + ${input.score})::numeric / (${drivers.ratingCount} + 1), 2)`,
          ratingCount: sql`${drivers.ratingCount} + 1`,
        })
        .where(eq(drivers.id, driver.id));
    }

    return rating;
  });
}
