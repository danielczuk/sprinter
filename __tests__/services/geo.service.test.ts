// __tests__/services/geo.service.test.ts

// ─── MOCKS ───────────────────────────────────────────────────────────────────

const mockRequestPerm = jest.fn();
const mockGetPerm = jest.fn();
const mockGetPosition = jest.fn();

jest.mock('expo-location', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  Accuracy: {
    Balanced: 4,
  },
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestPerm(...args),
  getForegroundPermissionsAsync: (...args: unknown[]) => mockGetPerm(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetPosition(...args),
}));

const mockGetUsersBySport = jest.fn();
const mockUpdateUserLocation = jest.fn();
jest.mock('../../services/users.service', () => ({
  getUsersBySport: (...args: unknown[]) => mockGetUsersBySport(...args),
  updateUserLocation: (...args: unknown[]) => mockUpdateUserLocation(...args),
}));

// firebase/firestore — only GeoPoint is used directly here.
jest.mock('firebase/firestore', () => {
  class GeoPoint {
    latitude: number;
    longitude: number;
    constructor(lat: number, lon: number) {
      this.latitude = lat;
      this.longitude = lon;
    }
  }
  return { GeoPoint };
});

import {
  requestLocationPermission,
  getLocationPermissionStatus,
  getCurrentLocation,
  findNearbyPartners,
  updateMyLocation,
  coordsFromGeoPoint,
} from '../../services/geo.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeUser(
  id: string,
  lat: number,
  lon: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    userId: id,
    name: `User ${id}`,
    sport: 'running' as const,
    level: 'intermediate' as const,
    location: { latitude: lat, longitude: lon },
    geohash: 'u3q',
    bio: '',
    stats: {},
    blocked: [],
    lastActive: { seconds: 0, nanoseconds: 0 },
    createdAt: { seconds: 0, nanoseconds: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── PERMISSION ──────────────────────────────────────────────────────────────

describe('requestLocationPermission', () => {
  it('returns "granted" when expo-location grants', async () => {
    mockRequestPerm.mockResolvedValue({ status: 'granted' });
    expect(await requestLocationPermission()).toBe('granted');
  });

  it('returns "denied" when expo-location denies', async () => {
    mockRequestPerm.mockResolvedValue({ status: 'denied' });
    expect(await requestLocationPermission()).toBe('denied');
  });

  it('returns "undetermined" for any other status', async () => {
    mockRequestPerm.mockResolvedValue({ status: 'something-else' });
    expect(await requestLocationPermission()).toBe('undetermined');
  });
});

describe('getLocationPermissionStatus', () => {
  it('reads current status without prompting', async () => {
    mockGetPerm.mockResolvedValue({ status: 'granted' });
    expect(await getLocationPermissionStatus()).toBe('granted');
    expect(mockRequestPerm).not.toHaveBeenCalled();
  });
});

// ─── GPS ─────────────────────────────────────────────────────────────────────

describe('getCurrentLocation', () => {
  it('returns null when permission is not granted', async () => {
    mockGetPerm.mockResolvedValue({ status: 'denied' });
    expect(await getCurrentLocation()).toBeNull();
    expect(mockGetPosition).not.toHaveBeenCalled();
  });

  it('returns coords when permission granted and GPS resolves', async () => {
    mockGetPerm.mockResolvedValue({ status: 'granted' });
    mockGetPosition.mockResolvedValue({
      coords: { latitude: 52.23, longitude: 21.01 },
    });

    expect(await getCurrentLocation()).toEqual({ lat: 52.23, lon: 21.01 });
  });

  it('returns null when getCurrentPositionAsync throws', async () => {
    mockGetPerm.mockResolvedValue({ status: 'granted' });
    mockGetPosition.mockRejectedValue(new Error('No GPS'));

    expect(await getCurrentLocation()).toBeNull();
  });
});

// ─── FIND NEARBY ─────────────────────────────────────────────────────────────

describe('findNearbyPartners', () => {
  const center = { lat: 52.2297, lon: 21.0122 }; // Warsaw

  it('returns users within radius sorted by distance', async () => {
    mockGetUsersBySport.mockResolvedValue([
      // Far — Kraków, ~250 km away. Should be excluded.
      makeUser('far', 50.0647, 19.945),
      // Close — ~2 km away.
      makeUser('mid', 52.245, 21.02),
      // Closer — ~0.3 km away.
      makeUser('near', 52.232, 21.014),
    ]);

    const result = await findNearbyPartners(center.lat, center.lon, {
      sport: 'running',
      radiusKm: 5,
    });

    expect(result.map((u) => u.userId)).toEqual(['near', 'mid']);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });

  it('excludes users in excludeIds', async () => {
    mockGetUsersBySport.mockResolvedValue([
      makeUser('a', 52.232, 21.014),
      makeUser('b', 52.231, 21.013),
    ]);

    const result = await findNearbyPartners(center.lat, center.lon, {
      sport: 'running',
      radiusKm: 5,
      excludeIds: ['a'],
    });

    expect(result.map((u) => u.userId)).toEqual(['b']);
  });

  it('skips users with missing or malformed coords', async () => {
    mockGetUsersBySport.mockResolvedValue([
      makeUser('ok', 52.232, 21.014),
      makeUser('bad', 0, 0, { location: null }),
      makeUser('bad2', 0, 0, { location: { latitude: 'nope', longitude: 0 } }),
    ]);

    const result = await findNearbyPartners(center.lat, center.lon, {
      sport: 'running',
      radiusKm: 5,
    });

    expect(result.map((u) => u.userId)).toEqual(['ok']);
  });

  it('passes the sport filter through to users.service', async () => {
    mockGetUsersBySport.mockResolvedValue([]);

    await findNearbyPartners(center.lat, center.lon, {
      sport: 'climbing',
      radiusKm: 3,
    });

    expect(mockGetUsersBySport).toHaveBeenCalledWith('climbing');
  });
});

// ─── UPDATE LOCATION ─────────────────────────────────────────────────────────

describe('updateMyLocation', () => {
  it('builds a GeoPoint, encodes geohash and forwards to users.service', async () => {
    await updateMyLocation('user1', { lat: 52.23, lon: 21.01 });

    expect(mockUpdateUserLocation).toHaveBeenCalledTimes(1);
    const [userId, geoPoint, geohash] = mockUpdateUserLocation.mock.calls[0];

    expect(userId).toBe('user1');
    expect(geoPoint).toEqual(
      expect.objectContaining({ latitude: 52.23, longitude: 21.01 }),
    );
    expect(typeof geohash).toBe('string');
    // Warsaw geohash starts with "u3" (u3q-u3r area).
    expect(geohash.startsWith('u3')).toBe(true);
  });
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

describe('coordsFromGeoPoint', () => {
  it('returns coords from a Firestore-shaped GeoPoint', () => {
    expect(coordsFromGeoPoint({ latitude: 1, longitude: 2 })).toEqual({
      lat: 1,
      lon: 2,
    });
  });

  it('returns null on null/undefined or malformed input', () => {
    expect(coordsFromGeoPoint(null)).toBeNull();
    expect(coordsFromGeoPoint(undefined)).toBeNull();
    expect(coordsFromGeoPoint({ latitude: 'no', longitude: 0 } as any)).toBeNull();
  });
});
