// __tests__/components/ui/UserCard.test.tsx

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ─── MOCKS ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => ({
  Timestamp: { now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }) },
  GeoPoint: jest.fn((lat: number, lon: number) => ({ latitude: lat, longitude: lon })),
}));

jest.mock('../../../services/firebase', () => ({
  db: null,
  auth: null,
  isConfigured: false,
}));

import UserCard from '../../../components/ui/UserCard';
import { IUserWithDistance } from '../../../types';

// ─── TEST DATA ───────────────────────────────────────────────────────────────

const mockUser: IUserWithDistance = {
  userId: 'test-1',
  name: 'Anna Wiśniewska',
  sport: 'running',
  level: 'intermediate',
  location: { latitude: 52.23, longitude: 21.01 } as any,
  geohash: 'u3q',
  bio: 'Biegam po Łazienkach',
  stats: { avgPace: '5:15', weeklyKm: 35, activeDays: 4 },
  lastActive: { toDate: () => new Date() } as any,
  blocked: [],
  createdAt: { toDate: () => new Date() } as any,
  distanceKm: 1.2,
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('UserCard', () => {
  it('renders user name', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('Anna Wiśniewska')).toBeTruthy();
  });

  it('renders initial in avatar', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('A')).toBeTruthy();
  });

  it('renders sport and level tags', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('Bieganie')).toBeTruthy();
    expect(getByText('Średniozaawansowany')).toBeTruthy();
  });

  it('renders bio text', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('Biegam po Łazienkach')).toBeTruthy();
  });

  it('renders stats', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('5:15')).toBeTruthy();
    expect(getByText('35')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('renders formatted distance', () => {
    const { getByText } = render(
      <UserCard user={mockUser} onPress={jest.fn()} />,
    );
    expect(getByText('1,2 km')).toBeTruthy();
  });

  it('calls onPress with user data when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <UserCard user={mockUser} onPress={onPress} />,
    );

    fireEvent.press(getByText('Anna Wiśniewska'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(mockUser);
  });

  it('does not render bio when empty', () => {
    const userNoBio = { ...mockUser, bio: '' };
    const { queryByText } = render(
      <UserCard user={userNoBio} onPress={jest.fn()} />,
    );
    expect(queryByText('Biegam po Łazienkach')).toBeNull();
  });

  it('handles user with no stats gracefully', () => {
    const userNoStats = { ...mockUser, stats: {} as any };
    const { queryByText } = render(
      <UserCard user={userNoStats} onPress={jest.fn()} />,
    );
    // Should render card without crashing
    expect(queryByText('Anna Wiśniewska')).toBeTruthy();
    // No stat values shown
    expect(queryByText('5:15')).toBeNull();
  });
});
