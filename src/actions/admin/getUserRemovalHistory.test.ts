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
    contentRemoval: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getUserRemovalHistory } from './getUserRemovalHistory';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockRemovalFindMany = prisma.contentRemoval.findMany as ReturnType<typeof vi.fn>;
const mockRemovalCount = prisma.contentRemoval.count as ReturnType<typeof vi.fn>;

describe('getUserRemovalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const adminSession = { user: { id: 'admin-1' } };

  function setupAdmin() {
    mockGetSession.mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  }

  it('returns removal history for a user', async () => {
    setupAdmin();

    const mockRemovals = [
      {
        id: 'removal-1',
        violationType: 'SPAM',
        adminNotes: 'Spam content',
        removedAt: new Date('2025-01-15'),
        restoredAt: null,
        removedBy: { id: 'admin-1', name: 'Admin' },
        restoredBy: null,
        moderationItem: { contentType: 'PROFILE_BIO' },
      },
      {
        id: 'removal-2',
        violationType: 'HARASSMENT',
        adminNotes: null,
        removedAt: new Date('2025-01-10'),
        restoredAt: new Date('2025-01-11'),
        removedBy: { id: 'admin-1', name: 'Admin' },
        restoredBy: { id: 'admin-1', name: 'Admin' },
        moderationItem: { contentType: 'READING_ROOM_DESCRIPTION' },
      },
    ];

    mockRemovalFindMany.mockResolvedValue(mockRemovals);
    mockRemovalCount.mockResolvedValue(2);

    const result = await getUserRemovalHistory({ userId: 'user-2' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.totalCount).toBe(2);
      expect(result.data.items[0].violationType).toBe('SPAM');
      expect(result.data.items[0].contentType).toBe('PROFILE_BIO');
      expect(result.data.items[1].restoredAt).not.toBeNull();
    }
  });

  it('returns empty list when user has no removals', async () => {
    setupAdmin();
    mockRemovalFindMany.mockResolvedValue([]);
    mockRemovalCount.mockResolvedValue(0);

    const result = await getUserRemovalHistory({ userId: 'user-clean' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    }
  });

  it('rejects unauthenticated users', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getUserRemovalHistory({ userId: 'user-2' });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('rejects non-admin users', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'regular-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'regular-1', role: 'USER' });

    const result = await getUserRemovalHistory({ userId: 'user-2' });

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('rejects invalid input', async () => {
    setupAdmin();

    const result = await getUserRemovalHistory({ userId: '' });

    expect(result).toEqual({ success: false, error: 'Failed to fetch removal history' });
  });
});
