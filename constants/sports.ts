// constants/sports.ts
// Sport definitions for the Sprinter app.
// Each sport has a display label (PL), icon name, and negotiable condition fields.

import { SportType, LevelType } from '@/types';

// ─── SPORT CONFIG ────────────────────────────────────────────────────────────

export interface ISportConfig {
  key: SportType;
  label: string; // Polish display name
  icon: string; // Icon name (MaterialCommunityIcons)
  conditionFields: readonly string[]; // Which IActivityConditions fields are relevant
}

export const SPORTS: Record<SportType, ISportConfig> = {
  running: {
    key: 'running',
    label: 'Bieganie',
    icon: 'run',
    conditionFields: ['dateTime', 'locationName', 'pace', 'distance'],
  },
  cycling: {
    key: 'cycling',
    label: 'Rower',
    icon: 'bike',
    conditionFields: ['dateTime', 'locationName', 'speed', 'distance'],
  },
  tennis: {
    key: 'tennis',
    label: 'Tenis',
    icon: 'tennis',
    conditionFields: ['dateTime', 'locationName', 'duration', 'matchType'],
  },
  gym: {
    key: 'gym',
    label: 'Siłownia',
    icon: 'dumbbell',
    conditionFields: ['dateTime', 'locationName', 'duration', 'workoutType'],
  },
  climbing: {
    key: 'climbing',
    label: 'Wspinaczka',
    icon: 'carabiner',
    conditionFields: ['dateTime', 'locationName', 'duration', 'climbGrade'],
  },
};

// Ordered list for UI selectors
export const SPORT_LIST: ISportConfig[] = [
  SPORTS.running,
  SPORTS.cycling,
  SPORTS.tennis,
  SPORTS.gym,
  SPORTS.climbing,
];

// ─── LEVELS ──────────────────────────────────────────────────────────────────

export interface ILevelConfig {
  key: LevelType;
  label: string;
  description: string;
}

export const LEVELS: Record<LevelType, ILevelConfig> = {
  beginner: {
    key: 'beginner',
    label: 'Początkujący',
    description: 'Dopiero zaczynam lub trenuję mniej niż 6 miesięcy',
  },
  intermediate: {
    key: 'intermediate',
    label: 'Średniozaawansowany',
    description: 'Regularne treningi od ponad 6 miesięcy',
  },
  advanced: {
    key: 'advanced',
    label: 'Zaawansowany',
    description: 'Wieloletnie doświadczenie, starty w zawodach',
  },
};

export const LEVEL_LIST: ILevelConfig[] = [
  LEVELS.beginner,
  LEVELS.intermediate,
  LEVELS.advanced,
];

// ─── LIMITS ──────────────────────────────────────────────────────────────────

export const MAX_DISTANCE_KM = 50;
export const DEFAULT_RADIUS_KM = 10;
export const MAX_BIO_LENGTH = 160;
export const MAX_MESSAGE_LENGTH = 1000;
