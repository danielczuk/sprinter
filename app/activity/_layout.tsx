// app/activity/_layout.tsx
// Stack layout for the activity flow (negotiate, details, chat).
// Modal-style entry — slides up from the bottom for a "propose" feel.

import { Stack } from 'expo-router';

export default function ActivityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    />
  );
}
