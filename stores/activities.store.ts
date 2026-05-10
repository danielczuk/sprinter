// stores/activities.store.ts
// Zustand store for activities (proposed/confirmed/completed/cancelled).
// In UI-first phase this store is purely in-memory — no Firestore writes.
// proposeActivity simulates a 500 ms network roundtrip so the negotiate
// screen can show a real loading state.

import { create } from 'zustand';
import { Timestamp, GeoPoint } from 'firebase/firestore';

import { IActivity, IActivityConditions, ActivityStatus, SportType } from '@/types';

// ─── INPUT TYPES ─────────────────────────────────────────────────────────────

export interface IProposeActivityInput {
  partnerId: string;
  partnerName: string;
  sport: SportType;
  conditions: IActivityConditions;
}

// ─── STATE ───────────────────────────────────────────────────────────────────

export interface IActivitiesState {
  myActivities: IActivity[];

  /** Returns the activityId of the freshly proposed activity. */
  proposeActivity: (input: IProposeActivityInput) => Promise<string>;
  cancelActivity: (activityId: string) => void;
  confirmActivity: (activityId: string) => void;
  markCompleted: (activityId: string, userId: string) => void;

  /** Reset — used by tests and dev-mode reseeding. */
  reset: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const CURRENT_USER_ID = 'me'; // placeholder — replaced when real auth lands

function makeId(): string {
  return `act-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function fakeNetworkDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useActivitiesStore = create<IActivitiesState>((set, get) => ({
  myActivities: [],

  proposeActivity: async ({ partnerId, sport, conditions }) => {
    await fakeNetworkDelay(500);

    const now = Timestamp.now();
    const activity: IActivity = {
      activityId: makeId(),
      initiatorId: CURRENT_USER_ID,
      partnerId,
      sport,
      status: 'proposed',
      conditions,
      confirmedBy: [],
      chatUnlocked: false, // only Cloud Function can flip this — mock leaves false
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      myActivities: [activity, ...state.myActivities],
    }));

    return activity.activityId;
  },

  cancelActivity: (activityId) => {
    updateOne(set, get, activityId, () => ({ status: 'cancelled' as ActivityStatus }));
  },

  confirmActivity: (activityId) => {
    updateOne(set, get, activityId, () => ({ status: 'confirmed' as ActivityStatus }));
  },

  markCompleted: (activityId, userId) => {
    updateOne(set, get, activityId, (current) => {
      const confirmedBy = current.confirmedBy.includes(userId)
        ? current.confirmedBy
        : [...current.confirmedBy, userId];

      // Both participants confirmed → activity is completed.
      // (Real chat unlock still requires a Cloud Function — left false here.)
      const bothConfirmed =
        confirmedBy.includes(current.initiatorId) && confirmedBy.includes(current.partnerId);

      return {
        confirmedBy,
        status: bothConfirmed ? ('completed' as ActivityStatus) : current.status,
      };
    });
  },

  reset: () => set({ myActivities: [] }),
}));

// Internal helper — applies a partial update to one activity by ID.
function updateOne(
  set: (fn: (s: IActivitiesState) => Partial<IActivitiesState>) => void,
  get: () => IActivitiesState,
  activityId: string,
  patch: (current: IActivity) => Partial<IActivity>
): void {
  const list = get().myActivities;
  const next = list.map((a) =>
    a.activityId === activityId ? { ...a, ...patch(a), updatedAt: Timestamp.now() } : a
  );
  set(() => ({ myActivities: next }));
}

// ─── DEFAULT CONDITIONS BUILDERS ─────────────────────────────────────────────
// Useful when opening the negotiate screen — gives the form sensible
// starting points so the user only has to nudge from defaults.

export function defaultRunningConditions(now: Date = new Date()): IActivityConditions {
  // Tomorrow at 18:00.
  const dt = new Date(now);
  dt.setDate(dt.getDate() + 1);
  dt.setHours(18, 0, 0, 0);

  return {
    dateTime: Timestamp.fromDate(dt),
    locationName: 'Park Łazienkowski',
    locationGeo: new GeoPoint(52.2148, 21.0353),
    pace: '5:30',
    distance: 8,
  };
}
