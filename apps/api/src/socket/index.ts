import { Server, type Socket } from "socket.io";
import { and, eq, inArray } from "drizzle-orm";
import type { UserRole } from "@ridex/shared";
import { locationUpdateSchema } from "@ridex/shared";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { verifyAccessToken } from "../lib/tokens.js";
import type { Db } from "../db/index.js";
import { drivers, rides } from "../db/schema/index.js";
import type { RideNotifier } from "../modules/rides/notify.js";
import { updateDriverLocation } from "../modules/matching/dispatcher.js";
import { getActiveRide } from "../modules/rides/service.js";
import { getRideDetail } from "../modules/rides/dto.js";

interface SocketAuth {
  userId: string;
  role: UserRole;
}

declare module "socket.io" {
  interface Socket {
    auth?: SocketAuth;
  }
}

function tokenFromHandshake(socket: Socket): string | null {
  const auth = socket.handshake.auth as Record<string, unknown>;
  if (typeof auth.token === "string") return auth.token;
  // Browser clients send cookies automatically; fall back to the access_token cookie
  const cookies = socket.handshake.headers.cookie;
  const match = cookies?.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match?.[1] ?? null;
}

/** Minimum gap between accepted location pings per driver. */
const LOCATION_THROTTLE_MS = 2_000;

/**
 * Build the Socket.IO server WITHOUT attaching it to an http server yet.
 * The caller must `io.attach(server)` after Express is the server's base
 * request handler, so engine.io captures Express and delegates non-socket.io
 * requests to it. Attaching before Express is wired leaves Express as a second
 * `request` listener, and every /socket.io/ handshake also hits Express's 404.
 */
export function createSocketServer(db: Db): Server {
  const io = new Server({
    cors: {
      origin: [env.FRONTEND_URL, "http://localhost:3000"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = tokenFromHandshake(socket);
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.auth = await verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId, role } = socket.auth!;
    socket.join(`user:${userId}`);
    if (role === "admin") socket.join("admins");
    logger.debug({ userId, role }, "socket connected");

    // Reconnect resilience: hand the client its live ride (if any) immediately
    try {
      const active = await getActiveRide(db, { id: userId, role });
      if (active) socket.emit("ride:sync", await getRideDetail(db, active));
    } catch (err) {
      logger.warn({ err, userId }, "ride:sync failed");
    }

    if (role === "driver") {
      let lastLocationAt = 0;

      socket.on("location:update", async (raw: unknown) => {
        const now = Date.now();
        if (now - lastLocationAt < LOCATION_THROTTLE_MS) return;
        const parsed = locationUpdateSchema.safeParse(raw);
        if (!parsed.success) return;
        lastLocationAt = now;

        try {
          const active = await updateDriverLocation(db, userId, parsed.data);
          if (active) {
            io.to(`user:${active.riderUserId}`).emit("driver:location", {
              rideId: active.rideId,
              lat: parsed.data.lat,
              lng: parsed.data.lng,
              heading: parsed.data.heading ?? null,
            });
          }
          // Live ops map: relay every online driver's position to admins.
          io.to("admins").emit("admin:driver_location", {
            driverUserId: userId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            heading: parsed.data.heading ?? null,
          });
        } catch (err) {
          logger.warn({ err, userId }, "location update failed");
        }
      });

      socket.on("disconnect", async () => {
        logger.debug({ userId }, "driver socket disconnected");
        try {
          // Go offline on disconnect — but never abandon an active ride assignment
          const [driver] = await db
            .select({ id: drivers.id })
            .from(drivers)
            .where(eq(drivers.userId, userId))
            .limit(1);
          if (!driver) return;
          const [activeRide] = await db
            .select({ id: rides.id })
            .from(rides)
            .where(
              and(
                eq(rides.driverId, driver.id),
                inArray(rides.status, ["accepted", "arrived", "in_progress"]),
              ),
            )
            .limit(1);
          if (!activeRide) {
            await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driver.id));
          }
        } catch (err) {
          logger.warn({ err, userId }, "driver disconnect handling failed");
        }
      });
    }
  });

  return io;
}

export type { RideNotifier };
