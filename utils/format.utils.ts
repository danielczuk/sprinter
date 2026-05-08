// utils/format.utils.ts
// Pure formatting helpers for the Sprinter app.
// All functions are locale-aware (Polish conventions: comma as decimal separator).

// ─── PACE ────────────────────────────────────────────────────────────────────

/**
 * Format a pace value (min/km) from total seconds per km.
 * E.g. 300 → "5:00", 325 → "5:25"
 */
export function formatPace(totalSecondsPerKm: number): string {
  if (totalSecondsPerKm <= 0) return '0:00';

  const minutes = Math.floor(totalSecondsPerKm / 60);
  const seconds = Math.round(totalSecondsPerKm % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parse a pace string like "5:25" into total seconds per km.
 * Returns null if the input is not a valid pace string.
 */
export function parsePace(pace: string): number | null {
  const match = pace.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);

  if (seconds >= 60) return null;

  return minutes * 60 + seconds;
}

/**
 * Format pace for display with unit.
 * E.g. 300 → "5:00 min/km"
 */
export function formatPaceWithUnit(totalSecondsPerKm: number): string {
  return `${formatPace(totalSecondsPerKm)} min/km`;
}

// ─── DURATION ────────────────────────────────────────────────────────────────

/**
 * Format a duration in minutes for display.
 * Under 60 min → "45 min"
 * 60+         → "1 godz. 30 min" or "2 godz."
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (remaining === 0) {
    return `${hours} godz.`;
  }

  return `${hours} godz. ${remaining} min`;
}

// ─── DISTANCE (km) ──────────────────────────────────────────────────────────

/**
 * Format a training distance in km.
 * E.g. 5 → "5 km", 10.5 → "10,5 km", 21.1 → "21,1 km"
 */
export function formatTrainingDistance(km: number): string {
  if (km <= 0) return '0 km';

  if (Number.isInteger(km)) {
    return `${km} km`;
  }

  return `${km.toFixed(1).replace('.', ',')} km`;
}

// ─── SPEED ───────────────────────────────────────────────────────────────────

/**
 * Format speed for display.
 * E.g. 25 → "25 km/h", 30.5 → "30,5 km/h"
 */
export function formatSpeed(kmh: number): string {
  if (kmh <= 0) return '0 km/h';

  if (Number.isInteger(kmh)) {
    return `${kmh} km/h`;
  }

  return `${kmh.toFixed(1).replace('.', ',')} km/h`;
}

// ─── DATE / TIME ─────────────────────────────────────────────────────────────

const DAYS_PL = [
  'niedziela',
  'poniedziałek',
  'wtorek',
  'środa',
  'czwartek',
  'piątek',
  'sobota',
] as const;

const MONTHS_PL = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

/**
 * Format a date for activity display.
 * E.g. "środa, 5 marca" or "jutro, 14:30"
 */
export function formatActivityDate(date: Date, now: Date = new Date()): string {
  const diff = daysDifference(now, date);
  const time = formatTime(date);

  if (diff === 0) return `Dziś, ${time}`;
  if (diff === 1) return `Jutro, ${time}`;
  if (diff === -1) return `Wczoraj, ${time}`;

  const dayName = DAYS_PL[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_PL[date.getMonth()];

  return `${capitalize(dayName)}, ${day} ${month}, ${time}`;
}

/**
 * Format time as HH:MM.
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * "Ostatnio aktywny" — relative time for user cards.
 * E.g. "teraz", "5 min temu", "2 godz. temu", "wczoraj"
 */
export function formatLastActive(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'teraz';
  if (diffMin < 60) return `${diffMin} min temu`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} godz. temu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'wczoraj';

  return `${diffDays} dni temu`;
}

// ─── HELPERS (private) ───────────────────────────────────────────────────────

function daysDifference(from: Date, to: Date): number {
  const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const toStart = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toStart.getTime() - fromStart.getTime()) / 86_400_000);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
