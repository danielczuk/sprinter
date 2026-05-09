// app/(auth)/_layout.tsx
// Layout for unauthenticated screens (login, onboarding).
// Simple stack with no header — each screen handles its own UI.

import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
