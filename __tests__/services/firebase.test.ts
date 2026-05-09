// __tests__/services/firebase.test.ts
// Tests for Firebase initialization — both configured and unconfigured states.
//
// We use require() rather than import here because each test resets modules
// (jest.resetModules) and reloads firebase.ts under a different process.env.
// import-based hoisting would not see the env mutations.
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
}));

describe('Firebase initialization — with config', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  });

  it('eksportuje instancję auth gdy config istnieje', () => {
    const { auth } = require('../../services/firebase');
    expect(auth).toBeDefined();
    expect(auth).not.toBeNull();
  });

  it('eksportuje instancję db (Firestore) gdy config istnieje', () => {
    const { db } = require('../../services/firebase');
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
  });

  it('eksportuje isConfigured = true', () => {
    const { isConfigured } = require('../../services/firebase');
    expect(isConfigured).toBe(true);
  });

  it('nie wywołuje initializeApp ponownie gdy app już istnieje', () => {
    const firebaseApp = require('firebase/app');
    (firebaseApp.getApps as jest.Mock).mockReturnValue([{ name: '[DEFAULT]' }]);

    require('../../services/firebase');

    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
  });
});

describe('Firebase initialization — without config', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    delete process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  });

  it('eksportuje null dla auth i db gdy brakuje config', () => {
    const { auth, db } = require('../../services/firebase');
    expect(auth).toBeNull();
    expect(db).toBeNull();
  });

  it('eksportuje isConfigured = false', () => {
    const { isConfigured } = require('../../services/firebase');
    expect(isConfigured).toBe(false);
  });
});
