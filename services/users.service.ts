// services/users.service.ts
// Firestore CRUD operations for the `users` collection.
// All functions work with IUser from @/types.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { IUser, IUserCreate } from '@/types';

const USERS_COLLECTION = 'users';

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single user by their userId (Firebase Auth UID).
 * Throws if the user does not exist.
 */
export async function getUser(userId: string): Promise<IUser> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, USERS_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`User ${userId} not found`);
  }

  return { userId: snap.id, ...snap.data() } as IUser;
}

/**
 * Check whether a user profile exists in Firestore.
 */
export async function userExists(userId: string): Promise<boolean> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, USERS_COLLECTION, userId);
  const snap = await getDoc(ref);
  return snap.exists();
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * Create a new user profile in Firestore.
 * The userId field must match the Firebase Auth UID.
 * Adds server-generated timestamps for createdAt and lastActive.
 */
export async function createUser(data: IUserCreate): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, USERS_COLLECTION, data.userId);
  await setDoc(ref, {
    ...data,
    blocked: data.blocked ?? [],
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  });
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * Update specific fields on an existing user profile.
 * Automatically bumps lastActive to the current server time.
 */
export async function updateUser(
  userId: string,
  data: Partial<Omit<IUser, 'userId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, {
    ...data,
    lastActive: serverTimestamp(),
  });
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

/**
 * Delete a user profile from Firestore.
 * Note: does NOT delete the Firebase Auth account — that must be done separately.
 */
export async function deleteUser(userId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, USERS_COLLECTION, userId);
  await deleteDoc(ref);
}

// ─── BLOCKING ────────────────────────────────────────────────────────────────

/**
 * Block another user. Adds their userId to the `blocked` array.
 * Uses arrayUnion-like logic manually to avoid importing arrayUnion
 * and to keep the blocked list deduplicated.
 */
export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  const user = await getUser(userId);
  const blocked = user.blocked ?? [];

  if (blocked.includes(blockedUserId)) return;

  await updateUser(userId, {
    blocked: [...blocked, blockedUserId],
  });
}

/**
 * Unblock a user. Removes their userId from the `blocked` array.
 */
export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  const user = await getUser(userId);
  const blocked = (user.blocked ?? []).filter((id) => id !== blockedUserId);

  await updateUser(userId, { blocked });
}

// ─── QUERY ───────────────────────────────────────────────────────────────────

/**
 * Fetch all users practicing a given sport.
 * Used as a starting point before applying geolocation filtering.
 */
export async function getUsersBySport(sport: IUser['sport']): Promise<IUser[]> {
  if (!db) throw new Error('Firebase not configured');
  const q = query(collection(db, USERS_COLLECTION), where('sport', '==', sport));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({ userId: docSnap.id, ...docSnap.data() }) as IUser);
}

/**
 * Update the user's geolocation data (position + geohash).
 */
export async function updateUserLocation(
  userId: string,
  location: IUser['location'],
  geohash: string
): Promise<void> {
  await updateUser(userId, { location, geohash });
}
