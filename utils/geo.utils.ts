// utils/geo.utils.ts
// Pure geolocation utility functions: Haversine distance, geohash encoding,
// and distance formatting. No Firebase or side-effect dependencies.

const EARTH_RADIUS_KM = 6371;

// ─── HAVERSINE ───────────────────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two GPS points using the
 * Haversine formula.
 *
 * @returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// ─── GEOHASH ─────────────────────────────────────────────────────────────────

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude into a geohash string.
 * Default precision of 9 gives ~5 m accuracy — good enough for city-level
 * proximity queries via GeoFirestore.
 */
export function encodeGeohash(
  lat: number,
  lon: number,
  precision: number = 9,
): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  let hash = '';
  let bit = 0;
  let idx = 0;
  let isLon = true;

  while (hash.length < precision) {
    const mid = isLon ? (lonMin + lonMax) / 2 : (latMin + latMax) / 2;
    const value = isLon ? lon : lat;

    if (value >= mid) {
      idx = idx * 2 + 1;
      if (isLon) lonMin = mid;
      else latMin = mid;
    } else {
      idx = idx * 2;
      if (isLon) lonMax = mid;
      else latMax = mid;
    }

    isLon = !isLon;
    bit++;

    if (bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return hash;
}

// ─── BOUNDING BOX ────────────────────────────────────────────────────────────

export interface IBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Calculate a bounding box around a center point given a radius in km.
 * Useful for pre-filtering users before applying Haversine.
 */
export function boundingBox(
  lat: number,
  lon: number,
  radiusKm: number,
): IBoundingBox {
  const latDelta = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI);
  const lonDelta =
    latDelta / Math.cos((lat * Math.PI) / 180);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

/**
 * Format a distance in km for display in the UI.
 * Under 1 km → shows meters (e.g. "850 m").
 * 1–10 km    → one decimal (e.g. "3,2 km").
 * 10+ km     → integer (e.g. "15 km").
 */
export function formatDistance(km: number): string {
  if (km < 0) return '0 m';

  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }

  if (km < 10) {
    return `${km.toFixed(1).replace('.', ',')} km`;
  }

  return `${Math.round(km)} km`;
}

/**
 * Check whether a point falls within a given radius of a center.
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusKm: number,
): boolean {
  return haversineDistance(centerLat, centerLon, pointLat, pointLon) <= radiusKm;
}
