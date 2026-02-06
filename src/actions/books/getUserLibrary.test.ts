import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserLibrary } from './getUserLibrary';

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
    userBook: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockHeaders = headers as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserBookFindMany = prisma.userBook.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUserBookGroupBy = prisma.userBook.groupBy as unknown as ReturnType<typeof vi.fn>;

const mockBook = {
  id: 'book-1',
  isbn10: '1234567890',
  isbn13: '9781234567890',
  title: 'Test Book',
  author: 'Test Author',
  coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg',
  pageCount: 300,
  publishedYear: 2024,
  description: 'A test book',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserBook = {
  id: 'ub-1',
  userId: 'user-1',
  bookId: 'book-1',
  status: 'CURRENTLY_READING' as const,
  progress: 50,
  dateAdded: new Date(),
  dateFinished: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  book: mockBook,
};

describe('getUserLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getUserLibrary();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns empty books array when user has no books', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockResolvedValue([]);

    const result = await getUserLibrary();

    expect(result).toEqual({
      success: true,
      data: { books: [], readerCounts: {} },
    });
    expect(mockUserBookFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', deletedAt: null },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('returns books with reader counts', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockResolvedValue([mockUserBook]);
    mockUserBookGroupBy
      .mockResolvedValueOnce([{ bookId: 'book-1', _count: 5 }]) // total counts
      .mockResolvedValueOnce([{ bookId: 'book-1', _count: 3 }]); // reading counts

    const result = await getUserLibrary();

    expect(result).toEqual({
      success: true,
      data: {
        books: [mockUserBook],
        readerCounts: { 'book-1': { total: 5, reading: 3 } },
      },
    });
  });

  it('excludes soft-deleted records', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockResolvedValue([]);

    await getUserLibrary();

    expect(mockUserBookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('includes book relation data', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockResolvedValue([mockUserBook]);
    mockUserBookGroupBy.mockResolvedValue([]);

    const result = await getUserLibrary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.books[0].book).toEqual(mockBook);
    }
    expect(mockUserBookFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { book: true },
      })
    );
  });

  it('handles multiple books with different statuses', async () => {
    const book2 = { ...mockBook, id: 'book-2', title: 'Book Two' };
    const userBook2 = {
      ...mockUserBook,
      id: 'ub-2',
      bookId: 'book-2',
      status: 'FINISHED' as const,
      progress: 100,
      dateFinished: new Date(),
      book: book2,
    };

    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockResolvedValue([mockUserBook, userBook2]);
    mockUserBookGroupBy
      .mockResolvedValueOnce([
        { bookId: 'book-1', _count: 5 },
        { bookId: 'book-2', _count: 2 },
      ])
      .mockResolvedValueOnce([{ bookId: 'book-1', _count: 3 }]);

    const result = await getUserLibrary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.books).toHaveLength(2);
      expect(result.data.readerCounts['book-1']).toEqual({ total: 5, reading: 3 });
      expect(result.data.readerCounts['book-2']).toEqual({ total: 2, reading: 0 });
    }
  });

  it('handles server errors gracefully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserBookFindMany.mockRejectedValue(new Error('DB error'));

    const result = await getUserLibrary();

    expect(result).toEqual({ success: false, error: 'Failed to load library' });
  });
});
