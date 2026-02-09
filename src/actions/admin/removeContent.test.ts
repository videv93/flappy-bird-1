import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    moderationItem: { findUnique: vi.fn(), update: vi.fn() },
    contentRemoval: { create: vi.fn() },
    adminAction: { create: vi.fn() },
    book: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

vi.mock('@/lib/pusher-server', () => ({
  getPusher: vi.fn(() => ({ trigger: vi.fn().mockResolvedValue(undefined) })),
}));

import { removeContent } from './removeContent';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockModFindUnique = (
  prisma as unknown as { moderationItem: { findUnique: ReturnType<typeof vi.fn> } }
).moderationItem.findUnique;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe('removeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('removes PROFILE_BIO content with violation type and snapshots original content', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-1',
      status: 'PENDING',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reportedUserId: 'user-2',
    });

    // Mock user bio lookup (second call to user.findUnique for content)
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce({ bio: 'Offensive bio content' });

    const createdRemoval = {
      id: 'removal-1',
      moderationItemId: 'mod-1',
      violationType: 'HARASSMENT',
      originalContent: 'Offensive bio content',
      removedById: 'admin-1',
      removedAt: new Date(),
      restoredAt: null,
    };
    mockTransaction.mockResolvedValue([createdRemoval, {}, {}, {}]);

    const result = await removeContent({
      moderationItemId: 'mod-1',
      violationType: 'HARASSMENT',
      adminNotes: 'Violates community guidelines',
    });

    expect(result).toEqual({ success: true, data: createdRemoval });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('removes READING_ROOM_DESCRIPTION content', async () => {
    mockModFindUnique.mockResolvedValue({
      id: 'mod-2',
      status: 'PENDING',
      contentType: 'READING_ROOM_DESCRIPTION',
      contentId: 'book-1',
      reportedUserId: 'user-3',
    });

    const mockBookFindUnique = (
      prisma as unknown as { book: { findUnique: ReturnType<typeof vi.fn> } }
    ).book.findUnique;
    mockBookFindUnique.mockResolvedValue({ description: 'Spoiler content here' });

    const createdRemoval = {
      id: 'removal-2',
      moderationItemId: 'mod-2',
      violationType: 'SPOILERS',
      originalContent: 'Spoiler content here',
      removedById: 'admin-1',
    };
    mockTransaction.mockResolvedValue([createdRemoval, {}, {}, {}]);

    const result = await removeContent({
      moderationItemId: 'mod-2',
      violationType: 'SPOILERS',
    });

    expect(result).toEqual({ success: true, data: createdRemoval });
  });

  it('returns error for non-admin user', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await removeContent({
      moderationItemId: 'mod-1',
      violationType: 'SPAM',
    });

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await removeContent({
      moderationItemId: 'mod-1',
      violationType: 'SPAM',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when moderation item not found', async () => {
    mockModFindUnique.mockResolvedValue(null);

    const result = await removeContent({
      moderationItemId: 'nonexistent',
      violationType: 'SPAM',
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

    const result = await removeContent({
      moderationItemId: 'mod-1',
      violationType: 'SPAM',
    });

    expect(result).toEqual({ success: false, error: 'This item has already been reviewed' });
  });

  it('returns error for invalid input', async () => {
    const result = await removeContent({
      moderationItemId: '',
      violationType: 'INVALID',
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });
});
