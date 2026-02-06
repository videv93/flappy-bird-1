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
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userStreak: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
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

    const result = await getStreakData();

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

    const result = await getStreakData();

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

    const result = await getStreakData();

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to view streak data',
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns error when session has no user id', async () => {
    mockGetSession.mockResolvedValue({ user: { id: null } });

    const result = await getStreakData();

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to view streak data',
    });
  });

  it('handles database errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const result = await getStreakData();

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

    const result = await getStreakData();

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

  it('returns freezeUsedToday true when freeze is active', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      currentStreak: 10,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'),
      freezeUsedToday: true,
      freezesAvailable: 1,
    });

    const result = await getStreakData();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeUsedToday).toBe(true);
      expect(result.data.freezesAvailable).toBe(1);
    }
  });
});
