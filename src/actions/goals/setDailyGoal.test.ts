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
const mockUserUpdate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: (...args: unknown[]) => mockUserUpdate(...args) },
  },
}));

import { setDailyGoal } from './setDailyGoal';

describe('setDailyGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a valid daily goal for authenticated user', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserUpdate.mockResolvedValue({ id: 'user-1', dailyGoalMinutes: 30 });

    const result = await setDailyGoal({ dailyGoalMinutes: 30 });

    expect(result).toEqual({
      success: true,
      data: { dailyGoalMinutes: 30 },
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { dailyGoalMinutes: 30 },
    });
  });

  it('rejects goal of 0', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await setDailyGoal({ dailyGoalMinutes: 0 });

    expect(result).toEqual({
      success: false,
      error: 'Invalid goal value',
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects negative goal', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await setDailyGoal({ dailyGoalMinutes: -5 });

    expect(result).toEqual({
      success: false,
      error: 'Invalid goal value',
    });
  });

  it('rejects goal exceeding 480 minutes', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await setDailyGoal({ dailyGoalMinutes: 481 });

    expect(result).toEqual({
      success: false,
      error: 'Invalid goal value',
    });
  });

  it('rejects non-integer goal', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await setDailyGoal({ dailyGoalMinutes: 30.5 });

    expect(result).toEqual({
      success: false,
      error: 'Invalid goal value',
    });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await setDailyGoal({ dailyGoalMinutes: 15 });

    expect(result).toEqual({
      success: false,
      error: 'You must be logged in to set a goal',
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserUpdate.mockRejectedValue(new Error('DB connection failed'));

    const result = await setDailyGoal({ dailyGoalMinutes: 15 });

    expect(result).toEqual({
      success: false,
      error: 'Failed to set daily goal',
    });
  });
});
