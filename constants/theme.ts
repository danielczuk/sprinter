// constants/theme.ts
// Design tokens for the Sprinter app.
// Single source of truth for colors, typography, spacing, and layout.

// ─── COLORS ──────────────────────────────────────────────────────────────────

export const COLORS = {
  // Primary — energetic green (sport / action)
  primary: '#22C55E',
  primaryLight: '#86EFAC',
  primaryDark: '#15803D',

  // Secondary — deep navy (trust / stability)
  secondary: '#1E3A5F',
  secondaryLight: '#3B6FA0',
  secondaryDark: '#0F1F33',

  // Accent — warm orange (notifications / highlights)
  accent: '#F97316',
  accentLight: '#FDBA74',

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',

  // Semantic
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#3B82F6',

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  card: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const FONT_FAMILY = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ─── SPACING ─────────────────────────────────────────────────────────────────

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── SHADOWS (React Native format) ──────────────────────────────────────────

export const SHADOW = {
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

export const LAYOUT = {
  screenPaddingH: SPACING.lg,
  cardPaddingH: SPACING.lg,
  cardPaddingV: SPACING.md,
  bottomTabHeight: 64,
  headerHeight: 56,
} as const;
