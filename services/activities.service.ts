// services/activities.service.ts
// Firestore CRUD for the `activities` collection.
// SECURITY NOTE: chatUnlocked is NEVER set here — only by Cloud Function.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { IActivity, IActivityCreate, ActivityStatus } from '@/types';

const ACTIVITIES_COLLECTION = 'activities';

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single activity by ID.
 * Throws if the activity does not exist.
 */
export async function getActivity(activityId: string): Promise<IActivity> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, ACTIVITIES_COLLECTION, activityId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Activity ${activityId} not found`);
  }

  return { activityId: snap.id, ...snap.data() } as IActivity;
}

/**
 * Fetch all activities for a user (as initiator OR partner),
 * ordered by creation date descending.
 */
export async function getUserActivities(userId: string): Promise<IActivity[]> {
  if (!db) throw new Error('Firebase not configured');

  // Firestore can't OR across fields in one query — run two and merge.
  const [asInitiator, asPartner] = await Promise.all([
    getDocs(
      query(
        collection(db, ACTIVITIES_COLLECTION),
        where('initiatorId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
    getDocs(
      query(
        collection(db, ACTIVITIES_COLLECTION),
        where('partnerId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    ),
  ]);

  const seen = new Set<string>();
  const results: IActivity[] = [];

  for (const snap of [...asInitiator.docs, ...asPartner.docs]) {
    if (!seen.has(snap.id)) {
      seen.add(snap.id);
      results.push({ activityId: snap.id, ...snap.data() } as IActivity);
    }
  }

  // Sort merged results by createdAt descending
  return results.sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis(),
  );
}

/**
 * Fetch activities filtered by status for a given user.
 */
export async function getUserActivitiesByStatus(
  userId: string,
  status: ActivityStatus,
): Promise<IActivity[]> {
  const all = await getUserActivities(userId);
  return all.filter((a) => a.status === status);
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * Create a new activity proposal.
 * chatUnlocked defaults to false and can only be changed by Cloud Function.
 */
export async function createActivity(data: IActivityCreate): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(collection(db, ACTIVITIES_COLLECTION));

  await setDoc(ref, {
    ...data,
    status: 'proposed',
    confirmedBy: [],
    chatUnlocked: false, // ONLY Cloud Function may set this to true
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * Update the status of an activity.
 * Only the initiator or partner may call this (enforced by Firestore rules).
 */
export async function updateActivityStatus(
  activityId: string,
  status: ActivityStatus,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, ACTIVITIES_COLLECTION, activityId);

  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update negotiated conditions on an activity (while status is 'proposed').
 */
export async function updateActivityConditions(
  activityId: string,
  conditions: Partial<IActivity['conditions']>,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, ACTIVITIES_COLLECTION, activityId);

  await updateDoc(ref, {
    conditions,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Record that a user confirms the activity is completed.
 * When both participants confirm, the Cloud Function sets chatUnlocked = true.
 */
export async function confirmActivityCompleted(
  activityId: string,
  userId: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, ACTIVITIES_COLLECTION, activityId);

  await updateDoc(ref, {
    confirmedBy: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel an activity.
 */
export async function cancelActivity(activityId: string): Promise<void> {
  await updateActivityStatus(activityId, 'cancelled');
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

/**
 * Hard-delete an activity document.
 * Only used for test cleanup — in production, cancel instead.
 */
export async function deleteActivity(activityId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, ACTIVITIES_COLLECTION, activityId);
  await deleteDoc(ref);
}
