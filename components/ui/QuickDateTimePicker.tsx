// components/ui/QuickDateTimePicker.tsx
// Lightweight date+time picker without native modals or external deps.
//   - Date row: chips for "Dziś", "Jutro", "Pojutrze".
//   - Time row: -30 / time / +30 stepper, snapping to 30-minute slots
//     between 06:00 and 22:00.
//
// Why not the native picker? On a "propose a quick training" form the
// user almost always wants something in the next 48 h, and a calendar
// modal is overkill. This is two taps; native picker is five.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/theme';

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface QuickDateTimePickerProps {
  value: Date;
  onChange: (next: Date) => void;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const TIME_STEP_MIN = 30;
const MIN_HOUR = 6;
const MAX_HOUR = 22;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function combineDateAndTime(day: Date, hours: number, minutes: number): Date {
  const out = new Date(day);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function clampToSlot(d: Date): Date {
  const out = new Date(d);
  let h = out.getHours();
  let m = Math.round(out.getMinutes() / TIME_STEP_MIN) * TIME_STEP_MIN;

  if (m === 60) {
    h += 1;
    m = 0;
  }
  if (h < MIN_HOUR) {
    h = MIN_HOUR;
    m = 0;
  } else if (h > MAX_HOUR || (h === MAX_HOUR && m > 0)) {
    h = MAX_HOUR;
    m = 0;
  }

  out.setHours(h, m, 0, 0);
  return out;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const DATE_CHIPS = [
  { label: 'Dziś', offset: 0 },
  { label: 'Jutro', offset: 1 },
  { label: 'Pojutrze', offset: 2 },
] as const;

function QuickDateTimePicker({ value, onChange }: QuickDateTimePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedDay = startOfDay(value);

  const handlePickDay = (offset: number) => {
    const day = addDays(today, offset);
    const next = clampToSlot(combineDateAndTime(day, value.getHours(), value.getMinutes()));
    onChange(next);
  };

  const adjustTime = (deltaMinutes: number) => {
    const next = new Date(value.getTime() + deltaMinutes * 60_000);
    // Don't allow rolling into the previous or next day via the stepper —
    // stays within MIN_HOUR..MAX_HOUR on the currently selected day.
    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    onChange(clampToSlot(next));
  };

  const canDecrement =
    value.getHours() > MIN_HOUR ||
    (value.getHours() === MIN_HOUR && value.getMinutes() >= TIME_STEP_MIN);
  const canIncrement = value.getHours() < MAX_HOUR;

  return (
    <View style={styles.container}>
      {/* Date chips */}
      <View style={styles.chipRow}>
        {DATE_CHIPS.map(({ label, offset }) => {
          const day = addDays(today, offset);
          const isActive = isSameDay(selectedDay, day);
          return (
            <Pressable
              key={label}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handlePickDay(offset)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Time stepper */}
      <View style={styles.timeRow}>
        <Pressable
          style={[styles.stepperButton, !canDecrement && styles.stepperButtonDisabled]}
          onPress={() => adjustTime(-TIME_STEP_MIN)}
          disabled={!canDecrement}
        >
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>

        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{formatTime(value)}</Text>
          <Text style={styles.timeSubtext}>co 30 min</Text>
        </View>

        <Pressable
          style={[styles.stepperButton, !canIncrement && styles.stepperButtonDisabled]}
          onPress={() => adjustTime(TIME_STEP_MIN)}
          disabled={!canIncrement}
        >
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default QuickDateTimePicker;

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: SPACING.lg,
  },

  // Date chips
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  chipTextActive: {
    color: COLORS.white,
  },

  // Time stepper
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  stepperButtonDisabled: {
    opacity: 0.3,
  },
  stepperGlyph: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '300',
    color: COLORS.gray700,
    lineHeight: FONT_SIZE.xxl,
  },
  timeDisplay: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '700',
    color: COLORS.gray900,
    fontVariant: ['tabular-nums'],
    lineHeight: FONT_SIZE.xxxl,
  },
  timeSubtext: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray500,
    marginTop: SPACING.xxs,
  },
});
