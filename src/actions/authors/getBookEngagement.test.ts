import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
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
    authorClaim: {
      findFirst: vi.fn(),
    },
    userBook: {
      count: vi.fn(),
    },
    roomPresence: {
      count: vi.fn(),
    },
  },
}));

import { getBookEngagement } from './getBookEngagement';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockClaimFindFirst = prisma.authorClaim.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockUserBookCount = prisma.userBook.count as unknown as ReturnType<typeof vi.fn>;
const mockRoomPresenceCount = prisma.roomPresence.count as unknown as ReturnType<typeof vi.fn>;

describe('getBookEngagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getBookEngagement('book-1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when user is not a verified author', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockClaimFindFirst.mockResolvedValue(null);

    const result = await getBookEngagement('book-1');

    expect(result).toEqual({ success: false, error: 'Not a verified author of this book' });
  });

  it('returns engagement metrics for verified author', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockClaimFindFirst.mockResolvedValue({ id: 'claim-1', status: 'APPROVED' });
    mockUserBookCount
      .mockResolvedValueOnce(25)   // libraryCount
      .mockResolvedValueOnce(8);   // currentlyReadingCount
    mockRoomPresenceCount.mockResolvedValue(3); // roomOccupantCount

    const result = await getBookEngagement('book-1');

    expect(result).toEqual({
      success: true,
      data: {
        libraryCount: 25,
        currentlyReadingCount: 8,
        roomOccupantCount: 3,
      },
    });
  });

  it('verifies correct query filters', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
    mockUserBookCount.mockResolvedValue(0);
    mockRoomPresenceCount.mockResolvedValue(0);

    await getBookEngagement('book-1');

    expect(mockClaimFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', bookId: 'book-1', status: 'APPROVED' },
    });
    expect(mockUserBookCount).toHaveBeenCalledWith({
      where: { bookId: 'book-1', deletedAt: null },
    });
    expect(mockRoomPresenceCount).toHaveBeenCalledWith({
      where: { bookId: 'book-1', leftAt: null },
    });
  });

  it('returns error on database failure', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockClaimFindFirst.mockRejectedValue(new Error('DB error'));

    const result = await getBookEngagement('book-1');

    expect(result).toEqual({ success: false, error: 'Failed to fetch engagement metrics' });
  });
});
