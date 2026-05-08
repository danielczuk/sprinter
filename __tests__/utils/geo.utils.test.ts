// __tests__/utils/geo.utils.test.ts

import {
  haversineDistance,
  encodeGeohash,
  boundingBox,
  formatDistance,
  isWithinRadius,
} from '../../utils/geo.utils';

// ─── HAVERSINE ───────────────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(52.2297, 21.0122, 52.2297, 21.0122)).toBe(0);
  });

  it('calculates Warsaw → Kraków (~252 km)', () => {
    // Warsaw: 52.2297, 21.0122 | Kraków: 50.0647, 19.9450
    const dist = haversineDistance(52.2297, 21.0122, 50.0647, 19.945);
    expect(dist).toBeGreaterThan(250);
    expect(dist).toBeLessThan(260);
  });

  it('calculates short distance (~1 km in Warsaw)', () => {
    // Two points ~1 km apart in central Warsaw
    const dist = haversineDistance(52.2297, 21.0122, 52.2387, 21.0122);
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(1.1);
  });

  it('handles cross-hemisphere distances', () => {
    // New York to Sydney
    const dist = haversineDistance(40.7128, -74.006, -33.8688, 151.2093);
    expect(dist).toBeGreaterThan(15_000);
    expect(dist).toBeLessThan(16_500);
  });
});

// ─── GEOHASH ─────────────────────────────────────────────────────────────────

describe('encodeGeohash', () => {
  it('encodes Warsaw center correctly (precision 9)', () => {
    const hash = encodeGeohash(52.2297, 21.0122);
    expect(hash).toHaveLength(9);
    // Warsaw geohash starts with "u3q"
    expect(hash.startsWith('u3q')).toBe(true);
  });

  it('encodes with custom precision', () => {
    const hash = encodeGeohash(52.2297, 21.0122, 5);
    expect(hash).toHaveLength(5);
  });

  it('nearby points share a geohash prefix', () => {
    const hash1 = encodeGeohash(52.2297, 21.0122, 7);
    const hash2 = encodeGeohash(52.2300, 21.0125, 7);
    // Points ~30m apart should share at least 6 chars
    expect(hash1.substring(0, 6)).toBe(hash2.substring(0, 6));
  });

  it('distant points have different prefixes', () => {
    const warsaw = encodeGeohash(52.2297, 21.0122, 5);
    const krakow = encodeGeohash(50.0647, 19.945, 5);
    expect(warsaw).not.toBe(krakow);
  });
});

// ─── BOUNDING BOX ────────────────────────────────────────────────────────────

describe('boundingBox', () => {
  it('returns a box centered around the point', () => {
    const box = boundingBox(52.2297, 21.0122, 10);

    expect(box.minLat).toBeLessThan(52.2297);
    expect(box.maxLat).toBeGreaterThan(52.2297);
    expect(box.minLon).toBeLessThan(21.0122);
    expect(box.maxLon).toBeGreaterThan(21.0122);
  });

  it('larger radius produces a larger box', () => {
    const small = boundingBox(52.2297, 21.0122, 5);
    const large = boundingBox(52.2297, 21.0122, 20);

    expect(large.maxLat - large.minLat).toBeGreaterThan(
      small.maxLat - small.minLat,
    );
  });

  it('10km box spans roughly 0.18° latitude', () => {
    const box = boundingBox(0, 0, 10);
    const latSpan = box.maxLat - box.minLat;
    // 10 km ≈ 0.09° each side → ~0.18° total
    expect(latSpan).toBeGreaterThan(0.15);
    expect(latSpan).toBeLessThan(0.20);
  });
});

// ─── FORMAT DISTANCE ─────────────────────────────────────────────────────────

describe('formatDistance', () => {
  it('formats sub-kilometer as meters', () => {
    expect(formatDistance(0.85)).toBe('850 m');
    expect(formatDistance(0.1)).toBe('100 m');
  });

  it('formats 1-10 km with one decimal', () => {
    expect(formatDistance(3.2)).toBe('3,2 km');
    expect(formatDistance(1.0)).toBe('1,0 km');
  });

  it('formats 10+ km as integer', () => {
    expect(formatDistance(15.7)).toBe('16 km');
    expect(formatDistance(42.195)).toBe('42 km');
  });

  it('handles zero and negative', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(-5)).toBe('0 m');
  });
});

// ─── IS WITHIN RADIUS ───────────────────────────────────────────────────────

describe('isWithinRadius', () => {
  it('returns true for points within radius', () => {
    // Two points ~1 km apart, radius 5 km
    expect(isWithinRadius(52.2297, 21.0122, 52.2387, 21.0122, 5)).toBe(true);
  });

  it('returns true for the same point', () => {
    expect(isWithinRadius(52.2297, 21.0122, 52.2297, 21.0122, 1)).toBe(true);
  });

  it('returns false for points outside radius', () => {
    // Warsaw to Kraków (~252 km), radius 50 km
    expect(isWithinRadius(52.2297, 21.0122, 50.0647, 19.945, 50)).toBe(false);
  });
});
