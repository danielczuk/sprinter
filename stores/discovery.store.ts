// stores/discovery.store.ts
// Zustand store for the discovery (partner matching) feature.
// Manages filters, user list, and loading state.
// Includes mock data for development without Firebase.

import { create } from 'zustand';
import { Timestamp, GeoPoint } from 'firebase/firestore';
import { IUserWithDistance, IDiscoveryFilters, SportType, LevelType } from '@/types';
import { isConfigured } from '@/services/firebase';
import { getUsersBySport } from '@/services/users.service';
import { haversineDistance } from '@/utils/geo.utils';
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
        // PRODUCTION: fetch from Firestore
        const rawUsers = await getUsersBySport(filters.sport);

        usersWithDistance = rawUsers
          .map((u) => ({
            ...u,
            distanceKm: haversineDistance(
              currentLat,
              currentLon,
              u.location.latitude,
              u.location.longitude,
            ),
          }))
          .filter(
            (u) =>
              u.distanceKm <= filters.radiusKm &&
              (!filters.level || u.level === filters.level),
          )
          .sort((a, b) => a.distanceKm - b.distanceKm);
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
