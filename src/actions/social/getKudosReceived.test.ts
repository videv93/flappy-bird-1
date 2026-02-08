import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKudosReceived } from './getKudosReceived';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    kudos: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.kudos.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.kudos.count as ReturnType<typeof vi.fn>;

describe('getKudosReceived', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await getKudosReceived();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('should return kudos with correct relations (giver, session, book)', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Test User' },
    });

    const mockKudos = [
      {
        id: 'kudos-1',
        createdAt: new Date('2026-02-07T10:00:00Z'),
        giver: {
          id: 'user-2',
          name: 'Alice Reader',
          image: '/alice.jpg',
        },
        session: {
          id: 'session-1',
          book: {
            id: 'book-1',
            title: 'Project Hail Mary',
            coverUrl: '/cover.jpg',
          },
        },
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockKudos);
    mockCount.mockResolvedValueOnce(1);

    const result = await getKudosReceived();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kudos).toEqual(mockKudos);
      expect(result.data.kudos[0].giver).toHaveProperty('id');
      expect(result.data.kudos[0].giver).toHaveProperty('name');
      expect(result.data.kudos[0].giver).toHaveProperty('image');
      expect(result.data.kudos[0].session).toHaveProperty('id');
      expect(result.data.kudos[0].session.book).toHaveProperty('id');
      expect(result.data.kudos[0].session.book).toHaveProperty('title');
      expect(result.data.kudos[0].session.book).toHaveProperty('coverUrl');
    }
  });

  it('should order kudos by createdAt DESC', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await getKudosReceived();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('should respect limit and offset pagination', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await getKudosReceived({ limit: 10, offset: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });

  it('should use default limit of 20 when not specified', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await getKudosReceived();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
      })
    );
  });

  it('should return correct total count', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(42);

    const result = await getKudosReceived();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(42);
    }
  });

  it('should return hasMore flag correctly when more kudos exist', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    const mockKudos = Array(20).fill({
      id: 'kudos-1',
      createdAt: new Date(),
      giver: { id: 'user-2', name: 'Alice', image: null },
      session: {
        id: 'session-1',
        book: { id: 'book-1', title: 'Test Book', coverUrl: null },
      },
    });

    mockFindMany.mockResolvedValueOnce(mockKudos);
    mockCount.mockResolvedValueOnce(50);

    const result = await getKudosReceived({ limit: 20, offset: 0 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasMore).toBe(true);
    }
  });

  it('should return hasMore false when no more kudos exist', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    const mockKudos = Array(10).fill({
      id: 'kudos-1',
      createdAt: new Date(),
      giver: { id: 'user-2', name: 'Alice', image: null },
      session: {
        id: 'session-1',
        book: { id: 'book-1', title: 'Test Book', coverUrl: null },
      },
    });

    mockFindMany.mockResolvedValueOnce(mockKudos);
    mockCount.mockResolvedValueOnce(10);

    const result = await getKudosReceived({ limit: 20, offset: 0 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('should handle empty state (0 kudos)', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const result = await getKudosReceived();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kudos).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('should only return kudos for authenticated user', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    await getKudosReceived();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receiverId: 'user-1' },
      })
    );

    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { receiverId: 'user-1' },
      })
    );
  });

  it('should handle errors gracefully', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    mockFindMany.mockRejectedValueOnce(new Error('Database error'));

    const result = await getKudosReceived();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to load kudos');
    }
  });

  it('should enforce maximum limit of 50', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1' },
    });

    const result = await getKudosReceived({ limit: 100, offset: 0 });

    // Should fail validation or cap at 50
    expect(result.success).toBe(false);
  });
});
