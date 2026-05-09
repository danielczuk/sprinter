// stores/auth.store.ts
// Zustand store for authentication state.
// Manages the currently logged-in user, loading states, and auth actions.
// Gracefully handles missing Firebase config (dev mode without .env.local).

import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  AuthCredential,
} from 'firebase/auth';
import { auth, isConfigured } from '@/services/firebase';
import { IUser } from '@/types';
import { getUser, createUser, updateUser } from '@/services/users.service';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface IAuthState {
  // State
  firebaseUser: FirebaseUser | null;
  profile: IUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void; // Returns unsubscribe function
  signIn: (credential: AuthCredential) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<IUser>) => Promise<void>;
  clearError: () => void;
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<IAuthState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: () => {
    // When Firebase is not configured, skip auth listener and go straight
    // to "initialized, not logged in" so the UI renders the login screen.
    if (!isConfigured || !auth) {
      set({
        firebaseUser: null,
        profile: null,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      // Return a no-op unsubscribe
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUser(firebaseUser.uid);
          set({ firebaseUser, profile, isLoading: false, isInitialized: true });
        } catch {
          // User exists in Auth but not yet in Firestore (first login)
          set({ firebaseUser, profile: null, isLoading: false, isInitialized: true });
        }
      } else {
        set({
          firebaseUser: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
        });
      }
    });

    return unsubscribe;
  },

  signIn: async (credential: AuthCredential) => {
    if (!auth) throw new Error('Firebase nie jest skonfigurowany');
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithCredential(auth, credential);
      const profile = await getUser(result.user.uid);
      set({ firebaseUser: result.user, profile, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd logowania';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  signOut: async () => {
    if (!auth) throw new Error('Firebase nie jest skonfigurowany');
    set({ isLoading: true, error: null });
    try {
      await firebaseSignOut(auth);
      set({ firebaseUser: null, profile: null, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd wylogowania';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  refreshProfile: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;

    try {
      const profile = await getUser(firebaseUser.uid);
      set({ profile });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się pobrać profilu';
      set({ error: message });
    }
  },

  updateProfile: async (data: Partial<IUser>) => {
    const { firebaseUser, profile } = get();
    if (!firebaseUser) throw new Error('Nie zalogowano');

    try {
      if (profile) {
        await updateUser(firebaseUser.uid, data);
      } else {
        // First-time profile creation — requires all fields
        await createUser(data as IUser);
      }
      const updated = await getUser(firebaseUser.uid);
      set({ profile: updated, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się zaktualizować profilu';
      set({ error: message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
