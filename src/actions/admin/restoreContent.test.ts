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
    moderationItem: { update: vi.fn() },
    contentRemoval: { findUnique: vi.fn(), update: vi.fn() },
    adminAction: { create: vi.fn() },
    book: { update: vi.fn() },
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

import { restoreContent } from './restoreContent';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockRemovalFindUnique = (
  prisma as unknown as { contentRemoval: { findUnique: ReturnType<typeof vi.fn> } }
).contentRemoval.findUnique;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe('restoreContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  });

  it('restores content within 24-hour window', async () => {
    const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    mockRemovalFindUnique.mockResolvedValue({
      id: 'removal-1',
      moderationItemId: 'mod-1',
      originalContent: 'Original bio text',
      removedAt: recentDate,
      restoredAt: null,
      removedById: 'admin-1',
      moderationItem: {
        id: 'mod-1',
        contentType: 'PROFILE_BIO',
        contentId: 'user-2',
        reportedUserId: 'user-2',
        status: 'REMOVED',
      },
    });

    const updatedRemoval = {
      id: 'removal-1',
      restoredAt: new Date(),
      restoredById: 'admin-1',
    };
    mockTransaction.mockResolvedValue([updatedRemoval, {}, {}, {}]);

    const result = await restoreContent({
      contentRemovalId: 'removal-1',
      reason: 'Removal was in error',
    });

    expect(result).toEqual({ success: true, data: updatedRemoval });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('returns error when restore window has expired (>24h)', async () => {
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
    mockRemovalFindUnique.mockResolvedValue({
      id: 'removal-1',
      removedAt: oldDate,
      restoredAt: null,
      moderationItem: {
        id: 'mod-1',
        contentType: 'PROFILE_BIO',
        contentId: 'user-2',
        reportedUserId: 'user-2',
      },
    });

    const result = await restoreContent({
      contentRemovalId: 'removal-1',
    });

    expect(result).toEqual({ success: false, error: 'Restore window has expired (24 hours)' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns error when content already restored', async () => {
    mockRemovalFindUnique.mockResolvedValue({
      id: 'removal-1',
      removedAt: new Date(),
      restoredAt: new Date(),
      moderationItem: {
        id: 'mod-1',
        contentType: 'PROFILE_BIO',
        contentId: 'user-2',
        reportedUserId: 'user-2',
      },
    });

    const result = await restoreContent({
      contentRemovalId: 'removal-1',
    });

    expect(result).toEqual({ success: false, error: 'Content has already been restored' });
  });

  it('returns error for non-admin user', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await restoreContent({
      contentRemovalId: 'removal-1',
    });

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for unauthenticated user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await restoreContent({
      contentRemovalId: 'removal-1',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when content removal not found', async () => {
    mockRemovalFindUnique.mockResolvedValue(null);

    const result = await restoreContent({
      contentRemovalId: 'nonexistent',
    });

    expect(result).toEqual({ success: false, error: 'Content removal not found' });
  });

  it('returns error for invalid input', async () => {
    const result = await restoreContent({
      contentRemovalId: '',
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });
});
