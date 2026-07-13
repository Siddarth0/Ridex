import { Router } from "express";
import { z } from "zod";
import {
  cancelRideSchema,
  estimateRequestSchema,
  ratingSchema,
  rideRequestSchema,
} from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { GeoProvider } from "../geo/provider.js";
import { estimateAllTypes } from "../pricing/service.js";
import type { RideNotifier } from "./notify.js";
import { getRideDetail } from "./dto.js";
import {
  assertRideAccess,
  cancelRide,
  driverArrive,
  driverComplete,
  driverStart,
  getActiveRide,
  getRideOrThrow,
  listMyRides,
  requestRide,
} from "./service.js";
import { acceptOffer, declineOffer } from "../matching/dispatcher.js";
import { rateRide } from "./ratings.js";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export function ridesRouter(db: Db, geo: GeoProvider, notifier: RideNotifier): Router {
  const router = Router();
  router.use(requireAuth(db));

  // Fare preview for all ride types — no ride created
  router.post("/estimate", validate(estimateRequestSchema), async (req, res) => {
    const route = await geo.route(req.body.pickup, req.body.destination);
    const estimates = await estimateAllTypes(db, route.distanceM, route.durationS);
    res.json({
      success: true,
      data: {
        distanceM: route.distanceM,
        durationS: route.durationS,
        polyline: route.polyline,
        degraded: route.degraded,
        estimates,
      },
    });
  });

  router.post("/", requireRole("rider"), validate(rideRequestSchema), async (req, res) => {
    const ride = await requestRide(db, geo, req.user!.id, req.body);
    const detail = await getRideDetail(db, ride);
    res.status(201).json({
      success: true,
      data: { ride: { ...detail, estimateDegraded: ride.estimateDegraded } },
    });
  });

  router.get("/active", async (req, res) => {
    const ride = await getActiveRide(db, req.user!);
    res.json({
      success: true,
      data: { ride: ride ? await getRideDetail(db, ride) : null },
    });
  });

  router.get("/", async (req, res) => {
    const q = listQuery.parse(req.query);
    const rows = await listMyRides(db, req.user!, q.page, q.limit);
    const details = await Promise.all(rows.map((r) => getRideDetail(db, r)));
    res.json({ success: true, data: { rides: details, page: q.page, limit: q.limit } });
  });

  router.get("/:id", async (req, res) => {
    const ride = await getRideOrThrow(db, String(req.params.id));
    await assertRideAccess(db, ride, req.user!);
    res.json({ success: true, data: { ride: await getRideDetail(db, ride) } });
  });

  router.post("/:id/cancel", validate(cancelRideSchema), async (req, res) => {
    const ride = await cancelRide(db, notifier, req.user!, String(req.params.id), req.body.reason);
    res.json({ success: true, data: { ride } });
  });

  // ── Driver responses & lifecycle ──

  router.post("/:id/accept", requireRole("driver"), async (req, res) => {
    const ride = await acceptOffer(db, notifier, req.user!.id, String(req.params.id));
    const detail = await getRideDetail(db, ride);
    notifier.rideUpdate(ride.riderId, req.user!.id, detail);
    res.json({ success: true, data: { ride: detail } });
  });

  router.post("/:id/decline", requireRole("driver"), async (req, res) => {
    await declineOffer(db, req.user!.id, String(req.params.id));
    res.json({ success: true, data: { message: "Offer declined" } });
  });

  router.post("/:id/arrive", requireRole("driver"), async (req, res) => {
    const ride = await driverArrive(db, notifier, req.user!.id, String(req.params.id));
    res.json({ success: true, data: { ride } });
  });

  router.post("/:id/start", requireRole("driver"), async (req, res) => {
    const ride = await driverStart(db, notifier, req.user!.id, String(req.params.id));
    res.json({ success: true, data: { ride } });
  });

  router.post("/:id/complete", requireRole("driver"), async (req, res) => {
    const ride = await driverComplete(db, notifier, req.user!.id, String(req.params.id));
    res.json({ success: true, data: { ride } });
  });

  router.post("/:id/rating", validate(ratingSchema), async (req, res) => {
    const rating = await rateRide(db, req.user!.id, String(req.params.id), req.body);
    res.status(201).json({ success: true, data: { rating } });
  });

  return router;
}
