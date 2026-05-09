// services/firebase.ts
// Inicjalizacja Firebase — jeden centralny punkt dla całej aplikacji.
// Wszystkie inne serwisy importują { db, auth } z tego pliku.
//
// Gdy brakuje kluczy API (development bez .env.local), eksportuje null
// zamiast crashować całą aplikację.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase credentials are configured
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  // Zabezpieczenie przed wielokrotną inicjalizacją (np. hot reload w Expo)
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    '[Sprinter] Firebase credentials missing. ' +
      'Create a .env.local file with your Firebase config. ' +
      'See CLAUDE.md for the required variables.'
  );
}

export { auth, db, isConfigured };
export default app;
