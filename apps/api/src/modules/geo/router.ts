import { Router } from "express";
import { z } from "zod";
import type { Coordinates } from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { requireAuth } from "../../middleware/auth.js";
import type { GeoProvider } from "./provider.js";

const searchQuery = z.object({
  q: z.string().trim().min(2).max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const reverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const routeQuery = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLng: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLng: z.coerce.number().min(-180).max(180),
});

export function geoRouter(db: Db, geo: GeoProvider): Router {
  const router = Router();

  // Authenticated: these proxy shared public OSM services — don't let the world use us as a mirror
  router.use(requireAuth(db));

  router.get("/search", async (req, res) => {
    const q = searchQuery.parse(req.query);
    const near: Coordinates | undefined =
      q.lat !== undefined && q.lng !== undefined ? [q.lng, q.lat] : undefined;
    const results = await geo.geocode(q.q, near);
    res.json({ success: true, data: { results } });
  });

  router.get("/reverse", async (req, res) => {
    const q = reverseQuery.parse(req.query);
    const address = await geo.reverseGeocode([q.lng, q.lat]);
    res.json({ success: true, data: { address } });
  });

  // Turn-by-turn geometry between two arbitrary points — used by the driver
  // app to draw the route to the pickup (their position changes, so this can't
  // reuse the ride's stored pickup→destination polyline).
  router.get("/route", async (req, res) => {
    const q = routeQuery.parse(req.query);
    const route = await geo.route([q.fromLng, q.fromLat], [q.toLng, q.toLat]);
    res.json({
      success: true,
      data: {
        polyline: route.polyline,
        distanceM: route.distanceM,
        durationS: route.durationS,
        degraded: route.degraded,
      },
    });
  });

  return router;
}
