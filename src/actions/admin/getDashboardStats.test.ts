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
    authorClaim: { count: vi.fn() },
    moderationItem: { count: vi.fn() },
    adminAction: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getDashboardStats } from './getDashboardStats';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClaimCount = (prisma as unknown as { authorClaim: { count: ReturnType<typeof vi.fn> } }).authorClaim.count;
const mockModItemCount = (prisma as unknown as { moderationItem: { count: ReturnType<typeof vi.fn> } }).moderationItem.count;
const mockActionFindMany = (prisma as unknown as { adminAction: { findMany: ReturnType<typeof vi.fn> } }).adminAction.findMany;

describe('getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('returns dashboard stats with real moderation count', async () => {
    mockClaimCount.mockResolvedValue(3);
    mockModItemCount.mockResolvedValue(5);
    mockActionFindMany.mockResolvedValue([]);

    const result = await getDashboardStats();

    expect(result).toEqual({
      success: true,
      data: {
        pendingClaimsCount: 3,
        moderationCount: 5,
        userWarningCount: 0,
        recentActions: [],
      },
    });
  });

  it('queries moderation items with PENDING status', async () => {
    mockClaimCount.mockResolvedValue(0);
    mockModItemCount.mockResolvedValue(0);
    mockActionFindMany.mockResolvedValue([]);

    await getDashboardStats();

    expect(mockModItemCount).toHaveBeenCalledWith({ where: { status: 'PENDING' } });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getDashboardStats();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error for non-admin user', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await getDashboardStats();

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });
});
