// app/(tabs)/_layout.tsx
// Bottom tab navigator for the main app (post-login).
// Three tabs: Discover, Activities, Profile.

import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS, FONT_SIZE, LAYOUT } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.background },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: FONT_SIZE.lg,
          color: COLORS.gray900,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          height: LAYOUT.bottomTabHeight,
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.gray100,
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZE.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Odkrywaj',
          headerTitle: 'Odkrywaj partnerów',
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Aktywności',
          headerTitle: 'Moje aktywności',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Mój profil',
        }}
      />
    </Tabs>
  );
}
