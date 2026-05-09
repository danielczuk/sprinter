#!/usr/bin/env bash
# commit-feature.sh
# Run AFTER commit-existing.sh.
# Adds the first real feature: useDiscovery hook + geo.service.ts.
# Refactors discovery.store and discover.tsx to use them.
#
# Run from repo root: `bash commit-feature.sh`

set -euo pipefail

cd "$(dirname "$0")"

if ! git diff --quiet --cached; then
  echo "ERROR: there are already staged changes. Unstage them first (git reset) and re-run." >&2
  exit 1
fi

# ─── Refactor stores/discovery.store.ts ─────────────────────────────────────
# Replace the inline getUsersBySport+haversine logic with a call into the
# new geo.service.findNearbyPartners.

cat > stores/discovery.store.ts <<'STORE_EOF'
// stores/discovery.store.ts
// Zustand store for the discovery (partner matching) feature.
// Manages filters, user list, and loading state.
// Includes mock data for development without Firebase.

import { create } from 'zustand';
import { Timestamp, GeoPoint } from 'firebase/firestore';
import { IUserWithDistance, IDiscoveryFilters, SportType, LevelType } from '@/types';
import { isConfigured } from '@/services/firebase';
import { findNearbyPartners } from '@/services/geo.service';
import { DEFAULT_RADIUS_KM } from '@/constants/sports';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface IDiscoveryState {
  // State
  users: IUserWithDistance[];
  filters: IDiscoveryFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setFilters: (filters: Partial<IDiscoveryFilters>) => void;
  fetchUsers: (currentLat: number, currentLon: number) => Promise<void>;
  clearUsers: () => void;
}

// ─── MOCK DATA (dev without Firebase) ────────────────────────────────────────

const now = Timestamp.now();

const MOCK_USERS: IUserWithDistance[] = [
  {
    userId: 'mock-1',
    name: 'Anna Wiśniewska',
    sport: 'running',
    level: 'intermediate',
    location: new GeoPoint(52.235, 21.01),
    geohash: 'u3q',
    bio: 'Biegam po Łazienkach i Mokotowie. Szukam kogoś na tempo 5:00-5:30.',
    stats: { avgPace: '5:15', weeklyKm: 35, activeDays: 4 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 1.2,
  },
  {
    userId: 'mock-2',
    name: 'Bartek Nowak',
    sport: 'running',
    level: 'advanced',
    location: new GeoPoint(52.22, 21.02),
    geohash: 'u3q',
    bio: 'Przygotowuję się do maratonu — szukam partnera na długie wybiegania w weekendy.',
    stats: { avgPace: '4:30', weeklyKm: 65, activeDays: 6 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 2.8,
  },
  {
    userId: 'mock-3',
    name: 'Celina Kowalczyk',
    sport: 'cycling',
    level: 'intermediate',
    location: new GeoPoint(52.24, 20.99),
    geohash: 'u3q',
    bio: 'Rower szosowy, okolice Warszawy i Kampinos. Tempo 28-32 km/h.',
    stats: { avgPace: '30', weeklyKm: 120, activeDays: 3 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 3.5,
  },
  {
    userId: 'mock-4',
    name: 'Dawid Zieliński',
    sport: 'tennis',
    level: 'beginner',
    location: new GeoPoint(52.21, 21.03),
    geohash: 'u3q',
    bio: 'Dopiero zaczynam z tenisem — gram raz w tygodniu, szukam cierpliwego partnera.',
    stats: { activeDays: 1 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 4.1,
  },
  {
    userId: 'mock-5',
    name: 'Ewa Kamińska',
    sport: 'gym',
    level: 'advanced',
    location: new GeoPoint(52.25, 21.0),
    geohash: 'u3q',
    bio: 'Full body / push-pull-legs. Trenuję rano 6:00-7:30 przed pracą.',
    stats: { activeDays: 5 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 0.8,
  },
  {
    userId: 'mock-6',
    name: 'Filip Wójcik',
    sport: 'climbing',
    level: 'intermediate',
    location: new GeoPoint(52.23, 21.05),
    geohash: 'u3q',
    bio: 'Bouldering 6a-6c, ścianki w Warszawie. Wieczorami po 18.',
    stats: { activeDays: 3 },
    lastActive: now,
    blocked: [],
    createdAt: now,
    distanceKm: 2.1,
  },
];

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useDiscoveryStore = create<IDiscoveryState>((set, get) => ({
  users: [],
  filters: {
    sport: 'running',
    radiusKm: DEFAULT_RADIUS_KM,
  },
  isLoading: false,
  error: null,

  setFilters: (partial) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
    }));
  },

  fetchUsers: async (currentLat: number, currentLon: number) => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      let usersWithDistance: IUserWithDistance[];

      if (!isConfigured) {
        // DEV MODE: use mock data, filter by sport and radius
        usersWithDistance = MOCK_USERS.filter(
          (u) =>
            u.sport === filters.sport &&
            u.distanceKm <= filters.radiusKm &&
            (!filters.level || u.level === filters.level),
        );
      } else {
        // PRODUCTION: fetch from Firestore via geo.service.
        // findNearbyPartners already does bbox + Haversine + sort.
        usersWithDistance = await findNearbyPartners(currentLat, currentLon, {
          sport: filters.sport,
          radiusKm: filters.radiusKm,
        });

        if (filters.level) {
          usersWithDistance = usersWithDistance.filter(
            (u) => u.level === filters.level,
          );
        }
      }

      set({ users: usersWithDistance, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nie udało się pobrać użytkowników';
      set({ users: [], isLoading: false, error: message });
    }
  },

  clearUsers: () => set({ users: [] }),
}));
STORE_EOF

# ─── Refactor app/(tabs)/discover.tsx ───────────────────────────────────────
# Replace hard-coded DEFAULT_LAT/LON with the new useDiscovery hook + add a
# small banner when GPS is unavailable.

cat > 'app/(tabs)/discover.tsx' <<'SCREEN_EOF'
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
SCREEN_EOF

echo "==> Commit F: feature — useDiscovery hook + geo.service"
git add \
  services/geo.service.ts \
  hooks/useDiscovery.ts \
  __tests__/services/geo.service.test.ts \
  __tests__/hooks/useDiscovery.test.ts \
  stores/discovery.store.ts \
  'app/(tabs)/discover.tsx'

git commit -m "feat(discovery): real GPS via expo-location + geo.service.findNearbyPartners

- services/geo.service.ts: wraps expo-location (permission, current position)
  and Firestore-side geo querying (find nearby + update self location).
  Bounding-box pre-filter + Haversine for accurate radius queries.
- hooks/useDiscovery.ts: orchestrates permission, GPS read, self-location
  persistence, and discovery store fetching. Falls back to Warsaw center
  when GPS is unavailable.
- stores/discovery.store.ts: Firestore branch now delegates to
  geo.service.findNearbyPartners instead of doing its own filtering.
- app/(tabs)/discover.tsx: consumes useDiscovery; adds a banner that
  invites the user to enable location when running on the fallback.
- Tests cover the geo.service permission branches, bbox/Haversine filter,
  and the hook's grant/deny/refresh paths.

Per CLAUDE.md, location is read at app open only — no background polling."

echo
echo "Done. Feature commit added."
git log --oneline -10
