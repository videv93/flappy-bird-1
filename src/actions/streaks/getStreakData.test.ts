import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock auth
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

// Mock prisma
const mockFindUnique = vi.fn();
const mockDailyProgressFindFirst = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userStreak: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    dailyProgress: { findFirst: (...args: unknown[]) => mockDailyProgressFindFirst(...args) },
  },
}));

// Mock dates
vi.mock('@/lib/dates', () => ({
  getTodayBounds: vi.fn().mockReturnValue({
    start: new Date('2026-02-06T00:00:00.000Z'),
    end: new Date('2026-02-07T00:00:00.000Z'),
  }),
}));

import { getStreakData } from './getStreakData';

describe('getStreakData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns streak data for authenticated user with existing streak', async () => {
    const lastGoalMet = new Date('2026-02-05T00:00:00.000Z');
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      currentStreak: 7,
      longestStreak: 14,
      lastGoalMetDate: lastGoalMet,
      freezeUsedToday: false,
      freezesAvailable: 2,
    });
    mockDailyProgressFindFirst.mockResolvedValue(null);

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: {
        currentStreak: 7,
        longestStreak: 14,
        lastGoalMetDate: '2026-02-05T00:00:00.000Z',
        freezeUsedToday: false,
        freezesAvailable: 2,
      },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('returns defaults when no UserStreak record exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: {
        currentStreak: 0,
        longestStreak: 0,
        lastGoalMetDate: null,
        freezeUsedToday: false,
        freezesAvailable: 0,
      },
    });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to view streak data',
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns error when session has no user id', async () => {
    mockGetSession.mockResolvedValue({ user: { id: null } });

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to view streak data',
    });
  });

  it('handles database errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: false,
      error: 'Failed to get streak data',
    });
  });

  it('returns null lastGoalMetDate when streak exists but date is null', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 3,
      lastGoalMetDate: null,
      freezeUsedToday: false,
      freezesAvailable: 0,
    });
    mockDailyProgressFindFirst.mockResolvedValue(null);

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: {
        currentStreak: 3,
        longestStreak: 3,
        lastGoalMetDate: null,
        freezeUsedToday: false,
        freezesAvailable: 0,
      },
    });
  });

  it('returns freezeUsedToday true when today has a freeze in DailyProgress', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      currentStreak: 10,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'),
      freezeUsedToday: true, // stale DB flag — ignored by getStreakData
      freezesAvailable: 1,
    });
    // Dynamic check: today's DailyProgress has a freeze
    mockDailyProgressFindFirst.mockResolvedValue({
      userId: 'user-1',
      date: new Date('2026-02-06T00:00:00.000Z'),
      freezeUsed: true,
    });

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeUsedToday).toBe(true);
      expect(result.data.freezesAvailable).toBe(1);
    }
  });

  it('returns freezeUsedToday false even when DB flag is stale true', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      currentStreak: 10,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'),
      freezeUsedToday: true, // stale from previous day
      freezesAvailable: 1,
    });
    // No freeze today in DailyProgress
    mockDailyProgressFindFirst.mockResolvedValue(null);

    const result = await getStreakData({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeUsedToday).toBe(false);
    }
  });
});
