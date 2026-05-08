// __tests__/services/users.service.test.ts

// ─── MOCKS ───────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn((..._args: unknown[]) => ({
  id: (_args[2] as string) ?? 'generated-id',
}));
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

jest.mock('../../services/firebase', () => ({
  db: {},
}));

import {
  getUser,
  userExists,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  getUsersBySport,
  updateUserLocation,
} from '../../services/users.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const mockUserData = {
  name: 'Jan Kowalski',
  sport: 'running' as const,
  level: 'intermediate' as const,
  bio: 'Biegam po Warszawie',
  stats: { avgPace: '5:00', weeklyKm: 30, activeDays: 4 },
  blocked: [],
};

function makeSnap(exists: boolean, data: Record<string, unknown> = {}, id = 'user1') {
  return {
    exists: () => exists,
    id,
    data: () => data,
  };
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getUser', () => {
  it('returns user data when document exists', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(true, mockUserData, 'user1'));

    const user = await getUser('user1');

    expect(user.userId).toBe('user1');
    expect(user.name).toBe('Jan Kowalski');
    expect(user.sport).toBe('running');
  });

  it('throws when user does not exist', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(false));

    await expect(getUser('nonexistent')).rejects.toThrow('not found');
  });
});

describe('userExists', () => {
  it('returns true when user exists', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(true));
    expect(await userExists('user1')).toBe(true);
  });

  it('returns false when user does not exist', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(false));
    expect(await userExists('ghost')).toBe(false);
  });
});

describe('createUser', () => {
  it('calls setDoc with user data and server timestamps', async () => {
    const data = { userId: 'user1', ...mockUserData } as any;

    await createUser(data);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, docData] = mockSetDoc.mock.calls[0];
    expect(docData.name).toBe('Jan Kowalski');
    expect(docData.createdAt).toBe('SERVER_TIMESTAMP');
    expect(docData.lastActive).toBe('SERVER_TIMESTAMP');
  });

  it('defaults blocked to empty array when not provided', async () => {
    const data = { userId: 'user2', ...mockUserData, blocked: undefined } as any;

    await createUser(data);

    const [, docData] = mockSetDoc.mock.calls[0];
    expect(docData.blocked).toEqual([]);
  });
});

describe('updateUser', () => {
  it('calls updateDoc with data and bumps lastActive', async () => {
    await updateUser('user1', { name: 'Nowe Imię' });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, docData] = mockUpdateDoc.mock.calls[0];
    expect(docData.name).toBe('Nowe Imię');
    expect(docData.lastActive).toBe('SERVER_TIMESTAMP');
  });
});

describe('deleteUser', () => {
  it('calls deleteDoc with correct reference', async () => {
    await deleteUser('user1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'user1');
  });
});

describe('blockUser', () => {
  it('adds userId to blocked array', async () => {
    mockGetDoc.mockResolvedValue(
      makeSnap(true, { ...mockUserData, blocked: [] }, 'user1'),
    );

    await blockUser('user1', 'bully99');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, docData] = mockUpdateDoc.mock.calls[0];
    expect(docData.blocked).toContain('bully99');
  });

  it('does not duplicate if already blocked', async () => {
    mockGetDoc.mockResolvedValue(
      makeSnap(true, { ...mockUserData, blocked: ['bully99'] }, 'user1'),
    );

    await blockUser('user1', 'bully99');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('unblockUser', () => {
  it('removes userId from blocked array', async () => {
    mockGetDoc.mockResolvedValue(
      makeSnap(true, { ...mockUserData, blocked: ['bully99', 'troll42'] }, 'user1'),
    );

    await unblockUser('user1', 'bully99');

    const [, docData] = mockUpdateDoc.mock.calls[0];
    expect(docData.blocked).toEqual(['troll42']);
  });
});

describe('getUsersBySport', () => {
  it('returns array of users matching the sport', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        makeSnap(true, { ...mockUserData, name: 'Anna' }, 'u1'),
        makeSnap(true, { ...mockUserData, name: 'Bartek' }, 'u2'),
      ],
    });

    const users = await getUsersBySport('running');

    expect(users).toHaveLength(2);
    expect(users[0].userId).toBe('u1');
    expect(users[1].name).toBe('Bartek');
  });

  it('returns empty array when no users found', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const users = await getUsersBySport('climbing');

    expect(users).toEqual([]);
  });
});

describe('updateUserLocation', () => {
  it('updates location and geohash', async () => {
    const fakeGeoPoint = { latitude: 52.23, longitude: 21.01 };

    await updateUserLocation('user1', fakeGeoPoint as any, 'u3qcnhh');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, docData] = mockUpdateDoc.mock.calls[0];
    expect(docData.location).toEqual(fakeGeoPoint);
    expect(docData.geohash).toBe('u3qcnhh');
  });
});
