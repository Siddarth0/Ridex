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

  return router;
}
