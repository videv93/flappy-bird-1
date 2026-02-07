import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDayDetail } from './getDayDetail';

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
      findFirst: vi.fn(),
    },
    readingSession: {
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/dates', () => ({
  getDayBounds: vi.fn().mockReturnValue({
    start: new Date('2026-02-01T00:00:00Z'),
    end: new Date('2026-02-02T00:00:00Z'),
  }),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.dailyProgress.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockSessionCount = prisma.readingSession.count as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('getDayDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ dailyGoalMinutes: 30 });
  });

  it('returns correct day detail with session count', async () => {
    mockFindFirst.mockResolvedValue({
      minutesRead: 45,
      goalMet: true,
      freezeUsed: false,
    });
    mockSessionCount.mockResolvedValue(3);

    const result = await getDayDetail({ date: '2026-02-01', timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe('2026-02-01');
      expect(result.data.minutesRead).toBe(45);
      expect(result.data.goalMet).toBe(true);
      expect(result.data.freezeUsed).toBe(false);
      expect(result.data.sessionCount).toBe(3);
      expect(result.data.goalMinutes).toBe(30);
    }
  });

  it('returns defaults when no DailyProgress for date', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockSessionCount.mockResolvedValue(0);

    const result = await getDayDetail({ date: '2026-02-01', timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minutesRead).toBe(0);
      expect(result.data.goalMet).toBe(false);
      expect(result.data.freezeUsed).toBe(false);
      expect(result.data.sessionCount).toBe(0);
    }
  });

  it('counts ReadingSession records correctly', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockSessionCount.mockResolvedValue(5);

    const result = await getDayDetail({ date: '2026-02-01', timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionCount).toBe(5);
    }
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getDayDetail({ date: '2026-02-01', timezone: 'UTC' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('logged in');
    }
  });

  it('shows freeze status correctly', async () => {
    mockFindFirst.mockResolvedValue({
      minutesRead: 0,
      goalMet: false,
      freezeUsed: true,
    });
    mockSessionCount.mockResolvedValue(0);

    const result = await getDayDetail({ date: '2026-02-01', timezone: 'UTC' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.freezeUsed).toBe(true);
      expect(result.data.goalMet).toBe(false);
    }
  });
});
