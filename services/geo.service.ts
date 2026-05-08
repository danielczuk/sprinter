// services/geo.service.ts
// Geolocation service — wraps two concerns:
//   1) Device GPS access via expo-location (permission, current position).
//   2) Firestore-side geo queries (find nearby partners, update self location).
//
// Per CLAUDE.md, location is only read when the app is opened — never in the
// background. Hooks that consume this service must not poll.

import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';

import { getUsersBySport, updateUserLocation } from '@/services/users.service';
import {
  haversineDistance,
  encodeGeohash,
  boundingBox,
} from '@/utils/geo.utils';
import { IUser, IUserWithDistance, SportType } from '@/types';

// ─── COORDINATES ─────────────────────────────────────────────────────────────

export interface ICoords {
  lat: number;
  lon: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ─── DEVICE GPS ──────────────────────────────────────────────────────────────

/**
 * Ask the user for foreground location permission.
 * Returns the resulting status — does NOT throw on denial.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/**
 * Read the current foreground location permission status without prompting.
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/**
 * Get the device's current GPS position.
 * Returns null if permission was denied or the position couldn't be acquired.
 *
 * Uses Balanced accuracy — fine enough for "partners within 5 km" and
 * cheaper on battery than High.
 */
export async function getCurrentLocation(): Promise<ICoords | null> {
  try {
    const status = await getLocationPermissionStatus();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
    };
  } catch {
    // expo-location can throw on emulators without GPS, in dev tools, etc.
    return null;
  }
}

// ─── FIRESTORE QUERIES ───────────────────────────────────────────────────────

export interface IFindNearbyOptions {
  /** Discipline filter — required (one sport per query). */
  sport: SportType;
  /** Search radius in kilometers. */
  radiusKm: number;
  /** UserIds to exclude (e.g. self, blocked users). */
  excludeIds?: string[];
}

/**
 * Find users practising a given sport within a radius of a center point.
 *
 * Strategy: pull all users matching the sport (already cheap with the
 * existing where('sport', '==', ...) index), then post-filter with a
 * bounding-box check followed by a precise Haversine. The bounding-box
 * step is a fast pre-filter that skips most far-away users without doing
 * the full trig math. Results are sorted ascending by distance.
 *
 * For MVP scale (hundreds of users per sport in a city) this is plenty.
 * If/when the user base grows, swap in geohash range queries here without
 * touching the call sites.
 */
export async function findNearbyPartners(
  currentLat: number,
  currentLon: number,
  options: IFindNearbyOptions,
): Promise<IUserWithDistance[]> {
  const { sport, radiusKm, excludeIds = [] } = options;

  const bbox = boundingBox(currentLat, currentLon, radiusKm);
  const exclude = new Set(excludeIds);

  const users = await getUsersBySport(sport);

  const withDistance: IUserWithDistance[] = [];
  for (const user of users) {
    if (exclude.has(user.userId)) continue;

    const lat = user.location?.latitude;
    const lon = user.location?.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    // Bounding-box pre-filter
    if (lat < bbox.minLat || lat > bbox.maxLat) continue;
    if (lon < bbox.minLon || lon > bbox.maxLon) continue;

    // Precise Haversine
    const distanceKm = haversineDistance(currentLat, currentLon, lat, lon);
    if (distanceKm > radiusKm) continue;

    withDistance.push({ ...user, distanceKm });
  }

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance;
}

/**
 * Update the current user's stored location and geohash.
 * Geohash is computed locally from lat/lon — saves a round trip and keeps
 * the encoding deterministic (same lat/lon always produces the same hash).
 */
export async function updateMyLocation(
  userId: string,
  coords: ICoords,
): Promise<void> {
  const geohash = encodeGeohash(coords.lat, coords.lon);
  const geoPoint = new GeoPoint(coords.lat, coords.lon);
  await updateUserLocation(userId, geoPoint, geohash);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Convenience: extract numeric coordinates from a Firestore GeoPoint or any
 * object exposing `latitude`/`longitude`. Returns null if the input is invalid.
 */
export function coordsFromGeoPoint(
  geo: { latitude?: number; longitude?: number } | null | undefined,
): ICoords | null {
  if (!geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
    return null;
  }
  return { lat: geo.latitude, lon: geo.longitude };
}

// Re-export the user-shaped types so consumers don't need both imports.
export type { IUser, IUserWithDistance };
