// app/(tabs)/profile.tsx
// Profile screen — displays the current user's profile and allows sign-out.
// Shows actual data from auth store when available, placeholder otherwise.

import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '@/constants/theme';
import { SPORTS, LEVELS } from '@/constants/sports';

export default function ProfileScreen() {
  const { profile, signOut, isLoading } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error is already set in the store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {/* Avatar placeholder — no profile photos in MVP */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>

        <Text style={styles.name}>{profile?.name ?? 'Nowy użytkownik'}</Text>

        {profile?.sport && (
          <Text style={styles.detail}>
            {SPORTS[profile.sport]?.label} · {LEVELS[profile.level]?.label}
          </Text>
        )}

        {profile?.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bioEmpty}>Dodaj krótki opis o sobie</Text>
        )}

        {profile?.stats && (
          <View style={styles.statsRow}>
            {profile.stats.avgPace && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.stats.avgPace}</Text>
                <Text style={styles.statLabel}>min/km</Text>
              </View>
            )}
            {profile.stats.weeklyKm != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.stats.weeklyKm}</Text>
                <Text style={styles.statLabel}>km/tydzień</Text>
              </View>
            )}
            {profile.stats.activeDays != null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.stats.activeDays}</Text>
                <Text style={styles.statLabel}>dni/tydzień</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Pressable
        style={[styles.signOutButton, isLoading && styles.disabled]}
        onPress={handleSignOut}
        disabled={isLoading}
      >
        <Text style={styles.signOutText}>Wyloguj się</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  detail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xxs,
  },
  bio: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray700,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: FONT_SIZE.md * 1.5,
  },
  bioEmpty: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray300,
    fontStyle: 'italic',
    marginTop: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    marginTop: SPACING.xxs,
  },
  signOutButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  signOutText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.error,
  },
});
