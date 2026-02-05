import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addToLibrary, type AddToLibraryInput } from './addToLibrary';

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
      upsert: vi.fn(),
      create: vi.fn(),
    },
    userBook: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockHeaders = headers as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockBookUpsert = prisma.book.upsert as unknown as ReturnType<typeof vi.fn>;
const mockBookCreate = prisma.book.create as unknown as ReturnType<typeof vi.fn>;
const mockUserBookFindUnique = prisma.userBook.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserBookCreate = prisma.userBook.create as unknown as ReturnType<typeof vi.fn>;

describe('addToLibrary', () => {
  const validInput: AddToLibraryInput = {
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    isbn13: '9780743273565',
    status: 'CURRENTLY_READING',
  };

  const mockBook = {
    id: 'book-123',
    isbn13: '9780743273565',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserBook = {
    id: 'userbook-123',
    userId: 'user-123',
    bookId: 'book-123',
    status: 'CURRENTLY_READING',
    progress: 0,
    dateAdded: new Date(),
    dateFinished: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    book: mockBook,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it('returns error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await addToLibrary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('You must be logged in to add books');
    }
  });

  it('creates book and userBook when book does not exist', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookUpsert.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(null);
    mockUserBookCreate.mockResolvedValue(mockUserBook);

    const result = await addToLibrary(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.book.title).toBe('The Great Gatsby');
      expect(result.data.status).toBe('CURRENTLY_READING');
    }

    expect(mockBookUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isbn13: '9780743273565' },
      })
    );
  });

  it('returns error when book already in library', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookUpsert.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(mockUserBook);

    const result = await addToLibrary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('This book is already in your library');
    }
  });

  it('sets progress to 100 when status is FINISHED', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookUpsert.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(null);
    mockUserBookCreate.mockResolvedValue({
      ...mockUserBook,
      status: 'FINISHED',
      progress: 100,
    });

    const finishedInput = { ...validInput, status: 'FINISHED' as const };
    await addToLibrary(finishedInput);

    expect(mockUserBookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FINISHED',
          progress: 100,
        }),
      })
    );
  });

  it('creates book without ISBN when none provided', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookCreate.mockResolvedValue({ ...mockBook, isbn13: null, isbn10: null });
    mockUserBookFindUnique.mockResolvedValue(null);
    mockUserBookCreate.mockResolvedValue(mockUserBook);

    const inputWithoutISBN = {
      title: 'Unknown Book',
      authors: ['Unknown Author'],
      status: 'WANT_TO_READ' as const,
    };

    const result = await addToLibrary(inputWithoutISBN);

    expect(result.success).toBe(true);
    expect(mockBookCreate).toHaveBeenCalled();
    expect(mockBookUpsert).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid input', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });

    const invalidInput = {
      title: '',
      authors: [],
      status: 'CURRENTLY_READING' as const,
    };

    const result = await addToLibrary(invalidInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid book data');
    }
  });

  it('prefers isbn13 over isbn10 for upsert lookup', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookUpsert.mockResolvedValue(mockBook);
    mockUserBookFindUnique.mockResolvedValue(null);
    mockUserBookCreate.mockResolvedValue(mockUserBook);

    const inputWithBothISBNs = {
      ...validInput,
      isbn10: '0743273567',
      isbn13: '9780743273565',
    };

    await addToLibrary(inputWithBothISBNs);

    expect(mockBookUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isbn13: '9780743273565' },
      })
    );
  });

  it('logs error and returns generic message on database failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ user: { id: 'user-123' } });
    mockBookUpsert.mockRejectedValue(new Error('Database connection failed'));

    const result = await addToLibrary(validInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to add book to library');
    }
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to add book to library:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
