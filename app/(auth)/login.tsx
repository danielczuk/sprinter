// app/(auth)/login.tsx
// Login screen — MVP uses Google Sign-In and Apple Sign-In.
// For now, the UI is ready but actual auth providers will be wired
// once Firebase credentials are configured.

import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  // TODO: Wire up Google and Apple sign-in with Firebase Auth
  const handleGoogleSignIn = () => {
    // Will be implemented with expo-auth-session + Google provider
  };

  const handleAppleSignIn = () => {
    // Will be implemented with expo-apple-authentication
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Sprinter</Text>
        <Text style={styles.tagline}>
          Aktywność najpierw,{'\n'}znajomość potem.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
        >
          <Text style={styles.googleButtonText}>Kontynuuj z Google</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.appleButton]}
          onPress={handleAppleSignIn}
        >
          <Text style={styles.appleButtonText}>Kontynuuj z Apple</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Rejestrując się, akceptujesz regulamin i politykę prywatności.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: FONT_SIZE.xxxl + 8,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: FONT_SIZE.lg * 1.5,
  },
  actions: {
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  googleButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  appleButton: {
    backgroundColor: COLORS.gray900,
  },
  appleButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
