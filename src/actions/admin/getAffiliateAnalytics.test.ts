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
    affiliateClick: { count: vi.fn(), groupBy: vi.fn() },
    affiliateLink: { aggregate: vi.fn(), groupBy: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getAffiliateAnalytics } from './getAffiliateAnalytics';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClickCount = prisma.affiliateClick.count as unknown as ReturnType<typeof vi.fn>;
const mockClickGroupBy = prisma.affiliateClick.groupBy as unknown as ReturnType<typeof vi.fn>;
const mockLinkAggregate = prisma.affiliateLink.aggregate as unknown as ReturnType<typeof vi.fn>;
const mockLinkGroupBy = prisma.affiliateLink.groupBy as unknown as ReturnType<typeof vi.fn>;
const mockQueryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;

function setupAdminSession() {
  mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
  mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
}

function setupDefaultAnalytics() {
  // Total clicks, total conversions (called in sequence by Promise.all)
  mockClickCount.mockResolvedValueOnce(500).mockResolvedValueOnce(50);

  // Revenue aggregate
  mockLinkAggregate.mockResolvedValue({ _sum: { revenue: 1250.5 } });

  // Placement groupBy (clicks)
  mockClickGroupBy
    .mockResolvedValueOnce([
      { source: 'detail-page', _count: { id: 300 } },
      { source: 'recommendation', _count: { id: 150 } },
      { source: 'buddy-read', _count: { id: 50 } },
    ])
    // Provider groupBy (clicks)
    .mockResolvedValueOnce([
      { provider: 'amazon', _count: { id: 350 } },
      { provider: 'bookshop', _count: { id: 150 } },
    ])
    // Placement conversions
    .mockResolvedValueOnce([
      { source: 'detail-page', _count: { id: 30 } },
      { source: 'recommendation', _count: { id: 15 } },
      { source: 'buddy-read', _count: { id: 5 } },
    ])
    // Provider conversions
    .mockResolvedValueOnce([
      { provider: 'amazon', _count: { id: 35 } },
      { provider: 'bookshop', _count: { id: 15 } },
    ]);

  // Provider revenue groupBy
  mockLinkGroupBy.mockResolvedValue([
    { provider: 'amazon', _sum: { revenue: 900, conversions: 35 } },
    { provider: 'bookshop', _sum: { revenue: 350.5, conversions: 15 } },
  ]);

  // Raw queries: user segments, regional, trend data (4 queries)
  mockQueryRaw
    .mockResolvedValueOnce([
      { premium_status: 'FREE', click_count: BigInt(300), unique_users: BigInt(200), conversion_count: BigInt(20) },
      { premium_status: 'PREMIUM', click_count: BigInt(200), unique_users: BigInt(80), conversion_count: BigInt(30) },
    ])
    .mockResolvedValueOnce([
      { country_code: 'US', click_count: BigInt(250), conversion_count: BigInt(25) },
      { country_code: 'GB', click_count: BigInt(100), conversion_count: BigInt(10) },
    ])
    .mockResolvedValueOnce([]) // clicks current
    .mockResolvedValueOnce([]) // clicks previous
    .mockResolvedValueOnce([]) // conversions current
    .mockResolvedValueOnce([]); // conversions previous
}

describe('getAffiliateAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getAffiliateAnalytics();
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin user', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });
    const result = await getAffiliateAnalytics();
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns forbidden when user not found', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'ghost' } });
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getAffiliateAnalytics();
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns aggregate analytics data for admin', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.totalClicks).toBe(500);
    expect(result.data.totalConversions).toBe(50);
    expect(result.data.totalRevenue).toBe(1250.5);
    expect(result.data.overallConversionRate).toBe(10);
  });

  it('returns placement breakdown', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();
    if (!result.success) return;

    expect(result.data.byPlacement).toHaveLength(3);
    expect(result.data.byPlacement[0]).toEqual({
      source: 'detail-page',
      clicks: 300,
      conversions: 30,
      conversionRate: 10,
      revenue: 0,
    });
  });

  it('returns provider comparison', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();
    if (!result.success) return;

    expect(result.data.byProvider).toHaveLength(2);
    const amazon = result.data.byProvider.find((p) => p.provider === 'amazon');
    expect(amazon).toEqual({
      provider: 'amazon',
      clicks: 350,
      conversions: 35,
      conversionRate: 10,
      revenue: 900,
    });
  });

  it('returns user segment breakdown with aggregate data only (GDPR)', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();
    if (!result.success) return;

    expect(result.data.byUserSegment).toHaveLength(2);
    const free = result.data.byUserSegment.find((s) => s.segment === 'FREE');
    expect(free).toEqual({
      segment: 'FREE',
      clicks: 300,
      uniqueUsers: 200,
      conversions: 20,
      conversionRate: 6.7,
    });
  });

  it('returns regional breakdown', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();
    if (!result.success) return;

    expect(result.data.byRegion).toHaveLength(2);
    expect(result.data.byRegion[0]).toEqual({
      countryCode: 'US',
      clicks: 250,
      conversions: 25,
      conversionRate: 10,
    });
  });

  it('returns trend data with percentage changes', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics();
    if (!result.success) return;

    expect(result.data.trends.clicks).toBeDefined();
    expect(result.data.trends.conversions).toBeDefined();
    expect(typeof result.data.trends.clicksPercentageChange).toBe('number');
    expect(typeof result.data.trends.conversionsPercentageChange).toBe('number');
  });

  it('handles empty database gracefully', async () => {
    setupAdminSession();
    mockClickCount.mockResolvedValue(0);
    mockLinkAggregate.mockResolvedValue({ _sum: { revenue: null } });
    mockClickGroupBy.mockResolvedValue([]);
    mockLinkGroupBy.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);

    const result = await getAffiliateAnalytics();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.totalClicks).toBe(0);
    expect(result.data.totalConversions).toBe(0);
    expect(result.data.totalRevenue).toBe(0);
    expect(result.data.overallConversionRate).toBe(0);
    expect(result.data.byPlacement).toEqual([]);
    expect(result.data.byProvider).toEqual([]);
  });

  it('handles query errors gracefully', async () => {
    setupAdminSession();
    mockClickCount.mockRejectedValue(new Error('DB connection failed'));

    const result = await getAffiliateAnalytics();

    expect(result).toEqual({ success: false, error: 'Failed to fetch affiliate analytics' });
  });

  it('accepts custom date range', async () => {
    setupAdminSession();
    setupDefaultAnalytics();

    const result = await getAffiliateAnalytics('2026-01-01', '2026-01-31');

    expect(result.success).toBe(true);
  });
});
