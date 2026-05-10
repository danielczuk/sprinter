// components/ui/LocationPicker.tsx
// Single-select list of preset Warsaw running spots, plus an "Inne" option
// that reveals a free-text input. Each preset carries lat/lon so the
// negotiate screen can store a real GeoPoint without geocoding.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/theme';

// ─── PRESETS ─────────────────────────────────────────────────────────────────

export interface ILocationOption {
  name: string;
  lat: number;
  lon: number;
}

export const WARSAW_RUNNING_SPOTS: readonly ILocationOption[] = [
  { name: 'Park Łazienkowski', lat: 52.2148, lon: 21.0353 },
  { name: 'Pole Mokotowskie', lat: 52.2042, lon: 21.0078 },
  { name: 'Park Skaryszewski', lat: 52.2438, lon: 21.0512 },
  { name: 'Bulwary Wiślane', lat: 52.247, lon: 21.026 },
  { name: 'Las Kabacki', lat: 52.1408, lon: 21.066 },
  { name: 'Wilanów', lat: 52.1614, lon: 21.0907 },
];

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface LocationPickerProps {
  value: string;
  onChange: (next: { name: string; lat?: number; lon?: number }) => void;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const CUSTOM_KEY = '__custom__';

function LocationPicker({ value, onChange }: LocationPickerProps) {
  const isPreset = WARSAW_RUNNING_SPOTS.some((s) => s.name === value);
  const [mode, setMode] = useState<'preset' | 'custom'>(isPreset || !value ? 'preset' : 'custom');
  const [customText, setCustomText] = useState(isPreset ? '' : value);

  const handlePresetPress = (option: ILocationOption) => {
    setMode('preset');
    onChange({ name: option.name, lat: option.lat, lon: option.lon });
  };

  const handleCustomToggle = () => {
    setMode('custom');
    // Don't clobber existing custom text on reopen.
    if (customText.trim()) {
      onChange({ name: customText.trim() });
    } else {
      onChange({ name: '' });
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomText(text);
    onChange({ name: text.trim() });
  };

  return (
    <View style={styles.container}>
      {WARSAW_RUNNING_SPOTS.map((option) => {
        const isActive = mode === 'preset' && value === option.name;
        return (
          <Pressable
            key={option.name}
            style={[styles.option, isActive && styles.optionActive]}
            onPress={() => handlePresetPress(option)}
          >
            <View style={styles.iconBubble}>
              <Text style={styles.iconText}>📍</Text>
            </View>
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {option.name}
            </Text>
            {isActive ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
        );
      })}

      {/* Custom option */}
      <Pressable
        key={CUSTOM_KEY}
        style={[styles.option, mode === 'custom' && styles.optionActive]}
        onPress={handleCustomToggle}
      >
        <View style={styles.iconBubble}>
          <Text style={styles.iconText}>✏️</Text>
        </View>
        <Text style={[styles.optionText, mode === 'custom' && styles.optionTextActive]}>
          Inne miejsce
        </Text>
        {mode === 'custom' ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>

      {mode === 'custom' ? (
        <TextInput
          style={styles.customInput}
          value={customText}
          onChangeText={handleCustomChange}
          placeholder="Np. Park Saski, ul. Marszałkowska 1"
          placeholderTextColor={COLORS.gray400}
          autoFocus
          maxLength={80}
        />
      ) : null}
    </View>
  );
}

export default LocationPicker;

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: SPACING.md,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.gray50,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: FONT_SIZE.md,
  },
  optionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  optionTextActive: {
    color: COLORS.gray900,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: '700',
  },
  customInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.gray900,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
});
