import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import {
  getMetricsTrends,
  fillMissingDays,
  calculatePercentageChange,
  detectAnomaly,
} from './getMetricsTrends';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockQueryRaw = (prisma as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw;

function setupAdminSession() {
  mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
  mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
}

describe('getMetricsTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getMetricsTrends();
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });
    const result = await getMetricsTrends();
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns 30-day trend data for all metric categories', async () => {
    setupAdminSession();
    // 8 raw queries: 4 current + 4 previous
    mockQueryRaw.mockResolvedValue([]);

    const result = await getMetricsTrends();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.newUsers.dataPoints).toHaveLength(30);
    expect(result.data.activeSessions.dataPoints).toHaveLength(30);
    expect(result.data.kudosGiven.dataPoints).toHaveLength(30);
    expect(result.data.newBooks.dataPoints).toHaveLength(30);
  });

  it('calculates percentage change between periods', async () => {
    setupAdminSession();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    // Current period: 10 users on one day
    mockQueryRaw
      .mockResolvedValueOnce([{ date: thirtyDaysAgo, count: BigInt(10) }]) // current users
      .mockResolvedValueOnce([{ date: thirtyDaysAgo, count: BigInt(5) }]) // previous users
      .mockResolvedValueOnce([]) // current sessions
      .mockResolvedValueOnce([]) // previous sessions
      .mockResolvedValueOnce([]) // current kudos
      .mockResolvedValueOnce([]) // previous kudos
      .mockResolvedValueOnce([]) // current books
      .mockResolvedValueOnce([]); // previous books

    const result = await getMetricsTrends();

    expect(result.success).toBe(true);
    if (!result.success) return;

    // 10 vs 5 = 100% increase
    expect(result.data.newUsers.percentageChange).toBe(100);
  });

  it('handles query errors gracefully', async () => {
    setupAdminSession();
    mockQueryRaw.mockRejectedValue(new Error('DB error'));

    const result = await getMetricsTrends();
    expect(result).toEqual({ success: false, error: 'Failed to fetch metrics trends' });
  });

  it('executes 8 raw queries in parallel', async () => {
    setupAdminSession();
    mockQueryRaw.mockResolvedValue([]);

    await getMetricsTrends();

    expect(mockQueryRaw).toHaveBeenCalledTimes(8);
  });
});

describe('fillMissingDays', () => {
  it('fills missing days with zero values', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const raw = [{ date: new Date('2026-01-03T00:00:00Z'), count: BigInt(5) }];

    const result = fillMissingDays(raw, start, 5);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ date: '2026-01-01', value: 0 });
    expect(result[1]).toEqual({ date: '2026-01-02', value: 0 });
    expect(result[2]).toEqual({ date: '2026-01-03', value: 5 });
    expect(result[3]).toEqual({ date: '2026-01-04', value: 0 });
    expect(result[4]).toEqual({ date: '2026-01-05', value: 0 });
  });

  it('converts bigint to number', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const raw = [{ date: new Date('2026-01-01T00:00:00Z'), count: BigInt(42) }];

    const result = fillMissingDays(raw, start, 1);
    expect(typeof result[0].value).toBe('number');
    expect(result[0].value).toBe(42);
  });

  it('handles empty raw data', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const result = fillMissingDays([], start, 3);

    expect(result).toHaveLength(3);
    expect(result.every((p) => p.value === 0)).toBe(true);
  });
});

describe('calculatePercentageChange', () => {
  it('calculates positive change', () => {
    const current = [{ date: '2026-01-01', value: 10 }];
    const previous = [{ date: '2025-12-02', value: 5 }];
    expect(calculatePercentageChange(current, previous)).toBe(100);
  });

  it('calculates negative change', () => {
    const current = [{ date: '2026-01-01', value: 3 }];
    const previous = [{ date: '2025-12-02', value: 10 }];
    expect(calculatePercentageChange(current, previous)).toBe(-70);
  });

  it('returns 0 when both periods are zero', () => {
    const current = [{ date: '2026-01-01', value: 0 }];
    const previous = [{ date: '2025-12-02', value: 0 }];
    expect(calculatePercentageChange(current, previous)).toBe(0);
  });

  it('returns 100 when previous is zero but current has data', () => {
    const current = [{ date: '2026-01-01', value: 5 }];
    const previous = [{ date: '2025-12-02', value: 0 }];
    expect(calculatePercentageChange(current, previous)).toBe(100);
  });
});

describe('detectAnomaly', () => {
  it('detects spike anomaly (>2 standard deviations)', () => {
    // 29 days of value 10, last day value 100
    const data = Array.from({ length: 29 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: 10,
    }));
    data.push({ date: '2026-01-30', value: 100 });

    expect(detectAnomaly(data)).toBe(true);
  });

  it('detects drop anomaly (>2 standard deviations)', () => {
    const data = Array.from({ length: 29 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: 100,
    }));
    data.push({ date: '2026-01-30', value: 0 });

    expect(detectAnomaly(data)).toBe(true);
  });

  it('returns false for normal variation', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: 10 + (i % 3),
    }));

    expect(detectAnomaly(data)).toBe(false);
  });

  it('returns false for insufficient data', () => {
    const data = [
      { date: '2026-01-01', value: 10 },
      { date: '2026-01-02', value: 100 },
    ];
    expect(detectAnomaly(data)).toBe(false);
  });

  it('returns false when all values are the same (zero stdDev)', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: 5,
    }));
    expect(detectAnomaly(data)).toBe(false);
  });
});
