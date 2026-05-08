// app/_layout.tsx
// Root layout — decides whether to show auth screens or main app tabs.
// Auth flow:
//   • Not logged in               → /(auth)/login
//   • Logged in, no profile       → /(auth)/onboarding
//   • Logged in, profile complete → /(tabs)/discover
//   • Dev mode (no Firebase)      → no redirects, index.tsx handles it

import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { isConfigured } from '@/services/firebase';
import { COLORS } from '@/constants/theme';

function useProtectedRoute() {
  const { firebaseUser, profile, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    // Dev mode — let the user navigate freely without auth
    if (!isConfigured) return;

    // expo-router types `segments` as a tuple; widen for index access.
    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const onOnboarding = segs[1] === 'onboarding';

    if (!firebaseUser) {
      // Not logged in → always go to login
      if (!inAuthGroup || onOnboarding) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Logged in but no profile yet → onboarding
    if (!profile) {
      if (!onOnboarding) {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    // Logged in + profile complete → main app
    if (inAuthGroup) {
      router.replace('/(tabs)/discover');
    }
  }, [firebaseUser, profile, isInitialized, segments]);
}

export default function RootLayout() {
  const { isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  useProtectedRoute();

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
