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
    moderationItem: { findUnique: vi.fn(), update: vi.fn() },
    adminAction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { reviewModerationItem } from './reviewModerationItem';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockModFindUnique = (prisma as unknown as { moderationItem: { findUnique: ReturnType<typeof vi.fn> } }).moderationItem.findUnique;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe('reviewModerationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('dismisses a moderation item with admin action log', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-1',
      status: 'PENDING',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reportedUserId: 'user-2',
    });
    const updatedItem = { id: 'mod-1', status: 'DISMISSED', reviewedById: 'admin-1' };
    mockTransaction.mockResolvedValue([updatedItem, {}]);

    const result = await reviewModerationItem({
      moderationItemId: 'mod-1',
      action: 'dismiss',
    });

    expect(result).toEqual({ success: true, data: updatedItem });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('warns a user via moderation item', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-2',
      status: 'PENDING',
      contentType: 'PROFILE_BIO',
      contentId: 'user-3',
      reportedUserId: 'user-3',
    });
    const updatedItem = { id: 'mod-2', status: 'WARNED', reviewedById: 'admin-1' };
    mockTransaction.mockResolvedValue([updatedItem, {}]);

    const result = await reviewModerationItem({
      moderationItemId: 'mod-2',
      action: 'warn',
      adminNotes: 'First warning issued',
    });

    expect(result).toEqual({ success: true, data: updatedItem });
  });

  it('removes content via moderation item', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-3',
      status: 'PENDING',
      contentType: 'READING_ROOM_DESCRIPTION',
      contentId: 'book-1',
      reportedUserId: 'user-4',
    });
    const updatedItem = { id: 'mod-3', status: 'REMOVED', reviewedById: 'admin-1' };
    mockTransaction.mockResolvedValue([updatedItem, {}]);

    const result = await reviewModerationItem({
      moderationItemId: 'mod-3',
      action: 'remove',
    });

    expect(result).toEqual({ success: true, data: updatedItem });
  });

  it('suspends a user via moderation item', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-4',
      status: 'PENDING',
      contentType: 'PROFILE_BIO',
      contentId: 'user-5',
      reportedUserId: 'user-5',
    });
    const updatedItem = { id: 'mod-4', status: 'SUSPENDED', reviewedById: 'admin-1' };
    mockTransaction.mockResolvedValue([updatedItem, {}]);

    const result = await reviewModerationItem({
      moderationItemId: 'mod-4',
      action: 'suspend',
      adminNotes: 'Repeated violations',
    });

    expect(result).toEqual({ success: true, data: updatedItem });
  });

  it('returns error for non-admin user', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await reviewModerationItem({
      moderationItemId: 'mod-1',
      action: 'dismiss',
    });

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await reviewModerationItem({
      moderationItemId: 'mod-1',
      action: 'dismiss',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when item not found', async () => {
    mockModFindUnique.mockResolvedValue(null);

    const result = await reviewModerationItem({
      moderationItemId: 'nonexistent',
      action: 'dismiss',
    });

    expect(result).toEqual({ success: false, error: 'Moderation item not found' });
  });

  it('returns error when item already reviewed', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-1',
      status: 'DISMISSED',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reportedUserId: 'user-2',
    });

    const result = await reviewModerationItem({
      moderationItemId: 'mod-1',
      action: 'warn',
    });

    expect(result).toEqual({ success: false, error: 'This item has already been reviewed' });
  });

  it('returns error for invalid input', async () => {
    const result = await reviewModerationItem({
      moderationItemId: '',
      action: 'invalid',
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });
});
