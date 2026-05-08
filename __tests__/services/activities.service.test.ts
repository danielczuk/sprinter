// __tests__/services/activities.service.test.ts

// ─── MOCKS ───────────────────────────────────────────────────────────────────

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn((..._args: unknown[]) => ({
  id: (_args[2] as string | undefined) ?? 'generated-id',
}));
const mockCollection = jest.fn((..._args: unknown[]) => ({ id: 'activities' }));
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockArrayUnion = jest.fn((...args: string[]) => args);

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
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  arrayUnion: (...args: string[]) => mockArrayUnion(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

jest.mock('../../services/firebase', () => ({
  db: { type: 'firestore' },
}));

import {
  getActivity,
  getUserActivities,
  getUserActivitiesByStatus,
  createActivity,
  updateActivityStatus,
  updateActivityConditions,
  confirmActivityCompleted,
  cancelActivity,
  deleteActivity,
} from '../../services/activities.service';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const baseActivity = {
  initiatorId: 'user1',
  partnerId: 'user2',
  sport: 'running' as const,
  status: 'proposed' as const,
  conditions: {
    dateTime: { toMillis: () => 1000 } as any,
    locationName: 'Park Łazienkowski',
    locationGeo: {} as any,
    pace: '5:30',
    distance: 10,
  },
  confirmedBy: [],
  chatUnlocked: false,
  createdAt: { toMillis: () => 2000 } as any,
  updatedAt: { toMillis: () => 2000 } as any,
};

function makeSnap(exists: boolean, data: Record<string, unknown> = {}, id = 'act1') {
  return { exists: () => exists, id, data: () => data };
}

function makeDocs(items: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: items.map(({ id, data }) => makeSnap(true, data, id)) };
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('getActivity', () => {
  it('returns activity when it exists', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(true, baseActivity, 'act1'));

    const activity = await getActivity('act1');

    expect(activity.activityId).toBe('act1');
    expect(activity.sport).toBe('running');
    expect(activity.status).toBe('proposed');
  });

  it('throws when activity does not exist', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(false));

    await expect(getActivity('missing')).rejects.toThrow('not found');
  });
});

describe('createActivity', () => {
  it('creates activity with proposed status and chatUnlocked = false', async () => {
    const data = {
      initiatorId: 'user1',
      partnerId: 'user2',
      sport: 'running' as const,
      status: 'proposed' as const,
      conditions: baseActivity.conditions,
    };

    await createActivity(data);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, docData] = mockSetDoc.mock.calls[0];
    expect(docData.status).toBe('proposed');
    expect(docData.chatUnlocked).toBe(false);
    expect(docData.confirmedBy).toEqual([]);
    expect(docData.createdAt).toBe('SERVER_TIMESTAMP');
  });

  it('returns the new document ID', async () => {
    const id = await createActivity({
      initiatorId: 'user1',
      partnerId: 'user2',
      sport: 'cycling' as const,
      status: 'proposed' as const,
      conditions: baseActivity.conditions,
    });

    expect(typeof id).toBe('string');
  });
});

describe('updateActivityStatus', () => {
  it('updates status and bumps updatedAt', async () => {
    await updateActivityStatus('act1', 'confirmed');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data.status).toBe('confirmed');
    expect(data.updatedAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('cancelActivity', () => {
  it('sets status to cancelled', async () => {
    await cancelActivity('act1');

    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data.status).toBe('cancelled');
  });
});

describe('updateActivityConditions', () => {
  it('updates conditions and bumps updatedAt', async () => {
    const newConditions = { pace: '5:00', distance: 15 };

    await updateActivityConditions('act1', newConditions as any);

    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(data.conditions).toEqual(newConditions);
    expect(data.updatedAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('confirmActivityCompleted', () => {
  it('adds userId to confirmedBy via arrayUnion', async () => {
    await confirmActivityCompleted('act1', 'user1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockUpdateDoc.mock.calls[0];
    expect(mockArrayUnion).toHaveBeenCalledWith('user1');
    expect(data.updatedAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('getUserActivities', () => {
  it('returns merged and deduplicated activities for a user', async () => {
    // user1 is initiator of act1, partner in act2
    mockGetDocs
      .mockResolvedValueOnce(makeDocs([{ id: 'act1', data: { ...baseActivity, createdAt: { toMillis: () => 3000 } } }]))
      .mockResolvedValueOnce(makeDocs([{ id: 'act2', data: { ...baseActivity, initiatorId: 'user3', partnerId: 'user1', createdAt: { toMillis: () => 2000 } } }]));

    const activities = await getUserActivities('user1');

    expect(activities).toHaveLength(2);
    // Should be sorted by createdAt descending
    expect(activities[0].activityId).toBe('act1');
    expect(activities[1].activityId).toBe('act2');
  });

  it('deduplicates if same activity appears in both queries', async () => {
    // Edge case: same doc returned from both queries
    mockGetDocs
      .mockResolvedValueOnce(makeDocs([{ id: 'act1', data: baseActivity }]))
      .mockResolvedValueOnce(makeDocs([{ id: 'act1', data: baseActivity }]));

    const activities = await getUserActivities('user1');

    expect(activities).toHaveLength(1);
  });

  it('returns empty array when user has no activities', async () => {
    mockGetDocs.mockResolvedValue(makeDocs([]));

    const activities = await getUserActivities('nobody');

    expect(activities).toEqual([]);
  });
});

describe('getUserActivitiesByStatus', () => {
  it('filters by status', async () => {
    mockGetDocs
      .mockResolvedValueOnce(makeDocs([
        { id: 'act1', data: { ...baseActivity, status: 'proposed' } },
        { id: 'act2', data: { ...baseActivity, status: 'confirmed' } },
      ]))
      .mockResolvedValueOnce(makeDocs([]));

    const proposed = await getUserActivitiesByStatus('user1', 'proposed');

    expect(proposed).toHaveLength(1);
    expect(proposed[0].status).toBe('proposed');
  });
});

describe('deleteActivity', () => {
  it('calls deleteDoc with correct reference', async () => {
    await deleteActivity('act1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'activities', 'act1');
  });
});
