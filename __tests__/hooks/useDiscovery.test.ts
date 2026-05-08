// __tests__/hooks/useDiscovery.test.ts
// Smoke + behavior tests for useDiscovery. We mock geo.service and the two
// stores, and assert how the hook orchestrates them.

// ─── MOCKS ───────────────────────────────────────────────────────────────────

const mockGetLocationPermissionStatus = jest.fn();
const mockRequestLocationPermission = jest.fn();
const mockGetCurrentLocation = jest.fn();
const mockUpdateMyLocation = jest.fn();

jest.mock('../../services/geo.service', () => ({
  getLocationPermissionStatus: (...a: unknown[]) =>
    mockGetLocationPermissionStatus(...a),
  requestLocationPermission: (...a: unknown[]) =>
    mockRequestLocationPermission(...a),
  getCurrentLocation: (...a: unknown[]) => mockGetCurrentLocation(...a),
  updateMyLocation: (...a: unknown[]) => mockUpdateMyLocation(...a),
}));

const mockFetchUsers = jest.fn();
const mockSetFilters = jest.fn();
const mockDiscoveryState = {
  users: [],
  filters: { sport: 'running' as const, radiusKm: 5 },
  isLoading: false,
  error: null as string | null,
  setFilters: mockSetFilters,
  fetchUsers: mockFetchUsers,
  clearUsers: jest.fn(),
};
jest.mock('../../stores/discovery.store', () => ({
  useDiscoveryStore: jest.fn(() => mockDiscoveryState),
}));

const mockAuthState = { profile: null as null | { userId: string } };
jest.mock('../../stores/auth.store', () => ({
  useAuthStore: jest.fn((selector?: (s: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
  ),
}));

jest.mock('../../services/firebase', () => ({
  isConfigured: false,
  db: null,
  auth: null,
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDiscovery, DEFAULT_COORDS } from '../../hooks/useDiscovery';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.profile = null;
});

// ─── INITIAL STATE ──────────────────────────────────────────────────────────

describe('useDiscovery — initial state', () => {
  it('starts on the Warsaw fallback', () => {
    mockGetLocationPermissionStatus.mockResolvedValue('denied');
    const { result } = renderHook(() => useDiscovery());

    expect(result.current.coords).toEqual(DEFAULT_COORDS);
    expect(result.current.usingFallbackCoords).toBe(true);
  });
});

// ─── PERMISSION GRANTED ─────────────────────────────────────────────────────

describe('useDiscovery — permission granted', () => {
  it('switches to real coords when GPS resolves', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('granted');
    mockGetCurrentLocation.mockResolvedValue({ lat: 52.5, lon: 13.4 });

    const { result } = renderHook(() => useDiscovery());

    await waitFor(() => {
      expect(result.current.coords).toEqual({ lat: 52.5, lon: 13.4 });
    });
    expect(result.current.usingFallbackCoords).toBe(false);
    expect(result.current.permissionStatus).toBe('granted');
  });

  it('does not call updateMyLocation when Firebase is not configured', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('granted');
    mockGetCurrentLocation.mockResolvedValue({ lat: 52.5, lon: 13.4 });
    mockAuthState.profile = { userId: 'user1' };

    renderHook(() => useDiscovery());

    await waitFor(() => {
      expect(mockGetCurrentLocation).toHaveBeenCalled();
    });
    // isConfigured is false in this test → never persist.
    expect(mockUpdateMyLocation).not.toHaveBeenCalled();
  });
});

// ─── PERMISSION UNDETERMINED ────────────────────────────────────────────────

describe('useDiscovery — permission undetermined', () => {
  it('prompts the user once and then locates', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('undetermined');
    mockRequestLocationPermission.mockResolvedValue('granted');
    mockGetCurrentLocation.mockResolvedValue({ lat: 52.4, lon: 21.0 });

    const { result } = renderHook(() => useDiscovery());

    await waitFor(() => {
      expect(result.current.coords).toEqual({ lat: 52.4, lon: 21.0 });
    });
    expect(mockRequestLocationPermission).toHaveBeenCalledTimes(1);
  });
});

// ─── FETCH USERS ────────────────────────────────────────────────────────────

describe('useDiscovery — fetch coordination', () => {
  it('triggers fetchUsers with the current coords', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('granted');
    mockGetCurrentLocation.mockResolvedValue({ lat: 52.5, lon: 13.4 });

    renderHook(() => useDiscovery());

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledWith(52.5, 13.4);
    });
  });

  it('refresh() calls fetchUsers again with the same coords', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('denied');

    const { result } = renderHook(() => useDiscovery());

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalled();
    });

    mockFetchUsers.mockClear();
    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchUsers).toHaveBeenCalledWith(
      DEFAULT_COORDS.lat,
      DEFAULT_COORDS.lon,
    );
  });
});
