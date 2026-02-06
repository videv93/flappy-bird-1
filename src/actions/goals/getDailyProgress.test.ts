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
const mockAggregate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    readingSession: { aggregate: (...args: unknown[]) => mockAggregate(...args) },
  },
}));

import { getDailyProgress } from './getDailyProgress';

describe('getDailyProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns daily progress for authenticated user with goal', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
    mockAggregate.mockResolvedValue({ _sum: { duration: 1200 } }); // 20 minutes

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: { minutesRead: 20, goalMinutes: 30, goalMet: false },
    });
  });

  it('returns goalMet true when minutes exceed goal', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 15 });
    mockAggregate.mockResolvedValue({ _sum: { duration: 1800 } }); // 30 minutes

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: { minutesRead: 30, goalMinutes: 15, goalMet: true },
    });
  });

  it('returns goalMinutes null when user has no goal set', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: null });
    mockAggregate.mockResolvedValue({ _sum: { duration: 600 } });

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: { minutesRead: 10, goalMinutes: null, goalMet: false },
    });
  });

  it('handles zero reading sessions (null aggregate)', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
    mockAggregate.mockResolvedValue({ _sum: { duration: null } });

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: true,
      data: { minutesRead: 0, goalMinutes: 30, goalMet: false },
    });
  });

  it('defaults to UTC when no timezone provided', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 15 });
    mockAggregate.mockResolvedValue({ _sum: { duration: 0 } });

    const result = await getDailyProgress();

    expect(result.success).toBe(true);
    // Verify the aggregate was called with date bounds
    expect(mockAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          startedAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to view progress',
    });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('passes timezone-derived date bounds to aggregate query', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
    mockAggregate.mockResolvedValue({ _sum: { duration: 0 } });

    await getDailyProgress({ timezone: 'America/New_York' });

    expect(mockAggregate).toHaveBeenCalledTimes(1);
    const callArgs = mockAggregate.mock.calls[0][0];
    const { gte, lt } = callArgs.where.startedAt;

    // The bounds should be 24 hours apart
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('handles database errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
    mockAggregate.mockRejectedValue(new Error('DB error'));

    const result = await getDailyProgress({ timezone: 'UTC' });

    expect(result).toEqual({
      success: false,
      error: 'Failed to get daily progress',
    });
  });
});
