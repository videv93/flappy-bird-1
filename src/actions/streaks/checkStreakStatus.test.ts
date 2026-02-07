import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkStreakStatus } from './checkStreakStatus';

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
    userStreak: { findUnique: vi.fn() },
    dailyProgress: { findFirst: vi.fn() },
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
const mockGetDateInTimezone = vi.mocked(getDateInTimezone);

describe('checkStreakStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', emailVerified: false, name: 'Test', createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'sess-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    } as unknown);
  });

  it('returns defaults when no streak record exists', async () => {
    mockStreakFind.mockResolvedValue(null);

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(0);
      expect(result.data.isAtRisk).toBe(false);
      expect(result.data.missedDays).toBe(0);
      expect(result.data.lastGoalMetDate).toBeNull();
    }
  });

  it('returns not at risk when yesterday goal was met', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsedToday: false,
    } as unknown);
    // today = 2026-02-06, lastMet = 2026-02-05 (yesterday)
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-05'); // lastGoalMetDate

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentStreak).toBe(5);
      expect(result.data.isAtRisk).toBe(false);
    }
  });

  it('returns not at risk when today goal was met', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-06T00:00:00.000Z'),
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-06'); // lastGoalMetDate = today

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAtRisk).toBe(false);
      expect(result.data.missedDays).toBe(0);
    }
  });

  it('returns at risk when yesterday was missed', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'), // 2 days ago
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-04') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday (from getYesterdayBounds.start)
    mockDailyProgressFind.mockResolvedValue(null); // no freeze yesterday

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAtRisk).toBe(true);
      expect(result.data.currentStreak).toBe(5);
    }
  });

  it('returns not at risk when yesterday was frozen', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 5,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-04T00:00:00.000Z'),
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-04') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday
    mockDailyProgressFind.mockResolvedValue({
      userId: 'user-1',
      date: new Date('2026-02-05T00:00:00.000Z'),
      freezeUsed: true,
    } as unknown);

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAtRisk).toBe(false);
    }
  });

  it('calculates correct missedDays for multi-day gap', async () => {
    mockStreakFind.mockResolvedValue({
      userId: 'user-1',
      currentStreak: 3,
      longestStreak: 10,
      lastGoalMetDate: new Date('2026-02-02T00:00:00.000Z'), // 4 days ago
      freezeUsedToday: false,
    } as unknown);
    mockGetDateInTimezone
      .mockReturnValueOnce('2026-02-06') // today
      .mockReturnValueOnce('2026-02-02') // lastGoalMetDate
      .mockReturnValueOnce('2026-02-05'); // yesterday
    mockDailyProgressFind.mockResolvedValue(null);

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAtRisk).toBe(true);
      expect(result.data.missedDays).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as unknown);

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'You must be logged in to check streak status' });
  });

  it('handles database errors gracefully', async () => {
    mockStreakFind.mockRejectedValue(new Error('DB error'));

    const result = await checkStreakStatus({ timezone: 'UTC' });

    expect(result).toEqual({ success: false, error: 'Failed to check streak status' });
  });
});
