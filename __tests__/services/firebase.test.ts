// __tests__/services/firebase.test.ts
// Pierwszy test projektu — weryfikuje że Firebase inicjalizuje się poprawnie.

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

describe('Firebase initialization', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('eksportuje instancję auth', () => {
    const { auth } = require('../../services/firebase');
    expect(auth).toBeDefined();
  });

  it('eksportuje instancję db (Firestore)', () => {
    const { db } = require('../../services/firebase');
    expect(db).toBeDefined();
  });

  it('nie wywołuje initializeApp ponownie gdy app już istnieje', () => {
    const firebaseApp = require('firebase/app');
    (firebaseApp.getApps as jest.Mock).mockReturnValue([{ name: '[DEFAULT]' }]);

    require('../../services/firebase');

    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
  });
});
