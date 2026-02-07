import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStreakOnGoalMet } from './updateStreakOnGoalMet';

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
    user: { findUnique: vi.fn() },
    readingSession: { aggregate: vi.fn() },
    userStreak: { findUnique: vi.fn(), upsert: vi.fn() },
    dailyProgress: { findFirst: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/dates', () => ({
  getTodayBounds: vi.fn().mockReturnValue({
    start: new Date('2026-02-06T00:00:00.000Z'),
    end: new Date('2026-02-07T00:00:00.000Z'),
  }),
  getYesterdayBounds: vi.fn().mockReturnValue({
    start: new Date('2026-02-05T00:00:00.000Z'),
    end: new Date('2026-02-06T00:00:00.000Z'),
  }),
  getDateInTimezone: vi.fn((date: Date) => {
    return date.toISOString().split('T')[0];
  }),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateInTimezone } from '@/lib/dates';

const mockAuth = vi.mocked(auth.api.getSession);
const mockUserFind = vi.mocked(prisma.user.findUnique);
const mockAggregate = vi.mocked(prisma.readingSession.aggregate);
const mockStreakFind = vi.mocked(prisma.userStreak.findUnique);
const mockDailyProgressFind = vi.mocked(prisma.dailyProgress.findFirst);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockGetDateInTimezone = vi.mocked(getDateInTimezone);

describe('updateStreakOnGoalMet', () => {
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

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'You must be logged in to update streak' });
  });

  it('returns no_goal_set when user has no daily goal', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: null } as unknown);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('no_goal_set');
      expect(result.data.streakUpdated).toBe(false);
    }
  });

  it('returns goal_not_met when minutes below goal', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 30 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1500 } } as unknown); // 25 min

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('goal_not_met');
      expect(result.data.streakUpdated).toBe(false);
    }
  });

  it('creates new streak on first-ever goal met (AC #7)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown); // 20 min
    mockStreakFind.mockResolvedValue(null);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdated).toBe(true);
      expect(result.data.currentStreak).toBe(1);
      expect(result.data.longestStreak).toBe(1);
      expect(result.data.wasReset).toBe(false);
      expect(result.data.reason).toBe('goal_met_streak_incremented');
    }
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('increments streak on consecutive day (AC #2)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'), // yesterday
      freezeUsedToday: false,
    } as unknown);
    // lastGoalMetDate returns yesterday's date string
    mockGetDateInTimezone.mockImplementation((date: Date) => {
      const iso = date.toISOString().split('T')[0];
      return iso;
    });

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdated).toBe(true);
      expect(result.data.currentStreak).toBe(6);
      expect(result.data.longestStreak).toBe(10);
      expect(result.data.wasReset).toBe(false);
    }
  });

  it('resets streak on missed day (AC #3)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 10,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-03T00:00:00.000Z'), // 3 days ago
      freezeUsedToday: false,
    } as unknown);
    mockDailyProgressFind.mockResolvedValue(null); // no freeze yesterday
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdated).toBe(true);
      expect(result.data.currentStreak).toBe(1);
      expect(result.data.wasReset).toBe(true);
      expect(result.data.reason).toBe('goal_met_streak_reset');
      expect(result.data.message).toBe('Fresh start! Day 1 of your new streak.');
    }
  });

  it('returns already_credited_today for same-day idempotency (AC #6)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 5,
      lastGoalMetDate: new Date('2026-02-06T00:00:00.000Z'), // today
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone.mockReturnValue('2026-02-06');

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdated).toBe(false);
      expect(result.data.reason).toBe('already_credited_today');
      expect(result.data.currentStreak).toBe(5);
    }
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('continues streak when yesterday was frozen (AC #8)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 7,
      longestStreak: 7,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'), // 2 days ago
      freezeUsedToday: false,
    } as unknown);
    // Yesterday had a freeze
    mockDailyProgressFind.mockResolvedValue({
      userId: 'user-1',
      date: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsed: true,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streakUpdated).toBe(true);
      expect(result.data.currentStreak).toBe(8);
      expect(result.data.wasReset).toBe(false);
    }
  });

  it('resets streak on multi-day gap (AC #9)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 20,
      longestStreak: 20,
      lastGoalMetDate: new Date('2026-01-30T00:00:00.000Z'), // 7 days ago
      freezeUsedToday: false,
    } as unknown);
    mockDailyProgressFind.mockResolvedValue(null); // no freeze yesterday
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(1);
      expect(result.data.wasReset).toBe(true);
      expect(result.data.longestStreak).toBe(20); // preserved
    }
  });

  it('updates longestStreak when currentStreak exceeds it', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 10,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(11);
      expect(result.data.longestStreak).toBe(11);
    }
  });

  it('calls $transaction for atomic updates', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue(null);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('handles zero sessions gracefully', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: null } } as unknown);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('goal_not_met');
    }
  });

  it('handles database errors gracefully', async () => {
    mockUserFind.mockRejectedValue(new Error('DB error'));

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'Failed to update streak' });
  });

  // Freeze earning tests (Story 3.7)
  it('earns 1 freeze at 7-day milestone (AC #5)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 6,
      longestStreak: 6,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'), // yesterday
      freezeUsedToday: false,
      freezesAvailable: 0,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(7);
      expect(result.data.freezesEarned).toBe(1);
      expect(result.data.freezesAvailable).toBe(1);
      expect(result.data.message).toContain('earned');
    }
  });

  it('earns 3 freezes at 30-day milestone (AC #6)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 29,
      longestStreak: 29,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 1,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(30);
      expect(result.data.freezesEarned).toBe(3);
      expect(result.data.freezesAvailable).toBe(4);
    }
  });

  it('caps freezes at MAX_STREAK_FREEZES (5) (AC #7)', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 29,
      longestStreak: 29,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 4,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(30);
      expect(result.data.freezesEarned).toBe(3); // would earn 3
      expect(result.data.freezesAvailable).toBe(5); // capped at 5, not 7
      expect(result.data.message).toContain('Freeze bank full');
    }
  });

  it('returns freezesEarned: 0 for non-milestone streaks', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 4,
      longestStreak: 4,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 1,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(5);
      expect(result.data.freezesEarned).toBe(0);
      expect(result.data.freezesAvailable).toBe(1);
    }
  });

  it('earns 1 freeze at 14-day milestone', async () => {
    mockUserFind.mockResolvedValue({ dailyGoalMinutes: 15 } as unknown);
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } } as unknown);
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 13,
      longestStreak: 13,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
      freezesAvailable: 1,
    } as unknown);
    mockGetDateInTimezone.mockImplementation((date: Date) => date.toISOString().split('T')[0]);

    const result = await updateStreakOnGoalMet({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(14);
      expect(result.data.freezesEarned).toBe(1);
      expect(result.data.freezesAvailable).toBe(2);
    }
  });
});
