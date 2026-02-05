import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserBookStatus, getBatchUserBookStatus } from './getUserBookStatus';

// Mock dependencies
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
    book: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userBook: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockHeaders = headers as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockBookFindFirst = prisma.book.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockBookFindMany = prisma.book.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUserBookFindUnique = prisma.userBook.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserBookFindMany = prisma.userBook.findMany as unknown as ReturnType<typeof vi.fn>;

describe('getUserBookStatus', () => {
  const mockBook = {
    id: 'book-123',
    isbn10: '0743273567',
    isbn13: '9780743273565',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
  };

  const mockUserBook = {
    id: 'userbook-123',
    userId: 'user-123',
    bookId: 'book-123',
    status: 'CURRENTLY_READING',
    progress: 25,
    dateAdded: new Date(),
    dateFinished: null,
    book: mockBook,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it('returns not in library when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getUserBookStatus('9780743273565');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInLibrary).toBe(false);
    }
  });

  it('returns not in library when book does not exist', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindFirst.mockResolvedValue(null);

    const result = await getUserBookStatus('9780743273565');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInLibrary).toBe(false);
    }
  });

  it('returns not in library when user does not have the book', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindFirst.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(null);

    const result = await getUserBookStatus('9780743273565');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInLibrary).toBe(false);
    }
  });

  it('returns book status when user has the book', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindFirst.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(mockUserBook);

    const result = await getUserBookStatus('9780743273565');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInLibrary).toBe(true);
      expect(result.data.status).toBe('CURRENTLY_READING');
      expect(result.data.progress).toBe(25);
      expect(result.data.userBook).toBeDefined();
    }
  });

  it('searches by both isbn10 and isbn13', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindFirst.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(mockUserBook);

    await getUserBookStatus('0743273567');

    expect(mockBookFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ isbn10: '0743273567' }, { isbn13: '0743273567' }],
      },
    });
  });

  it('handles errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindFirst.mockRejectedValue(new Error('Database error'));

    const result = await getUserBookStatus('9780743273565');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to check library status');
    }
  });
});

describe('getBatchUserBookStatus', () => {
  const mockBooks = [
    { id: 'book-1', isbn13: '9780743273565', isbn10: null },
    { id: 'book-2', isbn13: '9780141439518', isbn10: null },
  ];

  const mockUserBooks = [
    {
      id: 'userbook-1',
      userId: 'user-123',
      bookId: 'book-1',
      status: 'CURRENTLY_READING',
      progress: 50,
      book: mockBooks[0],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it('returns empty statuses when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getBatchUserBookStatus(['9780743273565', '9780141439518']);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.get('9780743273565')?.isInLibrary).toBe(false);
      expect(result.data.get('9780141439518')?.isInLibrary).toBe(false);
    }
  });

  it('returns correct statuses for mixed library state', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookFindMany.mockResolvedValue(mockBooks);
    mockUserBookFindMany.mockResolvedValue(mockUserBooks);

    const result = await getBatchUserBookStatus(['9780743273565', '9780141439518']);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.get('9780743273565')?.isInLibrary).toBe(true);
      expect(result.data.get('9780743273565')?.status).toBe('CURRENTLY_READING');
      expect(result.data.get('9780141439518')?.isInLibrary).toBe(false);
    }
  });

  it('handles empty ISBN array', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });

    const result = await getBatchUserBookStatus([]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.size).toBe(0);
    }
  });
});
