import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActivityFeed } from './getActivityFeed';

// Mock dependencies
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
    follow: {
      findMany: vi.fn(),
    },
    readingSession: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userBook: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    kudos: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
const mockFollowFindMany = prisma.follow.findMany as ReturnType<typeof vi.fn>;
const mockSessionFindMany = prisma.readingSession.findMany as ReturnType<typeof vi.fn>;
const mockUserBookFindMany = prisma.userBook.findMany as ReturnType<typeof vi.fn>;
const mockKudosFindMany = (prisma as unknown as { kudos: { findMany: ReturnType<typeof vi.fn> } }).kudos.findMany;
const mockSessionCount = (prisma.readingSession as unknown as { count: ReturnType<typeof vi.fn> }).count;
const mockUserBookCount = (prisma.userBook as unknown as { count: ReturnType<typeof vi.fn> }).count;

describe('getActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User' },
    });
    mockKudosFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(0);
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getActivityFeed();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns empty array when user follows no one', async () => {
    mockFollowFindMany.mockResolvedValue([]);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.hasFollows).toBe(false);
    }
  });

  it('returns activity from followed users only', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([
      { followingId: 'user-2' },
      { followingId: 'user-3' },
    ]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: 'avatar2.jpg',
          image: null,
        },
        book: {
          id: 'book-1',
          title: 'Test Book',
          coverUrl: 'cover1.jpg',
        },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(1);
      expect(result.data.activities[0].type).toBe('session');
      expect(result.data.activities[0].userId).toBe('user-2');
      expect(result.data.hasFollows).toBe(true);
    }

    // Verify query filters (now includes date filter)
    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['user-2', 'user-3'] },
          user: { showReadingActivity: true },
          startedAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it('filters out users with showReadingActivity = false', async () => {
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);
    mockSessionFindMany.mockResolvedValue([]);
    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(0);

    await getActivityFeed();

    // Verify privacy filter is applied
    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { showReadingActivity: true },
        }),
      })
    );

    expect(mockUserBookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { showReadingActivity: true },
        }),
      })
    );
  });

  it('merges sessions and finished books, sorted by timestamp', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: yesterday,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: 'image2.jpg',
        },
        book: { id: 'book-1', title: 'Book One', coverUrl: 'cover1.jpg' },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([
      {
        id: 'userbook-1',
        userId: 'user-2',
        bookId: 'book-2',
        dateFinished: now,
        createdAt: twoDaysAgo,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: 'image2.jpg',
        },
        book: {
          id: 'book-2',
          title: 'Book Two',
          author: 'Author Two',
          coverUrl: 'cover2.jpg',
        },
      },
    ]);

    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(1);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(2);
      // Most recent first (finished book)
      expect(result.data.activities[0].type).toBe('finished');
      expect(result.data.activities[0].bookTitle).toBe('Book Two');
      // Then session
      expect(result.data.activities[1].type).toBe('session');
      expect(result.data.activities[1].bookTitle).toBe('Book One');
    }
  });

  it('returns paginated results with correct limit', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    // Create 10 sessions (queryCap = limit + offset = 10)
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      id: `session-${i}`,
      userId: 'user-2',
      bookId: `book-${i}`,
      duration: 1800,
      startedAt: new Date(now.getTime() - i * 1000),
      user: {
        id: 'user-2',
        name: 'User Two',
        avatarUrl: null,
        image: null,
      },
      book: { id: `book-${i}`, title: `Book ${i}`, coverUrl: null },
    }));

    mockSessionFindMany.mockResolvedValue(sessions);
    mockUserBookFindMany.mockResolvedValue([]);
    // Total from count queries
    mockSessionCount.mockResolvedValue(25);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed({ limit: 10, offset: 0 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(10);
      expect(result.data.total).toBe(25);
    }
  });

  it('returns paginated results with correct offset', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    // queryCap = limit + offset = 10 + 10 = 20
    const sessions = Array.from({ length: 20 }, (_, i) => ({
      id: `session-${i}`,
      userId: 'user-2',
      bookId: `book-${i}`,
      duration: 1800,
      startedAt: new Date(now.getTime() - i * 1000),
      user: {
        id: 'user-2',
        name: 'User Two',
        avatarUrl: null,
        image: null,
      },
      book: { id: `book-${i}`, title: `Book ${i}`, coverUrl: null },
    }));

    mockSessionFindMany.mockResolvedValue(sessions);
    mockUserBookFindMany.mockResolvedValue([]);
    // Total from count queries
    mockSessionCount.mockResolvedValue(25);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed({ limit: 10, offset: 10 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(10);
      expect(result.data.activities[0].id).toBe('session-10');
      expect(result.data.total).toBe(25);
    }
  });

  it('returns correct total count', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: { id: 'book-1', title: 'Book One', coverUrl: null },
      },
      {
        id: 'session-2',
        userId: 'user-2',
        bookId: 'book-2',
        duration: 1200,
        startedAt: new Date(now.getTime() - 1000),
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: { id: 'book-2', title: 'Book Two', coverUrl: null },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([
      {
        id: 'userbook-1',
        userId: 'user-2',
        bookId: 'book-3',
        dateFinished: now,
        createdAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: {
          id: 'book-3',
          title: 'Book Three',
          author: 'Author',
          coverUrl: null,
        },
      },
    ]);

    // Total comes from count queries: 2 sessions + 1 finished book
    mockSessionCount.mockResolvedValue(2);
    mockUserBookCount.mockResolvedValue(1);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(3);
    }
  });

  it('returns empty array when followed users have no activity', async () => {
    mockFollowFindMany.mockResolvedValue([
      { followingId: 'user-2' },
      { followingId: 'user-3' },
    ]);
    mockSessionFindMany.mockResolvedValue([]);
    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.hasFollows).toBe(true); // User has follows, just no activity
    }
  });

  it('includes user and book data in each activity item', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'Jane Doe',
          avatarUrl: 'avatar.jpg',
          image: 'image.jpg',
        },
        book: {
          id: 'book-1',
          title: 'Great Book',
          coverUrl: 'cover.jpg',
        },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'session') {
      const activity = result.data.activities[0];
      expect(activity.userName).toBe('Jane Doe');
      expect(activity.userAvatar).toBe('avatar.jpg');
      expect(activity.bookTitle).toBe('Great Book');
      expect(activity.bookCover).toBe('cover.jpg');
      expect(activity.duration).toBe(1800);
    }
  });

  it('handles Prisma errors gracefully', async () => {
    mockFollowFindMany.mockRejectedValue(new Error('Database error'));

    const result = await getActivityFeed();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to load activity feed');
    }
  });

  it('uses default pagination values', async () => {
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);
    mockSessionFindMany.mockResolvedValue([]);
    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    // Default limit is 20, offset is 0
  });

  it('prefers avatarUrl over image for user avatar', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: 'custom-avatar.jpg',
          image: 'oauth-image.jpg',
        },
        book: { id: 'book-1', title: 'Book', coverUrl: null },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'session') {
      expect(result.data.activities[0].userAvatar).toBe('custom-avatar.jpg');
    }
  });

  it('falls back to image when avatarUrl is null', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: 'oauth-image.jpg',
        },
        book: { id: 'book-1', title: 'Book', coverUrl: null },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'session') {
      expect(result.data.activities[0].userAvatar).toBe('oauth-image.jpg');
    }
  });

  it('uses dateFinished for finished book timestamp', async () => {
    const dateFinished = new Date('2024-01-15');
    const createdAt = new Date('2024-01-01');

    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);
    mockSessionFindMany.mockResolvedValue([]);

    mockUserBookFindMany.mockResolvedValue([
      {
        id: 'userbook-1',
        userId: 'user-2',
        bookId: 'book-1',
        dateFinished,
        createdAt,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: {
          id: 'book-1',
          title: 'Book',
          author: 'Author',
          coverUrl: null,
        },
      },
    ]);

    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(1);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'finished') {
      expect(result.data.activities[0].timestamp).toEqual(dateFinished);
    }
  });

  it('falls back to createdAt when dateFinished is null', async () => {
    const createdAt = new Date('2024-01-01');

    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);
    mockSessionFindMany.mockResolvedValue([]);

    mockUserBookFindMany.mockResolvedValue([
      {
        id: 'userbook-1',
        userId: 'user-2',
        bookId: 'book-1',
        dateFinished: null,
        createdAt,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: {
          id: 'book-1',
          title: 'Book',
          author: 'Author',
          coverUrl: null,
        },
      },
    ]);

    mockSessionCount.mockResolvedValue(0);
    mockUserBookCount.mockResolvedValue(1);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'finished') {
      expect(result.data.activities[0].timestamp).toEqual(createdAt);
    }
  });

  it('includes kudos count and userGaveKudos in session activities', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: { id: 'book-1', title: 'Book One', coverUrl: null },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    mockKudosFindMany.mockResolvedValue([
      { sessionId: 'session-1', giverId: 'user-1' },
      { sessionId: 'session-1', giverId: 'user-3' },
    ]);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'session') {
      expect(result.data.activities[0].kudosCount).toBe(2);
      expect(result.data.activities[0].userGaveKudos).toBe(true);
    }
  });

  it('sets userGaveKudos to false when current user has not given kudos', async () => {
    const now = new Date();
    mockFollowFindMany.mockResolvedValue([{ followingId: 'user-2' }]);

    mockSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        duration: 1800,
        startedAt: now,
        user: {
          id: 'user-2',
          name: 'User Two',
          avatarUrl: null,
          image: null,
        },
        book: { id: 'book-1', title: 'Book One', coverUrl: null },
      },
    ]);

    mockUserBookFindMany.mockResolvedValue([]);
    mockSessionCount.mockResolvedValue(1);
    mockUserBookCount.mockResolvedValue(0);

    mockKudosFindMany.mockResolvedValue([
      { sessionId: 'session-1', giverId: 'user-3' },
    ]);

    const result = await getActivityFeed();

    expect(result.success).toBe(true);
    if (result.success && result.data.activities[0].type === 'session') {
      expect(result.data.activities[0].kudosCount).toBe(1);
      expect(result.data.activities[0].userGaveKudos).toBe(false);
    }
  });
});
