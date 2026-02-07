import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStreakFreeze } from './useStreakFreeze';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userStreak: { findUnique: vi.fn(), update: vi.fn() },
    dailyProgress: { findFirst: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/dates', () => ({
  getDateInTimezone: vi.fn((date: Date) => date.toISOString().split('T')[0]),
  getYesterdayBounds: vi.fn().mockReturnValue({
    start: new Date('2026-02-05T00:00:00.000Z'),
    end: new Date('2026-02-06T00:00:00.000Z'),
  }),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateInTimezone } from '@/lib/dates';

const mockAuth = vi.mocked(auth.api.getSession);
const mockStreakFind = vi.mocked(prisma.userStreak.findUnique);
const mockDailyProgressFind = vi.mocked(prisma.dailyProgress.findFirst);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockGetDateInTimezone = vi.mocked(getDateInTimezone);

describe('useStreakFreeze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', emailVerified: false, name: 'Test', createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'sess-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    } as unknown);
    mockTransaction.mockImplementation((ops: unknown) => Promise.resolve(ops));
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown);

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'You must be logged in to use a streak freeze' });
  });

  it('returns no_streak_record when user has no streak', async () => {
    mockStreakFind.mockResolvedValue(null);

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('no_streak_record');
    }
  });

  it('returns no_freezes_available when freezesAvailable is 0', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 0,
    } as unknown);

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('no_freezes_available');
      expect(result.data.freezesRemaining).toBe(0);
    }
  });

  it('returns streak_not_at_risk when today goal was met', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-06T00:00:00.000Z'), // today
      freezeUsedToday: false,
      freezesAvailable: 3,
    } as unknown);
    mockGetDateInTimezone.mockReturnValue('2026-02-06');

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('streak_not_at_risk');
    }
  });

  it('returns streak_not_at_risk when yesterday goal was met', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'), // yesterday
      freezeUsedToday: false,
      freezesAvailable: 3,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-05') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday from bounds

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('streak_not_at_risk');
    }
  });

  it('returns already_frozen when yesterday is already frozen (idempotency)', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'), // 2 days ago
      freezeUsedToday: false,
      freezesAvailable: 3,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-04') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday
    // Yesterday already has freeze
    mockDailyProgressFind.mockResolvedValue({
      userId: 'user-1',
      date: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsed: true,
    } as unknown);

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('already_frozen');
    }
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('successfully applies freeze when streak is at risk', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'), // 2 days ago
      freezeUsedToday: false,
      freezesAvailable: 3,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-04') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday
    mockDailyProgressFind.mockResolvedValue(null); // no freeze yesterday yet

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(true);
      expect(result.data.reason).toBe('freeze_applied');
      expect(result.data.freezesRemaining).toBe(2);
      expect(result.data.currentStreak).toBe(5);
    }
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('handles database errors gracefully', async () => {
    mockStreakFind.mockRejectedValue(new Error('DB error'));

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'Failed to apply streak freeze' });
  });

  it('returns streak_not_at_risk when streak is 0', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 0,
      longestStreak: 5,
      lastGoalMetDate: new Date('2026-02-01T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 2,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-01') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday
    mockDailyProgressFind.mockResolvedValue(null);

    const result = await useStreakFreeze({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeApplied).toBe(false);
      expect(result.data.reason).toBe('streak_not_at_risk');
    }
  });
});
