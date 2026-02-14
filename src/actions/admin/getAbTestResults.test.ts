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
    affiliateClick: { groupBy: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getAbTestResults, calculateChiSquared, getSignificanceLevel } from './getAbTestResults';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClickGroupBy = prisma.affiliateClick.groupBy as unknown as ReturnType<typeof vi.fn>;

function setupAdminSession() {
  mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
  mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
}

describe('getAbTestResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getAbTestResults();
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });
    const result = await getAbTestResults();
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns variant results with significance', async () => {
    setupAdminSession();
    mockClickGroupBy
      .mockResolvedValueOnce([
        { variant: 'button-top', _count: { id: 500 } },
        { variant: 'button-bottom', _count: { id: 500 } },
      ])
      .mockResolvedValueOnce([
        { variant: 'button-top', _count: { id: 60 } },
        { variant: 'button-bottom', _count: { id: 40 } },
      ]);

    const result = await getAbTestResults();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.variants).toHaveLength(2);
    expect(result.data.variants[0].variant).toBe('button-top');
    expect(result.data.variants[0].clicks).toBe(500);
    expect(result.data.variants[0].conversions).toBe(60);
    expect(result.data.chiSquared).toBeGreaterThan(0);
    expect(typeof result.data.significance).toBe('string');
  });

  it('handles no variants gracefully', async () => {
    setupAdminSession();
    mockClickGroupBy.mockResolvedValue([]);

    const result = await getAbTestResults();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.variants).toEqual([]);
    expect(result.data.chiSquared).toBe(0);
    expect(result.data.significance).toBe('Not significant');
  });

  it('handles query errors', async () => {
    setupAdminSession();
    mockClickGroupBy.mockRejectedValue(new Error('DB error'));
    const result = await getAbTestResults();
    expect(result).toEqual({ success: false, error: 'Failed to fetch A/B test results' });
  });
});

describe('calculateChiSquared', () => {
  it('returns 0 for single variant', () => {
    expect(calculateChiSquared([{ variant: 'a', clicks: 100, conversions: 10, conversionRate: 10 }])).toBe(0);
  });

  it('calculates chi-squared for two variants', () => {
    const result = calculateChiSquared([
      { variant: 'a', clicks: 1000, conversions: 100, conversionRate: 10 },
      { variant: 'b', clicks: 1000, conversions: 150, conversionRate: 15 },
    ]);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for zero clicks', () => {
    expect(calculateChiSquared([
      { variant: 'a', clicks: 0, conversions: 0, conversionRate: 0 },
      { variant: 'b', clicks: 0, conversions: 0, conversionRate: 0 },
    ])).toBe(0);
  });
});

describe('getSignificanceLevel', () => {
  it('returns Not significant for low chi-squared', () => {
    expect(getSignificanceLevel(1.0)).toBe('Not significant');
  });

  it('returns Marginally significant for chi-squared > 2.706', () => {
    expect(getSignificanceLevel(3.0)).toBe('Marginally significant (p < 0.1)');
  });

  it('returns Significant for chi-squared > 3.841', () => {
    expect(getSignificanceLevel(4.5)).toBe('Significant (p < 0.05)');
  });

  it('returns Highly significant for chi-squared > 6.635', () => {
    expect(getSignificanceLevel(7.0)).toBe('Highly significant (p < 0.01)');
  });
});
