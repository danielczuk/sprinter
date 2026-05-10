// app/activity/negotiate.tsx
// "Propose a training" form. Lives at /activity/negotiate.
// Receives partnerId, partnerName, sport from URL search params.
//
// Layout:
//   - Hero: back arrow + "Trening z [Imię]" + sport badge
//   - Section 1: Kiedy   → QuickDateTimePicker
//   - Section 2: Gdzie   → LocationPicker
//   - Section 3: Tempo   → SliderInput (seconds-per-km)
//   - Section 4: Dystans → SliderInput (km)
//   - Sticky footer: "Wyślij propozycję" + "Anuluj"
//
// On success: full-screen check overlay, then router.back() after 1.5 s.

import React, { useMemo, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GeoPoint, Timestamp } from 'firebase/firestore';

import LocationPicker, { WARSAW_RUNNING_SPOTS } from '@/components/ui/LocationPicker';
import QuickDateTimePicker from '@/components/ui/QuickDateTimePicker';
import SliderInput from '@/components/ui/SliderInput';
import { COLORS, FONT_SIZE, LAYOUT, RADIUS, SHADOW, SPACING } from '@/constants/theme';
import { SPORTS } from '@/constants/sports';
import { useActivitiesStore } from '@/stores/activities.store';
import { SportType } from '@/types';

// ─── PACE HELPERS ────────────────────────────────────────────────────────────

const PACE_MIN_S = 240; // 4:00 min/km
const PACE_MAX_S = 420; // 7:00 min/km
const PACE_STEP_S = 15;

const DIST_MIN_KM = 2;
const DIST_MAX_KM = 30;

function formatPaceFromSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function tomorrowAt18(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'submitting' | 'success';

export default function NegotiateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    partnerId?: string;
    partnerName?: string;
    sport?: string;
  }>();

  const partnerId = params.partnerId ?? 'unknown';
  const partnerName = params.partnerName ?? 'partnerem';
  const sport: SportType = (params.sport as SportType | undefined) ?? 'running';
  const sportConfig = SPORTS[sport] ?? SPORTS.running;

  const proposeActivity = useActivitiesStore((s) => s.proposeActivity);

  // ─── FORM STATE ──────────────────────────────────────────────────────────

  const initialLocation = WARSAW_RUNNING_SPOTS[0];
  const [dateTime, setDateTime] = useState<Date>(() => tomorrowAt18());
  const [location, setLocation] = useState<{
    name: string;
    lat?: number;
    lon?: number;
  }>(initialLocation);
  const [paceSecs, setPaceSecs] = useState(330); // 5:30
  const [distanceKm, setDistanceKm] = useState(8);

  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const successOpacity = useMemo(() => new Animated.Value(0), []);

  const canSubmit = location.name.trim().length > 0 && submitState === 'idle';

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitState('submitting');

    const paceMin = Math.floor(paceSecs / 60);
    const paceSec = paceSecs % 60;
    const paceStr = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;

    const geo =
      location.lat !== undefined && location.lon !== undefined
        ? new GeoPoint(location.lat, location.lon)
        : new GeoPoint(0, 0); // unknown — picked custom address

    try {
      await proposeActivity({
        partnerId,
        partnerName,
        sport,
        conditions: {
          dateTime: Timestamp.fromDate(dateTime),
          locationName: location.name.trim(),
          locationGeo: geo,
          pace: paceStr,
          distance: distanceKm,
        },
      });

      // Success animation, then back.
      setSubmitState('success');
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch {
      // The mock store doesn't reject, but be defensive.
      setSubmitState('idle');
    }
  };

  const handleCancel = () => {
    if (submitState === 'submitting') return;
    router.back();
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Hero */}
      <View style={styles.hero}>
        <Pressable style={styles.backButton} onPress={handleCancel} hitSlop={12}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>Propozycja treningu</Text>
          <Text style={styles.heroTitle}>{partnerName}</Text>
        </View>
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>{sportConfig.label}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* KIEDY */}
          <Section title="Kiedy" subtitle="Wybierz dzień i godzinę">
            <QuickDateTimePicker value={dateTime} onChange={setDateTime} />
          </Section>

          {/* GDZIE */}
          <Section title="Gdzie" subtitle="Trasa albo punkt zbiórki">
            <LocationPicker value={location.name} onChange={setLocation} />
          </Section>

          {/* TEMPO */}
          <Section title="Tempo" subtitle="Tempo biegu, na które się umawiacie">
            <SliderInput
              label="Tempo"
              unitLabel="min/km"
              min={PACE_MIN_S}
              max={PACE_MAX_S}
              step={PACE_STEP_S}
              value={paceSecs}
              onChange={setPaceSecs}
              formatValue={formatPaceFromSeconds}
            />
          </Section>

          {/* DYSTANS */}
          <Section title="Dystans" subtitle="Ile kilometrów chcesz pokonać">
            <SliderInput
              label="Dystans"
              unitLabel="km"
              min={DIST_MIN_KM}
              max={DIST_MAX_KM}
              step={1}
              value={distanceKm}
              onChange={setDistanceKm}
              formatValue={(v) => `${v} km`}
            />
          </Section>

          <View style={{ height: SPACING.xxxl }} />
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={submitState === 'submitting'}
          >
            <Text style={styles.cancelButtonText}>Anuluj</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitButtonText}>
              {submitState === 'submitting' ? 'Wysyłanie…' : 'Wyślij propozycję'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Success overlay */}
      {submitState === 'success' ? (
        <Animated.View
          style={[styles.successOverlay, { opacity: successOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.successCard}>
            <Text style={styles.successCheck}>✓</Text>
            <Text style={styles.successTitle}>Wysłano!</Text>
            <Text style={styles.successSubtitle}>{partnerName} dostanie powiadomienie.</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── SECTION SUBCOMPONENT ────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingTop: SPACING.xxl + SPACING.md, // safe-area-ish
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    gap: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
  },
  backGlyph: {
    fontSize: FONT_SIZE.xxxl,
    lineHeight: FONT_SIZE.xxl,
    color: COLORS.gray900,
    fontWeight: '300',
    marginTop: -4,
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: FONT_SIZE.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: 2,
  },
  sportBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
  },
  sportBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Scroll body
  scrollContent: {
    padding: LAYOUT.screenPaddingH,
    paddingBottom: 0,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xxs,
  },
  sectionBody: {
    marginTop: SPACING.lg,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: SPACING.md,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray100,
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  submitButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Success overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  successCheck: {
    fontSize: 80,
    color: COLORS.primary,
    fontWeight: '700',
    lineHeight: 80,
  },
  successTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.md,
  },
  successSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
