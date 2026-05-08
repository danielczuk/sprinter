// app/(tabs)/discover.tsx
// Discovery screen — find sport partners nearby.
// Shows filterable feed of UserCards driven by the useDiscovery hook.

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDiscovery } from '@/hooks/useDiscovery';
import { SPORT_LIST } from '@/constants/sports';
import { COLORS, FONT_SIZE, SPACING, RADIUS, LAYOUT } from '@/constants/theme';
import UserCard from '@/components/ui/UserCard';
import { IUserWithDistance, SportType } from '@/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const {
    users,
    filters,
    isLoading,
    error,
    setFilters,
    refresh,
    permissionStatus,
    usingFallbackCoords,
    requestPermission,
  } = useDiscovery();

  const handleUserPress = useCallback(
    (_user: IUserWithDistance) => {
      // TODO: Navigate to activity proposal / negotiation screen
      // router.push(`/activity/negotiate?partnerId=${_user.userId}`);
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
      {/* Location banner — only when we don't have real GPS */}
      {usingFallbackCoords && (
        <Pressable
          style={styles.locationBanner}
          onPress={
            permissionStatus === 'denied' ? undefined : requestPermission
          }
        >
          <Text style={styles.locationBannerText}>
            {permissionStatus === 'denied'
              ? '📍 Brak dostępu do lokalizacji — pokazuję partnerów z centrum Warszawy. Włącz lokalizację w ustawieniach systemu.'
              : '📍 Włącz lokalizację, żeby zobaczyć partnerów rzeczywiście w pobliżu.'}
          </Text>
        </Pressable>
      )}

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
          <Pressable style={styles.retryButton} onPress={refresh}>
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

  // Location banner
  locationBanner: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  locationBannerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray700,
    lineHeight: FONT_SIZE.sm * 1.4,
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
