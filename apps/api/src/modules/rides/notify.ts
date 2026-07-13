import type { Server } from "socket.io";

/**
 * Everything the ride pipeline tells clients. Implemented over Socket.IO in
 * production and by a recording stub in tests. Emit only AFTER the owning
 * DB transaction commits.
 */
export interface RideNotifier {
  /** Ride state changed — sent to rider, assigned driver (if any), and admins. */
  rideUpdate(riderUserId: string, driverUserId: string | null, ride: unknown): void;
  /** New offer for a driver. */
  offer(driverUserId: string, payload: unknown): void;
  /** An outstanding offer is gone (expired | taken | cancelled). */
  offerRevoked(driverUserId: string, rideId: string, reason: "expired" | "taken" | "cancelled"): void;
  /** Search gave up. */
  rideExpired(riderUserId: string, rideId: string): void;
  /** Live driver position for the rider during an active ride. */
  driverLocation(
    riderUserId: string,
    payload: { rideId: string; lat: number; lng: number; heading?: number | null },
  ): void;
}

export function createSocketNotifier(io: Server): RideNotifier {
  return {
    rideUpdate(riderUserId, driverUserId, ride) {
      io.to(`user:${riderUserId}`).emit("ride:update", ride);
      if (driverUserId) io.to(`user:${driverUserId}`).emit("ride:update", ride);
      io.to("admins").emit("ride:update", ride);
    },
    offer(driverUserId, payload) {
      io.to(`user:${driverUserId}`).emit("ride:offer", payload);
    },
    offerRevoked(driverUserId, rideId, reason) {
      io.to(`user:${driverUserId}`).emit("ride:offer_revoked", { rideId, reason });
    },
    rideExpired(riderUserId, rideId) {
      io.to(`user:${riderUserId}`).emit("ride:expired", { rideId });
    },
    driverLocation(riderUserId, payload) {
      io.to(`user:${riderUserId}`).emit("driver:location", payload);
    },
  };
}
