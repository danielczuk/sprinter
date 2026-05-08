// __tests__/utils/format.utils.test.ts

import {
  formatPace,
  parsePace,
  formatPaceWithUnit,
  formatDuration,
  formatTrainingDistance,
  formatSpeed,
  formatActivityDate,
  formatTime,
  formatLastActive,
} from '../../utils/format.utils';

// ─── PACE ────────────────────────────────────────────────────────────────────

describe('formatPace', () => {
  it('formats round minutes', () => {
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(360)).toBe('6:00');
  });

  it('formats with seconds', () => {
    expect(formatPace(325)).toBe('5:25');
    expect(formatPace(270)).toBe('4:30');
  });

  it('pads seconds to two digits', () => {
    expect(formatPace(305)).toBe('5:05');
  });

  it('handles zero and negative', () => {
    expect(formatPace(0)).toBe('0:00');
    expect(formatPace(-10)).toBe('0:00');
  });
});

describe('parsePace', () => {
  it('parses valid pace strings', () => {
    expect(parsePace('5:00')).toBe(300);
    expect(parsePace('5:25')).toBe(325);
    expect(parsePace('4:30')).toBe(270);
  });

  it('returns null for invalid formats', () => {
    expect(parsePace('abc')).toBeNull();
    expect(parsePace('5')).toBeNull();
    expect(parsePace('5:600')).toBeNull();
    expect(parsePace('')).toBeNull();
  });

  it('returns null for seconds >= 60', () => {
    expect(parsePace('5:60')).toBeNull();
    expect(parsePace('5:99')).toBeNull();
  });
});

describe('formatPaceWithUnit', () => {
  it('appends min/km', () => {
    expect(formatPaceWithUnit(300)).toBe('5:00 min/km');
    expect(formatPaceWithUnit(325)).toBe('5:25 min/km');
  });
});

// ─── DURATION ────────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats minutes under 60', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(30)).toBe('30 min');
  });

  it('formats exact hours', () => {
    expect(formatDuration(60)).toBe('1 godz.');
    expect(formatDuration(120)).toBe('2 godz.');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1 godz. 30 min');
    expect(formatDuration(150)).toBe('2 godz. 30 min');
  });

  it('handles zero and negative', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(-5)).toBe('0 min');
  });
});

// ─── TRAINING DISTANCE ──────────────────────────────────────────────────────

describe('formatTrainingDistance', () => {
  it('formats integer distances', () => {
    expect(formatTrainingDistance(5)).toBe('5 km');
    expect(formatTrainingDistance(10)).toBe('10 km');
  });

  it('formats decimal distances with Polish comma', () => {
    expect(formatTrainingDistance(10.5)).toBe('10,5 km');
    expect(formatTrainingDistance(21.1)).toBe('21,1 km');
  });

  it('handles zero and negative', () => {
    expect(formatTrainingDistance(0)).toBe('0 km');
    expect(formatTrainingDistance(-3)).toBe('0 km');
  });
});

// ─── SPEED ───────────────────────────────────────────────────────────────────

describe('formatSpeed', () => {
  it('formats integer speed', () => {
    expect(formatSpeed(25)).toBe('25 km/h');
  });

  it('formats decimal speed with Polish comma', () => {
    expect(formatSpeed(30.5)).toBe('30,5 km/h');
  });

  it('handles zero and negative', () => {
    expect(formatSpeed(0)).toBe('0 km/h');
    expect(formatSpeed(-10)).toBe('0 km/h');
  });
});

// ─── DATE / TIME ─────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats time as HH:MM', () => {
    expect(formatTime(new Date(2026, 0, 1, 14, 30))).toBe('14:30');
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toBe('09:05');
    expect(formatTime(new Date(2026, 0, 1, 0, 0))).toBe('00:00');
  });
});

describe('formatActivityDate', () => {
  const now = new Date(2026, 3, 5, 10, 0); // 5 April 2026, 10:00

  it('shows "Dziś" for today', () => {
    const today = new Date(2026, 3, 5, 18, 30);
    expect(formatActivityDate(today, now)).toBe('Dziś, 18:30');
  });

  it('shows "Jutro" for tomorrow', () => {
    const tomorrow = new Date(2026, 3, 6, 14, 0);
    expect(formatActivityDate(tomorrow, now)).toBe('Jutro, 14:00');
  });

  it('shows "Wczoraj" for yesterday', () => {
    const yesterday = new Date(2026, 3, 4, 9, 0);
    expect(formatActivityDate(yesterday, now)).toBe('Wczoraj, 09:00');
  });

  it('shows full date for other days', () => {
    const future = new Date(2026, 3, 8, 16, 30); // Wednesday, April 8
    const result = formatActivityDate(future, now);
    expect(result).toContain('Środa');
    expect(result).toContain('8 kwietnia');
    expect(result).toContain('16:30');
  });
});

describe('formatLastActive', () => {
  const now = new Date(2026, 3, 5, 10, 0);

  it('shows "teraz" for just now', () => {
    const justNow = new Date(2026, 3, 5, 9, 59, 45);
    expect(formatLastActive(justNow, now)).toBe('teraz');
  });

  it('shows minutes for < 1 hour', () => {
    const fiveMinAgo = new Date(2026, 3, 5, 9, 55);
    expect(formatLastActive(fiveMinAgo, now)).toBe('5 min temu');
  });

  it('shows hours for < 24 hours', () => {
    const threeHoursAgo = new Date(2026, 3, 5, 7, 0);
    expect(formatLastActive(threeHoursAgo, now)).toBe('3 godz. temu');
  });

  it('shows "wczoraj" for 24-48 hours', () => {
    const yesterday = new Date(2026, 3, 4, 10, 0);
    expect(formatLastActive(yesterday, now)).toBe('wczoraj');
  });

  it('shows days for older dates', () => {
    const threeDaysAgo = new Date(2026, 3, 2, 10, 0);
    expect(formatLastActive(threeDaysAgo, now)).toBe('3 dni temu');
  });
});
