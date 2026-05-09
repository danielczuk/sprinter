// __tests__/stores/auth.store.test.ts

// ─── MOCKS ───────────────────────────────────────────────────────────────────

import type { User as FirebaseUser } from 'firebase/auth';

import { useAuthStore } from '../../stores/auth.store';
import type { IUser } from '../../types';

const mockOnAuthStateChanged = jest.fn();
const mockSignInWithCredential = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock('../../services/firebase', () => ({
  auth: { currentUser: null },
  isConfigured: true,
}));

const mockGetUser = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../services/users.service', () => ({
  getUser: (...args: unknown[]) => mockGetUser(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
}));

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fakeFirebaseUser = {
  uid: 'user1',
  email: 'test@test.com',
} as unknown as FirebaseUser;
const fakeProfile = {
  userId: 'user1',
  name: 'Jan Kowalski',
  sport: 'running',
  level: 'intermediate',
} as unknown as IUser;

function resetStore() {
  useAuthStore.setState({
    firebaseUser: null,
    profile: null,
    isLoading: true,
    isInitialized: false,
    error: null,
  });
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('auth.store — initial state', () => {
  it('starts with null user, loading true, not initialized', () => {
    const state = useAuthStore.getState();

    expect(state.firebaseUser).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('auth.store — initialize', () => {
  it('subscribes to onAuthStateChanged and returns unsubscribe', () => {
    const unsubMock = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(unsubMock);

    const unsub = useAuthStore.getState().initialize();

    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(typeof unsub).toBe('function');
  });

  it('sets profile when user is logged in and profile exists', async () => {
    mockGetUser.mockResolvedValue(fakeProfile);
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: Function) => {
      callback(fakeFirebaseUser);
      return jest.fn();
    });

    useAuthStore.getState().initialize();

    // Wait for the async callback
    await new Promise((r) => setTimeout(r, 10));

    const state = useAuthStore.getState();
    expect(state.firebaseUser).toEqual(fakeFirebaseUser);
    expect(state.profile).toEqual(fakeProfile);
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it('sets profile to null when user is logged in but no Firestore profile', async () => {
    mockGetUser.mockRejectedValue(new Error('not found'));
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: Function) => {
      callback(fakeFirebaseUser);
      return jest.fn();
    });

    useAuthStore.getState().initialize();

    await new Promise((r) => setTimeout(r, 10));

    const state = useAuthStore.getState();
    expect(state.firebaseUser).toEqual(fakeFirebaseUser);
    expect(state.profile).toBeNull();
    expect(state.isInitialized).toBe(true);
  });

  it('clears everything when user logs out', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: Function) => {
      callback(null);
      return jest.fn();
    });

    useAuthStore.getState().initialize();

    await new Promise((r) => setTimeout(r, 10));

    const state = useAuthStore.getState();
    expect(state.firebaseUser).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(true);
  });
});

describe('auth.store — signOut', () => {
  it('clears user and profile on success', async () => {
    useAuthStore.setState({
      firebaseUser: fakeFirebaseUser,
      profile: fakeProfile,
    });
    mockSignOut.mockResolvedValue(undefined);

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.firebaseUser).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('sets error on failure', async () => {
    mockSignOut.mockRejectedValue(new Error('network error'));

    await expect(useAuthStore.getState().signOut()).rejects.toThrow('network error');

    const state = useAuthStore.getState();
    expect(state.error).toBe('network error');
  });
});

describe('auth.store — refreshProfile', () => {
  it('reloads profile from Firestore', async () => {
    useAuthStore.setState({ firebaseUser: fakeFirebaseUser });
    mockGetUser.mockResolvedValue({ ...fakeProfile, name: 'Updated Name' });

    await useAuthStore.getState().refreshProfile();

    expect(useAuthStore.getState().profile?.name).toBe('Updated Name');
  });

  it('does nothing when not logged in', async () => {
    useAuthStore.setState({ firebaseUser: null });

    await useAuthStore.getState().refreshProfile();

    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe('auth.store — updateProfile', () => {
  it('updates existing profile', async () => {
    useAuthStore.setState({
      firebaseUser: fakeFirebaseUser,
      profile: fakeProfile,
    });
    mockUpdateUser.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({ ...fakeProfile, bio: 'Nowe bio' });

    await useAuthStore.getState().updateProfile({ bio: 'Nowe bio' });

    expect(mockUpdateUser).toHaveBeenCalledWith('user1', { bio: 'Nowe bio' });
    expect(useAuthStore.getState().profile?.bio).toBe('Nowe bio');
  });

  it('creates profile when none exists yet', async () => {
    useAuthStore.setState({
      firebaseUser: fakeFirebaseUser,
      profile: null,
    });
    mockCreateUser.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue(fakeProfile);

    await useAuthStore.getState().updateProfile(fakeProfile);

    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });

  it('throws when not logged in', async () => {
    useAuthStore.setState({ firebaseUser: null });

    await expect(useAuthStore.getState().updateProfile({ bio: 'test' })).rejects.toThrow(
      'Nie zalogowano'
    );
  });
});

describe('auth.store — clearError', () => {
  it('clears the error message', () => {
    useAuthStore.setState({ error: 'Something failed' });

    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });
});
