import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    affiliateClick: { findMany: vi.fn() },
    affiliateLink: { groupBy: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { GET } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClickFindMany = prisma.affiliateClick.findMany as unknown as ReturnType<typeof vi.fn>;
const mockLinkGroupBy = prisma.affiliateLink.groupBy as unknown as ReturnType<typeof vi.fn>;

function createRequest() {
  return new Request('http://localhost:3000/api/admin/export/affiliate');
}

describe('GET /api/admin/export/affiliate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });
    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it('returns CSV for admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockClickFindMany.mockResolvedValue([
      {
        createdAt: new Date('2026-01-15'),
        provider: 'amazon',
        source: 'detail-page',
        converted: true,
        countryCode: 'US',
      },
      {
        createdAt: new Date('2026-01-15'),
        provider: 'amazon',
        source: 'detail-page',
        converted: false,
        countryCode: 'US',
      },
    ]);
    mockLinkGroupBy.mockResolvedValue([]);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('affiliate-analytics-');

    const csv = await res.text();
    expect(csv).toContain('Date,Provider,Source,Clicks,Conversions,Country,Revenue (All-Time by Provider)');
    expect(csv).toContain('2026-01-15,amazon,detail-page,2,1,US');
  });

  it('handles empty data', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockClickFindMany.mockResolvedValue([]);
    mockLinkGroupBy.mockResolvedValue([]);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toBe('Date,Provider,Source,Clicks,Conversions,Country,Revenue (All-Time by Provider)');
  });
});
