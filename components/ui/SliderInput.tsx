// components/ui/SliderInput.tsx
// A self-contained horizontal slider built on PanResponder — no native
// dependency. Uses an absolutely-positioned thumb on a track whose width
// is measured at runtime via onLayout.
//
// Design choices:
//   - Tooltip above the thumb appears only while dragging (Animated opacity).
//   - Filled portion of the track is the accent color, unfilled is gray.
//   - Step snapping happens in the gesture handler so the parent always
//     receives a clean integer multiple of `step`.

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/theme';

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface SliderInputProps {
  label: string;
  min: number;
  max: number;
  /** Snap increment. Defaults to 1. */
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** Format the value for the inline header and tooltip. */
  formatValue?: (value: number) => string;
  /** Accent color for filled track + tooltip. Defaults to theme primary. */
  accentColor?: string;
  /** Optional caption shown under the label (e.g. "min/km"). */
  unitLabel?: string;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 6;
const TOOLTIP_OFFSET = 36;

function SliderInput({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
  accentColor = COLORS.primary,
  unitLabel,
}: SliderInputProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Refs so the PanResponder closure (created once) sees latest values.
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Animated tooltip opacity.
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tooltipOpacity, {
      toValue: isDragging ? 1 : 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [isDragging, tooltipOpacity]);

  const computeValueFromX = (x: number): number => {
    const w = trackWidthRef.current;
    if (w <= 0) return min;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    // Avoid float drift from step math.
    return Math.max(min, Math.min(max, Number(snapped.toFixed(6))));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          setIsDragging(true);
          onChangeRef.current(computeValueFromX(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e) => {
          onChangeRef.current(computeValueFromX(e.nativeEvent.locationX));
        },
        onPanResponderRelease: () => setIsDragging(false),
        onPanResponderTerminate: () => setIsDragging(false),
      }),
    // panResponder shouldn't change when min/max/step do — closure reads via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Clamp display value in case the parent passes something out of range.
  const safeValue = Math.max(min, Math.min(max, value));
  const ratio = (safeValue - min) / (max - min || 1);
  const thumbX = ratio * trackWidth;

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      {/* Header — label on the left, value on the right */}
      <View style={styles.header}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>{label}</Text>
          {unitLabel ? <Text style={styles.unit}>{unitLabel}</Text> : null}
        </View>
        <Text style={[styles.value, { color: accentColor }]}>{formatValue(safeValue)}</Text>
      </View>

      {/* Slider area */}
      <View style={styles.sliderArea} {...panResponder.panHandlers}>
        {/* Track */}
        <View style={styles.track} onLayout={handleLayout}>
          <View style={[styles.fill, { width: thumbX, backgroundColor: accentColor }]} />
        </View>

        {/* Thumb (absolutely positioned over the track) */}
        <View
          style={[
            styles.thumb,
            {
              left: thumbX - THUMB_SIZE / 2,
              borderColor: accentColor,
            },
          ]}
          pointerEvents="none"
        />

        {/* Tooltip — only visible while dragging */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: thumbX - 30,
              opacity: tooltipOpacity,
              backgroundColor: accentColor,
            },
          ]}
        >
          <Text style={styles.tooltipText}>{formatValue(safeValue)}</Text>
        </Animated.View>
      </View>

      {/* min/max axis labels */}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{formatValue(min)}</Text>
        <Text style={styles.axisLabel}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

export default SliderInput;

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  unit: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray500,
  },
  value: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Touch surface — taller than the track so the slider is easy to grab.
  sliderArea: {
    height: THUMB_SIZE + SPACING.md,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: COLORS.gray200,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  thumb: {
    position: 'absolute',
    top: (THUMB_SIZE + SPACING.md) / 2 - THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  tooltip: {
    position: 'absolute',
    top: -TOOLTIP_OFFSET,
    width: 60,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  axisLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    fontVariant: ['tabular-nums'],
  },
});
