import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBookSessions } from './getBookSessions';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    readingSession: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const mockAuth = vi.mocked(auth.api.getSession);
const mockFindMany = vi.mocked(prisma.readingSession.findMany);

function makeSession(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: 'user-1',
    bookId: 'book-123',
    duration: 300,
    startedAt: new Date('2026-02-06T10:00:00Z'),
    endedAt: new Date('2026-02-06T10:05:00Z'),
    syncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('getBookSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com', emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'session-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
    });
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getBookSessions({ bookId: 'book-123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('You must be logged in to view sessions');
    }
  });

  it('returns sessions sorted by most recent', async () => {
    const sessions = [makeSession('rs-1'), makeSession('rs-2')];
    mockFindMany.mockResolvedValue(sessions);

    const result = await getBookSessions({ bookId: 'book-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessions).toHaveLength(2);
      expect(result.data.nextCursor).toBeNull();
    }

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', bookId: 'book-123' },
        orderBy: { startedAt: 'desc' },
        take: 11, // limit + 1
      })
    );
  });

  it('returns nextCursor when more results available', async () => {
    // 11 results means there are more (limit is 10, we fetch 11)
    const sessions = Array.from({ length: 11 }, (_, i) => makeSession(`rs-${i}`));
    mockFindMany.mockResolvedValue(sessions);

    const result = await getBookSessions({ bookId: 'book-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessions).toHaveLength(10);
      expect(result.data.nextCursor).toBe('rs-10');
    }
  });

  it('returns null nextCursor when no more results', async () => {
    const sessions = [makeSession('rs-1')];
    mockFindMany.mockResolvedValue(sessions);

    const result = await getBookSessions({ bookId: 'book-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it('passes cursor for pagination', async () => {
    mockFindMany.mockResolvedValue([]);

    await getBookSessions({ bookId: 'book-123', cursor: 'rs-5' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: 'rs-5' },
      })
    );
  });

  it('returns empty sessions array when no sessions exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getBookSessions({ bookId: 'book-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessions).toHaveLength(0);
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it('validates bookId is required', async () => {
    const result = await getBookSessions({ bookId: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid request parameters');
    }
  });

  it('uses custom limit when provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await getBookSessions({ bookId: 'book-123', limit: 5 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6, // 5 + 1
      })
    );
  });
});
