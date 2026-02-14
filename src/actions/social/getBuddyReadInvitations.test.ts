import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBuddyReadInvitations } from './getBuddyReadInvitations';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    buddyReadInvitation: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.buddyReadInvitation.findMany as unknown as ReturnType<typeof vi.fn>;

describe('getBuddyReadInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns pending invitations for current user', async () => {
    const mockInvitations = [
      {
        id: 'inv-1',
        status: 'PENDING',
        createdAt: new Date('2026-02-14'),
        inviter: { id: 'user-2', name: 'Alice', image: null },
        buddyRead: {
          book: {
            id: 'book-1',
            title: 'Test Book',
            author: 'Author',
            coverUrl: null,
            isbn10: '1234567890',
            isbn13: null,
          },
        },
      },
    ];
    mockFindMany.mockResolvedValue(mockInvitations);

    const result = await getBuddyReadInvitations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].inviter.name).toBe('Alice');
      expect(result.data[0].book.title).toBe('Test Book');
    }
  });

  it('returns empty array when no invitations', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getBuddyReadInvitations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getBuddyReadInvitations();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });
});
