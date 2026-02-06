import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import BookPage, { generateMetadata } from './page';

// Mock dependencies
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}));

vi.mock('@/actions/books', () => ({
  getBookById: vi.fn(),
}));

vi.mock('@/actions/sessions', () => ({
  getBookSessions: vi.fn(() => Promise.resolve({ success: true, data: { sessions: [], nextCursor: null } })),
  getUserSessionStats: vi.fn(),
  saveReadingSession: vi.fn(),
}));

vi.mock('@/components/features/books', () => ({
  BookDetail: ({ data }: { data: { book: { title: string } } }) => (
    <div data-testid="book-detail">{data.book.title}</div>
  ),
  BookDetailSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

vi.mock('@/components/layout', () => ({
  PageHeader: ({ title }: { title: string }) => <header>{title}</header>,
  BackButton: () => <button>Back</button>,
}));

import { getBookById } from '@/actions/books';

const mockBook = {
  id: 'book-123',
  title: 'Test Book',
  author: 'Test Author',
  description: 'Test description',
  coverUrl: 'https://example.com/cover.jpg',
  isbn10: '0123456789',
  isbn13: '9780123456789',
  pageCount: 300,
  publishedYear: 2024,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSuccessResult = {
  success: true as const,
  data: {
    book: mockBook,
    stats: { totalReaders: 10, currentlyReading: 3 },
    userStatus: undefined,
    authorVerified: false,
  },
};

const mockErrorResult = {
  success: false as const,
  error: 'Book not found',
};

describe('BookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns book metadata when found', async () => {
      vi.mocked(getBookById).mockResolvedValue(mockSuccessResult);

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: 'book-123' }),
      });

      expect(metadata.title).toBe('Test Book by Test Author');
      expect(metadata.description).toBe('Test description');
      expect(metadata.openGraph?.title).toBe('Test Book');
    });

    it('returns "Book Not Found" title when book not found', async () => {
      vi.mocked(getBookById).mockResolvedValue(mockErrorResult);

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: 'nonexistent' }),
      });

      expect(metadata.title).toBe('Book Not Found');
    });

    it('uses fallback description when book has no description', async () => {
      const bookWithoutDescription = {
        ...mockSuccessResult,
        data: {
          ...mockSuccessResult.data,
          book: { ...mockBook, description: null },
        },
      };
      vi.mocked(getBookById).mockResolvedValue(bookWithoutDescription);

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: 'book-123' }),
      });

      expect(metadata.description).toBe('View details for Test Book');
    });
  });

  describe('page component', () => {
    it('calls notFound when book is not found', async () => {
      vi.mocked(getBookById).mockResolvedValue(mockErrorResult);

      // The page will throw due to notFound(), so we catch it
      try {
        await BookPage({ params: Promise.resolve({ id: 'nonexistent' }) });
      } catch {
        // notFound() throws, which is expected
      }

      expect(notFound).toHaveBeenCalled();
    });

    it('renders BookDetail with correct data when book is found', async () => {
      vi.mocked(getBookById).mockResolvedValue(mockSuccessResult);

      const result = await BookPage({
        params: Promise.resolve({ id: 'book-123' }),
      });

      // Render the server component output and verify BookDetail receives data
      render(result as React.ReactElement);
      expect(screen.getByTestId('book-detail')).toBeInTheDocument();
      expect(screen.getByTestId('book-detail')).toHaveTextContent('Test Book');
    });
  });
});
