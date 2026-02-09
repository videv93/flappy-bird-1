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
    moderationItem: { findUnique: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getModerationItemDetail } from './getModerationItemDetail';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockModFindUnique = (prisma as unknown as { moderationItem: { findUnique: ReturnType<typeof vi.fn> } }).moderationItem.findUnique;
const mockModCount = (prisma as unknown as { moderationItem: { count: ReturnType<typeof vi.fn> } }).moderationItem.count;

describe('getModerationItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('returns moderation item detail with flag count', async () => {
    const item = {
      id: 'mod-1',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'Inappropriate content',
      status: 'PENDING',
      adminNotes: null,
      createdAt: new Date(),
      reviewedAt: null,
      reportedUserId: 'user-2',
      reporter: { id: 'user-3', name: 'Reporter', image: null },
      reportedUser: { id: 'user-2', name: 'Reported', image: null },
      reviewer: null,
    };
    mockModFindUnique.mockResolvedValue(item);
    mockModCount.mockResolvedValue(3);

    const result = await getModerationItemDetail('mod-1');

    expect(result).toEqual({
      success: true,
      data: { ...item, reportedUserFlagCount: 3 },
    });
  });

  it('returns error for non-admin', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await getModerationItemDetail('mod-1');

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getModerationItemDetail('mod-1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when item not found', async () => {
    mockModFindUnique.mockResolvedValue(null);

    const result = await getModerationItemDetail('nonexistent');

    expect(result).toEqual({ success: false, error: 'Moderation item not found' });
  });

  it('queries with correct include for relations', async () => {
    const item = {
      id: 'mod-1',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'Bad content',
      status: 'PENDING',
      adminNotes: null,
      createdAt: new Date(),
      reviewedAt: null,
      reportedUserId: 'user-2',
      reporter: { id: 'user-3', name: 'Reporter', image: null },
      reportedUser: { id: 'user-2', name: 'Reported', image: null },
      reviewer: null,
    };
    mockModFindUnique.mockResolvedValue(item);
    mockModCount.mockResolvedValue(1);

    await getModerationItemDetail('mod-1');

    expect(mockModFindUnique).toHaveBeenCalledWith({
      where: { id: 'mod-1' },
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        reportedUser: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
    expect(mockModCount).toHaveBeenCalledWith({
      where: { reportedUserId: 'user-2' },
    });
  });
});
