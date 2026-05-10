// __tests__/stores/activities.store.test.ts
//
// jest.mock() must be hoisted above imports for module mocking to work,
// which trips the import/first lint rule. Disable file-wide.
/* eslint-disable import/first */

// ─── MOCKS ───────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => {
  class GeoPoint {
    latitude: number;
    longitude: number;
    constructor(lat: number, lon: number) {
      this.latitude = lat;
      this.longitude = lon;
    }
  }
  // Minimal Timestamp shim — only what the store/tests touch.
  const Timestamp = {
    now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
    fromDate: (d: Date) => ({
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    }),
  };
  return { GeoPoint, Timestamp };
});

import { GeoPoint, Timestamp } from 'firebase/firestore';

import { useActivitiesStore, defaultRunningConditions } from '../../stores/activities.store';
import type { IActivityConditions, SportType } from '../../types';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeConditions(overrides: Partial<IActivityConditions> = {}): IActivityConditions {
  return {
    dateTime: Timestamp.fromDate(new Date('2026-06-01T18:00:00Z')),
    locationName: 'Park Łazienkowski',
    locationGeo: new GeoPoint(52.2148, 21.0353),
    pace: '5:30',
    distance: 8,
    ...overrides,
  };
}

beforeEach(() => {
  useActivitiesStore.getState().reset();
  jest.clearAllMocks();
});

// ─── PROPOSE ─────────────────────────────────────────────────────────────────

describe('activities.store — proposeActivity', () => {
  it('adds a new activity in the proposed state and returns its id', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    expect(typeof id).toBe('string');
    const activities = useActivitiesStore.getState().myActivities;
    expect(activities).toHaveLength(1);
    expect(activities[0].activityId).toBe(id);
    expect(activities[0].status).toBe('proposed');
    expect(activities[0].partnerId).toBe('user-2');
    expect(activities[0].sport).toBe('running');
  });

  it('always sets chatUnlocked = false on a fresh proposal', async () => {
    await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    expect(useActivitiesStore.getState().myActivities[0].chatUnlocked).toBe(false);
  });

  it('initialises confirmedBy to an empty array', async () => {
    await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    expect(useActivitiesStore.getState().myActivities[0].confirmedBy).toEqual([]);
  });

  it('prepends the new activity (newest first)', async () => {
    const first = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });
    const second = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-3',
      partnerName: 'Bartek',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    const activities = useActivitiesStore.getState().myActivities;
    expect(activities[0].activityId).toBe(second);
    expect(activities[1].activityId).toBe(first);
  });
});

// ─── CANCEL / CONFIRM ────────────────────────────────────────────────────────

describe('activities.store — cancel/confirm', () => {
  it('cancelActivity flips status to "cancelled"', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    useActivitiesStore.getState().cancelActivity(id);

    const activity = useActivitiesStore.getState().myActivities[0];
    expect(activity.status).toBe('cancelled');
  });

  it('confirmActivity flips status to "confirmed"', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    useActivitiesStore.getState().confirmActivity(id);

    const activity = useActivitiesStore.getState().myActivities[0];
    expect(activity.status).toBe('confirmed');
  });
});

// ─── MARK COMPLETED ──────────────────────────────────────────────────────────

describe('activities.store — markCompleted', () => {
  it('adds the userId to confirmedBy', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    useActivitiesStore.getState().markCompleted(id, 'me');

    const activity = useActivitiesStore.getState().myActivities[0];
    expect(activity.confirmedBy).toEqual(['me']);
  });

  it('does not duplicate the same userId', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    useActivitiesStore.getState().markCompleted(id, 'me');
    useActivitiesStore.getState().markCompleted(id, 'me');

    const activity = useActivitiesStore.getState().myActivities[0];
    expect(activity.confirmedBy).toEqual(['me']);
  });

  it('flips status to "completed" only after both participants confirm', async () => {
    const id = await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });

    // Only the initiator confirms — still proposed.
    useActivitiesStore.getState().markCompleted(id, 'me');
    expect(useActivitiesStore.getState().myActivities[0].status).toBe('proposed');

    // Partner confirms — now completed.
    useActivitiesStore.getState().markCompleted(id, 'user-2');
    expect(useActivitiesStore.getState().myActivities[0].status).toBe('completed');
  });
});

// ─── DEFAULTS ────────────────────────────────────────────────────────────────

describe('defaultRunningConditions', () => {
  it('returns sensible defaults for the negotiate form', () => {
    const conditions = defaultRunningConditions(new Date('2026-05-09T12:00:00Z'));

    expect(conditions.locationName).toBe('Park Łazienkowski');
    expect(conditions.pace).toBe('5:30');
    expect(conditions.distance).toBe(8);
    // dateTime should be tomorrow at 18:00 local.
    const date = new Date(conditions.dateTime.seconds * 1000);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(0);
  });
});

// ─── RESET ───────────────────────────────────────────────────────────────────

describe('activities.store — reset', () => {
  it('clears all activities', async () => {
    await useActivitiesStore.getState().proposeActivity({
      partnerId: 'user-2',
      partnerName: 'Anna',
      sport: 'running' as SportType,
      conditions: makeConditions(),
    });
    expect(useActivitiesStore.getState().myActivities).toHaveLength(1);

    useActivitiesStore.getState().reset();

    expect(useActivitiesStore.getState().myActivities).toHaveLength(0);
  });
});
