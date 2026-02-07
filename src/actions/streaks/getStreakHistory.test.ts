import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStreakHistory } from './getStreakHistory';

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
    dailyProgress: {
      findMany: vi.fn(),
    },
    userStreak: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.dailyProgress.findMany as unknown as ReturnType<typeof vi.fn>;
const mockStreakFindUnique = prisma.userStreak.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('getStreakHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
  });

  it('returns empty history when no DailyProgress records exist', async () => {
    mockFindMany.mockResolvedValue([]);
    mockStreakFindUnique.mockResolvedValue(null);

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toEqual([]);
      expect(result.data.currentStreak).toBe(0);
      expect(result.data.longestStreak).toBe(0);
    }
  });

  it('returns correct history for 90-day range', async () => {
    const mockRecords = [
      { date: new Date('2026-01-01T00:00:00Z'), minutesRead: 30, goalMet: true, freezeUsed: false },
      { date: new Date('2026-01-02T00:00:00Z'), minutesRead: 0, goalMet: false, freezeUsed: true },
      { date: new Date('2026-01-03T00:00:00Z'), minutesRead: 10, goalMet: false, freezeUsed: false },
    ];
    mockFindMany.mockResolvedValue(mockRecords);
    mockStreakFindUnique.mockResolvedValue({ currentStreak: 5, longestStreak: 10 });

    const result = await getStreakHistory({ timezone: 'UTC', days: 90 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history).toHaveLength(3);
      expect(result.data.currentStreak).toBe(5);
      expect(result.data.longestStreak).toBe(10);
    }
  });

  it('includes goalMet and freezeUsed flags correctly', async () => {
    const mockRecords = [
      { date: new Date('2026-01-01T00:00:00Z'), minutesRead: 30, goalMet: true, freezeUsed: false },
      { date: new Date('2026-01-02T00:00:00Z'), minutesRead: 0, goalMet: false, freezeUsed: true },
    ];
    mockFindMany.mockResolvedValue(mockRecords);
    mockStreakFindUnique.mockResolvedValue({ currentStreak: 2, longestStreak: 2 });

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history[0].goalMet).toBe(true);
      expect(result.data.history[0].freezeUsed).toBe(false);
      expect(result.data.history[1].goalMet).toBe(false);
      expect(result.data.history[1].freezeUsed).toBe(true);
    }
  });

  it('returns current and longest streak from UserStreak', async () => {
    mockFindMany.mockResolvedValue([]);
    mockStreakFindUnique.mockResolvedValue({ currentStreak: 7, longestStreak: 30 });

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(7);
      expect(result.data.longestStreak).toBe(30);
    }
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('logged in');
    }
  });

  it('handles missing UserStreak gracefully with defaults', async () => {
    mockFindMany.mockResolvedValue([]);
    mockStreakFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(0);
      expect(result.data.longestStreak).toBe(0);
      expect(result.data.dailyGoalMinutes).toBeNull();
    }
  });

  it('returns dailyGoalMinutes from user record', async () => {
    mockFindMany.mockResolvedValue([]);
    mockStreakFindUnique.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue({ dailyGoalMinutes: 15 });

    const result = await getStreakHistory({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dailyGoalMinutes).toBe(15);
    }
  });

  it('queries with correct date range', async () => {
    mockFindMany.mockResolvedValue([]);
    mockStreakFindUnique.mockResolvedValue(null);

    await getStreakHistory({ timezone: 'UTC', days: 30 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          date: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
        orderBy: { date: 'asc' },
      })
    );
  });
});
