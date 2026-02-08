import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoomMembers } from './getRoomMembers';

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
    roomPresence: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.roomPresence.findMany as unknown as ReturnType<typeof vi.fn>;

describe('getRoomMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getRoomMembers('book-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Unauthorized');
  });

  it('returns members for a room', async () => {
    const now = new Date();
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        userId: 'user-1',
        bookId: 'book-1',
        joinedAt: now,
        leftAt: null,
        isAuthor: false,
        user: { id: 'user-1', name: 'Alice', image: null, avatarUrl: 'alice.jpg' },
      },
      {
        id: 'p2',
        userId: 'user-2',
        bookId: 'book-1',
        joinedAt: now,
        leftAt: null,
        isAuthor: true,
        user: { id: 'user-2', name: 'Bob', image: 'bob.jpg', avatarUrl: null },
      },
    ]);

    const result = await getRoomMembers('book-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'user-1',
        name: 'Alice',
        avatarUrl: 'alice.jpg',
        joinedAt: now,
        isAuthor: false,
      });
      expect(result.data[1]).toEqual({
        id: 'user-2',
        name: 'Bob',
        avatarUrl: 'bob.jpg',
        joinedAt: now,
        isAuthor: true,
      });
    }
  });

  it('returns empty array for empty room', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getRoomMembers('book-empty');

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(0);
  });

  it('queries only active presences (leftAt null)', async () => {
    mockFindMany.mockResolvedValue([]);

    await getRoomMembers('book-1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { bookId: 'book-1', leftAt: null },
      include: {
        user: { select: { id: true, name: true, image: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  });

  it('returns error for empty bookId', async () => {
    const result = await getRoomMembers('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Invalid book ID');
  });

  it('uses Anonymous for null user name', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        userId: 'user-1',
        bookId: 'book-1',
        joinedAt: new Date(),
        leftAt: null,
        isAuthor: false,
        user: { id: 'user-1', name: null, image: null, avatarUrl: null },
      },
    ]);

    const result = await getRoomMembers('book-1');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].name).toBe('Anonymous');
  });
});
