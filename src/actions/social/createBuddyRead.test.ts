import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBuddyRead } from './createBuddyRead';

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

const mockTransaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    follow: {
      findUnique: vi.fn(),
    },
    book: {
      findUnique: vi.fn(),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFollowFindUnique = prisma.follow.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockBookFindUnique = prisma.book.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('createBuddyRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('successfully creates buddy read and invitation', async () => {
    mockFollowFindUnique.mockResolvedValue({ id: 'follow-1' });
    mockBookFindUnique.mockResolvedValue({ id: 'book-1' });
    mockTransaction.mockResolvedValue({
      buddyReadId: 'br-1',
      invitationId: 'inv-1',
    });

    const result = await createBuddyRead({ bookId: 'book-1', inviteeId: 'user-2' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buddyReadId).toBe('br-1');
      expect(result.data.invitationId).toBe('inv-1');
    }
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createBuddyRead({ bookId: 'book-1', inviteeId: 'user-2' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns error when inviting yourself', async () => {
    const result = await createBuddyRead({ bookId: 'book-1', inviteeId: 'user-1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Cannot invite yourself to a buddy read');
    }
  });

  it('returns error when not following invitee', async () => {
    mockFollowFindUnique.mockResolvedValue(null);

    const result = await createBuddyRead({ bookId: 'book-1', inviteeId: 'user-2' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('You can only invite users you follow');
    }
  });

  it('returns error when book not found', async () => {
    mockFollowFindUnique.mockResolvedValue({ id: 'follow-1' });
    mockBookFindUnique.mockResolvedValue(null);

    const result = await createBuddyRead({ bookId: 'nonexistent', inviteeId: 'user-2' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Book not found');
    }
  });

  it('returns error on invalid input', async () => {
    const result = await createBuddyRead({ bookId: '', inviteeId: 'user-2' });

    expect(result.success).toBe(false);
  });
});
