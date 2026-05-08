// app/index.tsx
// Root route — redirects to the appropriate screen based on auth state.
// Expo Router requires a file at app/index.tsx to handle the "/" path.
//
// DEV MODE: When Firebase is not configured, redirects straight to discover
// so you can preview the UI without logging in.

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { isConfigured } from '@/services/firebase';

export default function Index() {
  const { firebaseUser, isInitialized } = useAuthStore();

  if (!isInitialized) return null;

  // Dev mode without Firebase — skip auth, go straight to main app
  if (!isConfigured) {
    return <Redirect href="/(tabs)/discover" />;
  }

  if (firebaseUser) {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <Redirect href="/(auth)/login" />;
}
