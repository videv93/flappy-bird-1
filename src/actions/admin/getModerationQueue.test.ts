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
    moderationItem: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getModerationQueue } from './getModerationQueue';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockModFindMany = (prisma as unknown as { moderationItem: { findMany: ReturnType<typeof vi.fn> } }).moderationItem.findMany;
const mockModCount = (prisma as unknown as { moderationItem: { count: ReturnType<typeof vi.fn> } }).moderationItem.count;

describe('getModerationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('returns paginated moderation items', async () => {
    const items = [
      { id: 'mod-1', contentType: 'PROFILE_BIO', status: 'PENDING', createdAt: new Date() },
    ];
    mockModFindMany.mockResolvedValue(items);
    mockModCount.mockResolvedValue(1);

    const result = await getModerationQueue();

    expect(result).toEqual({
      success: true,
      data: { items, totalCount: 1, page: 1, pageSize: 20 },
    });
  });

  it('returns error for non-admin', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await getModerationQueue();

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getModerationQueue();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('filters by content type', async () => {
    mockModFindMany.mockResolvedValue([]);
    mockModCount.mockResolvedValue(0);

    await getModerationQueue({ contentType: 'PROFILE_BIO' });

    expect(mockModFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contentType: 'PROFILE_BIO' }),
      })
    );
  });

  it('supports pagination', async () => {
    mockModFindMany.mockResolvedValue([]);
    mockModCount.mockResolvedValue(25);

    const result = await getModerationQueue({ page: 2, pageSize: 10 });

    expect(result.success && result.data.page).toBe(2);
    expect(mockModFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});
