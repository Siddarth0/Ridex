/** Pure geo math — no I/O, unit-tested. */

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)));
}

/** Straight-line → road distance approximation when routing is unavailable. */
export const ROAD_FACTOR = 1.4;

/** City average speed used for degraded ETA estimates. */
export const CITY_SPEED_KMH = 22;

export function degradedRoute(lat1: number, lng1: number, lat2: number, lng2: number) {
  const distanceM = Math.round(haversineM(lat1, lng1, lat2, lng2) * ROAD_FACTOR);
  const durationS = Math.round((distanceM / 1000 / CITY_SPEED_KMH) * 3600);
  return { distanceM, durationS, polyline: null, degraded: true as const };
}
