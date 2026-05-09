// components/ui/UserCard.tsx
// Card displaying a potential sport partner in the discovery feed.
// No profile photo (by design) — shows an initial-based avatar instead.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IUserWithDistance } from '@/types';
import { SPORTS, LEVELS } from '@/constants/sports';
import { COLORS, FONT_SIZE, SPACING, RADIUS, SHADOW } from '@/constants/theme';
import { formatDistance } from '@/utils/geo.utils';
import { formatLastActive } from '@/utils/format.utils';

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface UserCardProps {
  user: IUserWithDistance;
  onPress: (user: IUserWithDistance) => void;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

function UserCard({ user, onPress }: UserCardProps) {
  const sportConfig = SPORTS[user.sport];
  const levelConfig = LEVELS[user.level];
  const initial = user.name.charAt(0).toUpperCase();

  // Convert Firestore Timestamp to Date for formatting
  const lastActiveDate =
    user.lastActive && typeof user.lastActive.toDate === 'function'
      ? user.lastActive.toDate()
      : new Date();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(user)}
    >
      {/* Header row: avatar + name + distance */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.lastActive}>{formatLastActive(lastActiveDate)}</Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{formatDistance(user.distanceKm)}</Text>
        </View>
      </View>

      {/* Sport + Level tags */}
      <View style={styles.tags}>
        <View style={styles.sportTag}>
          <Text style={styles.sportTagText}>{sportConfig.label}</Text>
        </View>
        <View style={styles.levelTag}>
          <Text style={styles.levelTagText}>{levelConfig.label}</Text>
        </View>
      </View>

      {/* Bio */}
      {user.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {user.bio}
        </Text>
      ) : null}

      {/* Stats row */}
      {user.stats && (
        <View style={styles.statsRow}>
          {user.stats.avgPace ? <StatItem value={user.stats.avgPace} label="min/km" /> : null}
          {user.stats.weeklyKm != null ? (
            <StatItem value={`${user.stats.weeklyKm}`} label="km/tydz." />
          ) : null}
          {user.stats.activeDays != null ? (
            <StatItem value={`${user.stats.activeDays}`} label="dni/tydz." />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  lastActive: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    marginTop: SPACING.xxs,
  },
  distanceBadge: {
    backgroundColor: COLORS.gray50,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  distanceText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.gray600,
  },

  // Tags
  tags: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sportTag: {
    backgroundColor: COLORS.primary + '15',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  sportTagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  levelTag: {
    backgroundColor: COLORS.secondary + '15',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  levelTagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.secondary,
  },

  // Bio
  bio: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
    lineHeight: FONT_SIZE.sm * 1.5,
    marginBottom: SPACING.md,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: SPACING.md,
    gap: SPACING.xl,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    marginTop: SPACING.xxs,
  },
});

export default React.memo(UserCard);
