import type { Coordinates } from "@ridex/shared";
import { NEPAL_BBOX } from "@ridex/shared";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { degradedRoute } from "../../lib/geo.js";

export interface RouteResult {
  distanceM: number;
  durationS: number;
  /** Encoded polyline (precision 5), null when degraded to haversine. */
  polyline: string | null;
  /** True when the routing provider was unavailable and we fell back. */
  degraded: boolean;
}

export interface GeocodeResult {
  name: string;
  address: string;
  coordinates: Coordinates; // [lng, lat]
}

export interface GeoProvider {
  route(from: Coordinates, to: Coordinates): Promise<RouteResult>;
  geocode(query: string, near?: Coordinates): Promise<GeocodeResult[]>;
  reverseGeocode(point: Coordinates): Promise<string>;
}

const HTTP_TIMEOUT_MS = 5_000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

/** Tiny LRU with TTL for geocode results — Kathmandu queries repeat heavily. */
class LruCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(
    private maxSize: number,
    private ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V): void {
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number; geometry: string }[];
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
  };
}

function photonAddress(p: PhotonFeature["properties"]): string {
  return [p.name, p.street, p.district, p.city ?? p.state].filter(Boolean).join(", ");
}

class OsmGeoProvider implements GeoProvider {
  private geocodeCache = new LruCache<GeocodeResult[]>(500, 60 * 60 * 1000);
  private reverseCache = new LruCache<string>(500, 60 * 60 * 1000);

  async route(from: Coordinates, to: Coordinates): Promise<RouteResult> {
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    try {
      // OSRM's driving profile optimizes for travel time, so its top route can
      // be longer in distance than necessary. Ask for alternatives and pick the
      // shortest by distance — the fare is distance-led, so this is the fair
      // (cheapest reasonable) route for the rider. OSRM demo server: fine for
      // dev and launch traffic; self-host when quota hurts.
      const url =
        `${env.OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}` +
        `?overview=full&geometries=polyline&alternatives=3`;
      const data = (await fetchJson(url)) as OsrmResponse;
      if (data.code !== "Ok" || !data.routes?.length) throw new Error(`OSRM code ${data.code}`);
      const route = data.routes.reduce((best, r) => (r.distance < best.distance ? r : best));
      return {
        distanceM: Math.round(route.distance),
        durationS: Math.round(route.duration),
        polyline: route.geometry,
        degraded: false,
      };
    } catch (err) {
      logger.warn({ err }, "routing unavailable, falling back to haversine");
      return degradedRoute(fromLat, fromLng, toLat, toLng);
    }
  }

  async geocode(query: string, near?: Coordinates): Promise<GeocodeResult[]> {
    const key = `${query}|${near?.join(",") ?? ""}`;
    const cached = this.geocodeCache.get(key);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: query,
      limit: "6",
      bbox: `${NEPAL_BBOX.minLng},${NEPAL_BBOX.minLat},${NEPAL_BBOX.maxLng},${NEPAL_BBOX.maxLat}`,
    });
    if (near) {
      params.set("lon", String(near[0]));
      params.set("lat", String(near[1]));
    }
    const data = (await fetchJson(`${env.PHOTON_URL}/api?${params}`)) as {
      features: PhotonFeature[];
    };
    const results = data.features.map((f) => ({
      name: f.properties.name ?? photonAddress(f.properties),
      address: photonAddress(f.properties),
      coordinates: f.geometry.coordinates as Coordinates,
    }));
    this.geocodeCache.set(key, results);
    return results;
  }

  async reverseGeocode(point: Coordinates): Promise<string> {
    // ~11m precision is plenty for an address label and makes the cache useful
    const key = `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
    const cached = this.reverseCache.get(key);
    if (cached) return cached;

    const data = (await fetchJson(
      `${env.PHOTON_URL}/reverse?lon=${point[0]}&lat=${point[1]}`,
    )) as { features: PhotonFeature[] };
    const first = data.features[0];
    const address = first ? photonAddress(first.properties) : "Dropped pin";
    this.reverseCache.set(key, address);
    return address;
  }
}

export function createGeoProvider(): GeoProvider {
  return new OsmGeoProvider();
}
