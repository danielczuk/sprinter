// app/(auth)/onboarding.tsx
// Multi-step onboarding form — fills in the user's Firestore profile
// after their first social login. Three steps:
//   1. Name
//   2. Sport + Level
//   3. Bio + Stats (optional)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { SPORT_LIST, LEVEL_LIST, MAX_BIO_LENGTH } from '@/constants/sports';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '@/constants/theme';
import { IUser, SportType, LevelType } from '@/types';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface IFormData {
  name: string;
  sport: SportType | null;
  level: LevelType | null;
  bio: string;
  avgPace: string;
  weeklyKm: string;
  activeDays: string;
}

const TOTAL_STEPS = 3;

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={step.container}>
      <Text style={step.title}>Jak masz na imię?</Text>
      <Text style={step.subtitle}>
        Twoje imię będzie widoczne dla potencjalnych partnerów treningowych.
      </Text>
      <TextInput
        style={step.input}
        value={value}
        onChangeText={onChange}
        placeholder="Imię i nazwisko"
        placeholderTextColor={COLORS.gray300}
        autoFocus
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={60}
      />
    </View>
  );
}

function StepSport({
  sport,
  level,
  onSport,
  onLevel,
}: {
  sport: SportType | null;
  level: LevelType | null;
  onSport: (s: SportType) => void;
  onLevel: (l: LevelType) => void;
}) {
  return (
    <ScrollView style={step.container} showsVerticalScrollIndicator={false}>
      <Text style={step.title}>Twój sport</Text>
      <Text style={step.subtitle}>Wybierz dyscyplinę i poziom zaawansowania.</Text>

      <Text style={step.sectionLabel}>Dyscyplina</Text>
      <View style={step.chipRow}>
        {SPORT_LIST.map((s) => (
          <Pressable
            key={s.key}
            style={[step.chip, sport === s.key && step.chipActive]}
            onPress={() => onSport(s.key)}
          >
            <Text style={[step.chipText, sport === s.key && step.chipTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[step.sectionLabel, { marginTop: SPACING.xl }]}>Poziom</Text>
      {LEVEL_LIST.map((l) => (
        <Pressable
          key={l.key}
          style={[step.levelCard, level === l.key && step.levelCardActive]}
          onPress={() => onLevel(l.key)}
        >
          <Text style={[step.levelLabel, level === l.key && step.levelLabelActive]}>{l.label}</Text>
          <Text style={step.levelDesc}>{l.description}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function StepBio({
  bio,
  avgPace,
  weeklyKm,
  activeDays,
  sport,
  onChange,
}: {
  bio: string;
  avgPace: string;
  weeklyKm: string;
  activeDays: string;
  sport: SportType | null;
  onChange: (field: keyof IFormData, value: string) => void;
}) {
  const showPace = sport === 'running' || sport === 'cycling';

  return (
    <ScrollView style={step.container} showsVerticalScrollIndicator={false}>
      <Text style={step.title}>O sobie</Text>
      <Text style={step.subtitle}>
        Opcjonalnie — możesz to uzupełnić później z poziomu profilu.
      </Text>

      <Text style={step.sectionLabel}>Krótki opis</Text>
      <TextInput
        style={[step.input, step.textArea]}
        value={bio}
        onChangeText={(v) => onChange('bio', v)}
        placeholder="Napisz coś o sobie i swoim stylu trenowania..."
        placeholderTextColor={COLORS.gray300}
        multiline
        numberOfLines={4}
        maxLength={MAX_BIO_LENGTH}
      />
      <Text style={step.charCount}>
        {bio.length}/{MAX_BIO_LENGTH}
      </Text>

      <Text style={[step.sectionLabel, { marginTop: SPACING.xl }]}>Statystyki (opcjonalne)</Text>

      {showPace && (
        <View style={step.statRow}>
          <Text style={step.statLabel}>
            Średnie tempo ({sport === 'cycling' ? 'km/h' : 'min/km'})
          </Text>
          <TextInput
            style={[step.input, step.statInput]}
            value={avgPace}
            onChangeText={(v) => onChange('avgPace', v)}
            placeholder={sport === 'cycling' ? 'np. 25' : 'np. 5:30'}
            placeholderTextColor={COLORS.gray300}
            keyboardType="default"
          />
        </View>
      )}

      <View style={step.statRow}>
        <Text style={step.statLabel}>km tygodniowo</Text>
        <TextInput
          style={[step.input, step.statInput]}
          value={weeklyKm}
          onChangeText={(v) => onChange('weeklyKm', v)}
          placeholder="np. 30"
          placeholderTextColor={COLORS.gray300}
          keyboardType="numeric"
        />
      </View>

      <View style={step.statRow}>
        <Text style={step.statLabel}>Dni treningowe / tydzień</Text>
        <TextInput
          style={[step.input, step.statInput]}
          value={activeDays}
          onChangeText={(v) => onChange('activeDays', v)}
          placeholder="np. 4"
          placeholderTextColor={COLORS.gray300}
          keyboardType="numeric"
        />
      </View>
    </ScrollView>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { firebaseUser, updateProfile, isLoading, error } = useAuthStore();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<IFormData>({
    name: firebaseUser?.displayName ?? '',
    sport: null,
    level: null,
    bio: '',
    avgPace: '',
    weeklyKm: '',
    activeDays: '',
  });

  const updateField = (field: keyof IFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Validation per step
  const canProceed = () => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return form.sport !== null && form.level !== null;
    return true; // Step 3 is optional
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!firebaseUser || !form.sport || !form.level) return;

    try {
      await updateProfile({
        userId: firebaseUser.uid,
        name: form.name.trim(),
        sport: form.sport,
        level: form.level,
        bio: form.bio.trim(),
        blocked: [],
        stats: {
          avgPace: form.avgPace.trim() || undefined,
          weeklyKm: form.weeklyKm ? Number(form.weeklyKm) : undefined,
          activeDays: form.activeDays ? Number(form.activeDays) : undefined,
        },
        // geohash and location will be set when location permission is granted
        geohash: '',
      } as Partial<IUser>);

      router.replace('/(tabs)/discover');
    } catch {
      // error is stored in the auth store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Progress bar */}
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i < step && styles.progressSegmentFilled]}
            />
          ))}
        </View>

        <Text style={styles.stepLabel}>
          Krok {step} z {TOTAL_STEPS}
        </Text>

        {/* Step content */}
        <View style={styles.content}>
          {step === 1 && <StepName value={form.name} onChange={(v) => updateField('name', v)} />}
          {step === 2 && (
            <StepSport
              sport={form.sport}
              level={form.level}
              onSport={(s) => setForm((p) => ({ ...p, sport: s }))}
              onLevel={(l) => setForm((p) => ({ ...p, level: l }))}
            />
          )}
          {step === 3 && (
            <StepBio
              bio={form.bio}
              avgPace={form.avgPace}
              weeklyKm={form.weeklyKm}
              activeDays={form.activeDays}
              sport={form.sport}
              onChange={updateField}
            />
          )}
        </View>

        {/* Error */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Navigation buttons */}
        <View style={styles.footer}>
          {step > 1 ? (
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backText}>Wstecz</Text>
            </Pressable>
          ) : (
            <View />
          )}

          <Pressable
            style={[styles.nextButton, (!canProceed() || isLoading) && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
          >
            <Text style={styles.nextText}>
              {step === TOTAL_STEPS ? (isLoading ? 'Zapisywanie...' : 'Gotowe') : 'Dalej'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressBar: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
  },
  progressSegmentFilled: {
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  backButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  backText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.lg,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.gray200,
  },
  nextText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

// Step-level styles (shared across step sub-components)
const step = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    lineHeight: FONT_SIZE.md * 1.5,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  levelCard: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  levelCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  levelLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.gray800,
    marginBottom: SPACING.xxs,
  },
  levelLabelActive: {
    color: COLORS.primaryDark,
  },
  levelDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
  },
  statRow: {
    marginBottom: SPACING.md,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  statInput: {
    paddingVertical: SPACING.sm,
  },
});
