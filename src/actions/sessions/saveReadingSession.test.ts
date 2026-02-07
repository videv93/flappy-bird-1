import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveReadingSession } from './saveReadingSession';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userBook: {
      findFirst: vi.fn(),
    },
    readingSession: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock('@/actions/streaks/updateStreakOnGoalMet', () => ({
  updateStreakInternal: vi.fn().mockResolvedValue({
    streakUpdated: false,
    currentStreak: 0,
    longestStreak: 0,
    wasReset: false,
    reason: 'goal_not_met',
    freezesEarned: 0,
    freezesAvailable: 0,
  }),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { updateStreakInternal } from '@/actions/streaks/updateStreakOnGoalMet';

const mockAuth = vi.mocked(auth.api.getSession);
const mockFindFirst = vi.mocked(prisma.userBook.findFirst);
const mockCreate = vi.mocked(prisma.readingSession.create);
const mockUpdateStreak = vi.mocked(updateStreakInternal);

const validInput = {
  bookId: 'book-123',
  duration: 120,
  startedAt: '2026-02-06T10:00:00.000Z',
  endedAt: '2026-02-06T10:02:00.000Z',
};

describe('saveReadingSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com', emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'session-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
    });
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('You must be logged in to save a session');
    }
  });

  it('returns error for duration under 60 seconds', async () => {
    const result = await saveReadingSession({
      ...validInput,
      duration: 30,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Sessions under 1 minute");
    }
  });

  it('returns error when book not in library', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Book not found in your library');
    }
  });

  it('creates a reading session successfully', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ub-1',
      userId: 'user-1',
      bookId: 'book-123',
      status: 'CURRENTLY_READING',
      progress: 50,
      dateAdded: new Date(),
      dateFinished: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockSession = {
      id: 'rs-1',
      userId: 'user-1',
      bookId: 'book-123',
      duration: 120,
      startedAt: new Date('2026-02-06T10:00:00.000Z'),
      endedAt: new Date('2026-02-06T10:02:00.000Z'),
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreate.mockResolvedValue(mockSession);

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('rs-1');
      expect(result.data.duration).toBe(120);
    }
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-123',
        duration: 120,
        startedAt: new Date('2026-02-06T10:00:00.000Z'),
        endedAt: new Date('2026-02-06T10:02:00.000Z'),
      },
    });
  });

  it('validates bookId is required', async () => {
    const result = await saveReadingSession({
      ...validInput,
      bookId: '',
    });

    expect(result.success).toBe(false);
  });

  it('validates datetime format for startedAt', async () => {
    const result = await saveReadingSession({
      ...validInput,
      startedAt: 'not-a-date',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid session data');
    }
  });

  it('queries userBook with correct filters (not deleted)', async () => {
    mockFindFirst.mockResolvedValue(null);

    await saveReadingSession(validInput);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        bookId: 'book-123',
        deletedAt: null,
      },
    });
  });

  it('calls updateStreakInternal after successful save', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ub-1',
      userId: 'user-1',
      bookId: 'book-123',
      status: 'CURRENTLY_READING',
      progress: 50,
      dateAdded: new Date(),
      dateFinished: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCreate.mockResolvedValue({
      id: 'rs-1',
      userId: 'user-1',
      bookId: 'book-123',
      duration: 120,
      startedAt: new Date(),
      endedAt: new Date(),
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUpdateStreak.mockResolvedValue({
      streakUpdated: true,
      currentStreak: 3,
      longestStreak: 5,
      wasReset: false,
      reason: 'goal_met_streak_incremented',
      freezesEarned: 0,
      freezesAvailable: 0,
    });

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(true);
    expect(mockUpdateStreak).toHaveBeenCalledWith('user-1', 'UTC');
    if (result.success) {
      expect(result.data.streakUpdate).toBeDefined();
      expect(result.data.streakUpdate?.currentStreak).toBe(3);
    }
  });

  it('succeeds even when streak update fails', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ub-1',
      userId: 'user-1',
      bookId: 'book-123',
      status: 'CURRENTLY_READING',
      progress: 50,
      dateAdded: new Date(),
      dateFinished: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCreate.mockResolvedValue({
      id: 'rs-1',
      userId: 'user-1',
      bookId: 'book-123',
      duration: 120,
      startedAt: new Date(),
      endedAt: new Date(),
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUpdateStreak.mockRejectedValue(new Error('Streak DB error'));

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('rs-1');
      expect(result.data.streakUpdate).toBeNull();
    }
  });

  it('includes streakUpdate result in successful response', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'ub-1',
      userId: 'user-1',
      bookId: 'book-123',
      status: 'CURRENTLY_READING',
      progress: 50,
      dateAdded: new Date(),
      dateFinished: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCreate.mockResolvedValue({
      id: 'rs-1',
      userId: 'user-1',
      bookId: 'book-123',
      duration: 120,
      startedAt: new Date(),
      endedAt: new Date(),
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUpdateStreak.mockResolvedValue({
      streakUpdated: true,
      currentStreak: 1,
      longestStreak: 1,
      wasReset: true,
      reason: 'goal_met_streak_reset',
      message: 'Fresh start! Day 1 of your new streak.',
      freezesEarned: 0,
      freezesAvailable: 0,
    });

    const result = await saveReadingSession(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdate?.wasReset).toBe(true);
      expect(result.data.streakUpdate?.message).toBe('Fresh start! Day 1 of your new streak.');
    }
  });
});
