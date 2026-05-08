// app/(tabs)/discover.tsx
// Discovery screen — find sport partners nearby.
// Shows filterable feed of UserCards using the discovery store.

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDiscoveryStore } from '@/stores/discovery.store';
import { SPORT_LIST } from '@/constants/sports';
import { COLORS, FONT_SIZE, SPACING, RADIUS, LAYOUT } from '@/constants/theme';
import UserCard from '@/components/ui/UserCard';
import { IUserWithDistance, SportType } from '@/types';

// ─── WARSAW CENTER (default when no GPS) ─────────────────────────────────────
const DEFAULT_LAT = 52.2297;
const DEFAULT_LON = 21.0122;

export default function DiscoverScreen() {
  const router = useRouter();
  const { users, filters, isLoading, error, setFilters, fetchUsers } =
    useDiscoveryStore();

  // Fetch users on mount and when filters change
  useEffect(() => {
    // TODO: Replace with real user GPS from expo-location
    fetchUsers(DEFAULT_LAT, DEFAULT_LON);
  }, [filters.sport, filters.radiusKm, filters.level]);

  const handleUserPress = useCallback(
    (user: IUserWithDistance) => {
      // TODO: Navigate to activity proposal / negotiation screen
      // router.push(`/activity/negotiate?partnerId=${user.userId}`);
    },
    [router],
  );

  const handleSportFilter = useCallback(
    (sport: SportType) => {
      setFilters({ sport });
    },
    [setFilters],
  );

  return (
    <View style={styles.container}>
      {/* Sport filter chips */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SPORT_LIST}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                filters.sport === item.key && styles.filterChipActive,
              ]}
              onPress={() => handleSportFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.sport === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchUsers(DEFAULT_LAT, DEFAULT_LON)}
          >
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Brak wyników</Text>
          <Text style={styles.emptySubtitle}>
            Nie znaleziono partnerów w Twojej okolicy.{'\n'}Spróbuj zmienić
            sport lub zwiększyć zasięg.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <UserCard user={item} onPress={handleUserPress} />
          )}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {users.length}{' '}
              {users.length === 1
                ? 'osoba'
                : users.length < 5
                  ? 'osoby'
                  : 'osób'}{' '}
              w pobliżu
            </Text>
          }
        />
      )}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  // Filter bar
  filterBar: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filterList: {
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  // Feed
  feed: {
    padding: LAYOUT.screenPaddingH,
    paddingTop: SPACING.md,
  },
  resultsCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray400,
    marginBottom: SPACING.md,
  },

  // States
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.5,
  },
});
