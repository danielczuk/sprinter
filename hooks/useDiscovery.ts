// hooks/useDiscovery.ts
// Hook spinający trzy rzeczy:
//   1) Foreground location permission + jednorazowy odczyt GPS przy mountcie
//      (zgodnie z CLAUDE.md — żadnego śledzenia w tle).
//   2) Aktualizacja własnej pozycji w Firestore (jeśli jesteśmy zalogowani).
//   3) Discovery store — pobieranie partnerów dla aktualnej lokalizacji
//      i filtrów. Re-fetch przy zmianie filtrów albo po manualnym refresh().
//
// Komponent ekranu konsumuje tylko ten hook; nie sięga już bezpośrednio
// do expo-location ani do storeów.

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCurrentLocation,
  getLocationPermissionStatus,
  requestLocationPermission,
  updateMyLocation,
  ICoords,
  LocationPermissionStatus,
} from '@/services/geo.service';
import { useDiscoveryStore, IDiscoveryState } from '@/stores/discovery.store';
import { useAuthStore } from '@/stores/auth.store';
import { isConfigured } from '@/services/firebase';

// ─── DEFAULTS ────────────────────────────────────────────────────────────────

/** Centrum Warszawy — fallback gdy GPS niedostępne. */
export const DEFAULT_COORDS: ICoords = { lat: 52.2297, lon: 21.0122 };

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface IUseDiscoveryResult {
  // Lokalizacja
  coords: ICoords;
  /** True jeśli `coords` to fallback (Warszawa), nie realne GPS. */
  usingFallbackCoords: boolean;
  permissionStatus: LocationPermissionStatus;

  // Re-eksport ze store'a — żeby ekran miał jeden punkt importu
  users: IDiscoveryState['users'];
  filters: IDiscoveryState['filters'];
  isLoading: boolean;
  error: string | null;

  // Akcje
  setFilters: IDiscoveryState['setFilters'];
  /** Wymuś ponowne pobranie partnerów dla aktualnych coords + filters. */
  refresh: () => Promise<void>;
  /** Zapytaj o uprawnienie GPS (np. po tapnięciu CTA "Włącz lokalizację"). */
  requestPermission: () => Promise<LocationPermissionStatus>;
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useDiscovery(): IUseDiscoveryResult {
  const { users, filters, isLoading, error, setFilters, fetchUsers } =
    useDiscoveryStore();
  const profile = useAuthStore((s) => s.profile);

  const [coords, setCoords] = useState<ICoords>(DEFAULT_COORDS);
  const [usingFallbackCoords, setUsingFallbackCoords] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>('undetermined');

  // Track first mount — initial GPS read should happen exactly once.
  const didInitialLocate = useRef(false);

  // ─── LOCATION ACQUISITION ─────────────────────────────────────────────────

  const applyCoords = useCallback(
    async (next: ICoords, isReal: boolean) => {
      setCoords(next);
      setUsingFallbackCoords(!isReal);

      // Persist self-location only when (a) we have real GPS and
      // (b) Firebase is configured and (c) user is signed in.
      if (isReal && isConfigured && profile?.userId) {
        try {
          await updateMyLocation(profile.userId, next);
        } catch {
          // Non-fatal — discovery still works on the local coords.
        }
      }
    },
    [profile?.userId],
  );

  const locate = useCallback(async () => {
    const status = await getLocationPermissionStatus();
    setPermissionStatus(status);

    if (status === 'granted') {
      const real = await getCurrentLocation();
      if (real) {
        await applyCoords(real, true);
        return;
      }
    }
    // Fallback — keep DEFAULT_COORDS.
    await applyCoords(DEFAULT_COORDS, false);
  }, [applyCoords]);

  const requestPermission = useCallback(async () => {
    const status = await requestLocationPermission();
    setPermissionStatus(status);

    if (status === 'granted') {
      const real = await getCurrentLocation();
      if (real) {
        await applyCoords(real, true);
        return status;
      }
    }
    await applyCoords(DEFAULT_COORDS, false);
    return status;
  }, [applyCoords]);

  // Initial mount — ask for permission + locate once.
  useEffect(() => {
    if (didInitialLocate.current) return;
    didInitialLocate.current = true;

    (async () => {
      const status = await getLocationPermissionStatus();
      if (status === 'undetermined') {
        await requestPermission();
      } else {
        await locate();
      }
    })();
  }, [locate, requestPermission]);

  // ─── DISCOVERY FETCH ──────────────────────────────────────────────────────

  // Re-fetch whenever coords or filters change.
  useEffect(() => {
    fetchUsers(coords.lat, coords.lon);
  }, [coords.lat, coords.lon, filters.sport, filters.radiusKm, filters.level, fetchUsers]);

  const refresh = useCallback(async () => {
    await fetchUsers(coords.lat, coords.lon);
  }, [coords.lat, coords.lon, fetchUsers]);

  return {
    coords,
    usingFallbackCoords,
    permissionStatus,
    users,
    filters,
    isLoading,
    error,
    setFilters,
    refresh,
    requestPermission,
  };
}
