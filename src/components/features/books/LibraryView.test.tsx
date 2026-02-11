import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryView } from './LibraryView';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/actions/books', () => ({
  getUserLibrary: vi.fn(),
  getBookLimitInfo: vi.fn().mockResolvedValue({
    success: true,
    data: { isPremium: false, currentBookCount: 1, maxBooks: 3 },
  }),
}));

import { getUserLibrary, getBookLimitInfo } from '@/actions/books';

const mockGetUserLibrary = getUserLibrary as unknown as ReturnType<typeof vi.fn>;
const mockGetBookLimitInfo = getBookLimitInfo as unknown as ReturnType<typeof vi.fn>;

const mockBook = {
  id: 'book-1',
  isbn10: '1234567890',
  isbn13: '9781234567890',
  title: 'Reading Book',
  author: 'Author A',
  coverUrl: null,
  pageCount: 200,
  publishedYear: 2024,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReadingBook = {
  id: 'ub-1',
  userId: 'user-1',
  bookId: 'book-1',
  status: 'CURRENTLY_READING' as const,
  progress: 40,
  dateAdded: new Date('2024-01-01'),
  dateFinished: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date('2024-06-01'),
  book: mockBook,
};

const mockFinishedBook = {
  id: 'ub-2',
  userId: 'user-1',
  bookId: 'book-2',
  status: 'FINISHED' as const,
  progress: 100,
  dateAdded: new Date('2024-01-01'),
  dateFinished: new Date('2024-05-15'),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date('2024-05-15'),
  book: {
    ...mockBook,
    id: 'book-2',
    isbn13: '9781234567891',
    title: 'Finished Book',
    author: 'Author B',
  },
};

const mockWantBook = {
  id: 'ub-3',
  userId: 'user-1',
  bookId: 'book-3',
  status: 'WANT_TO_READ' as const,
  progress: 0,
  dateAdded: new Date('2024-02-01'),
  dateFinished: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date('2024-02-01'),
  book: {
    ...mockBook,
    id: 'book-3',
    isbn13: '9781234567892',
    title: 'Want to Read Book',
    author: 'Author C',
  },
};

describe('LibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons during fetch', () => {
    mockGetUserLibrary.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<LibraryView />);

    expect(screen.getByTestId('library-loading')).toBeInTheDocument();
  });

  it('shows empty state when no books', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: { books: [], readerCounts: {} },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /start your reading journey/i })
    ).toBeInTheDocument();
  });

  it('renders tabs for three reading statuses', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [mockReadingBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-tabs')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /reading/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /want to read/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /finished/i })).toBeInTheDocument();
  });

  it('shows book count badges on tabs', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [mockReadingBook, mockFinishedBook, mockWantBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-count-CURRENTLY_READING')).toHaveTextContent(
        '(1)'
      );
    });

    expect(screen.getByTestId('tab-count-FINISHED')).toHaveTextContent('(1)');
    expect(screen.getByTestId('tab-count-WANT_TO_READ')).toHaveTextContent('(1)');
  });

  it('shows (0) count badge on empty tabs', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [mockReadingBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-count-CURRENTLY_READING')).toHaveTextContent(
        '(1)'
      );
    });

    expect(screen.getByTestId('tab-count-FINISHED')).toHaveTextContent('(0)');
    expect(screen.getByTestId('tab-count-WANT_TO_READ')).toHaveTextContent('(0)');
  });

  it('renders books in the Currently Reading tab by default', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [mockReadingBook, mockFinishedBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByText('Reading Book')).toBeInTheDocument();
    });

    expect(screen.getByTestId('reading-progress')).toBeInTheDocument();
  });

  it('shows books in Finished tab when clicked', async () => {
    const user = userEvent.setup();

    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [mockReadingBook, mockFinishedBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-tabs')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /finished/i }));

    expect(screen.getByText('Finished Book')).toBeInTheDocument();
    expect(screen.getByTestId('completion-date')).toBeInTheDocument();
  });

  it('shows error state with retry on failure', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: false,
      error: 'Failed to load library',
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load your library.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries fetch when Try Again is clicked', async () => {
    const user = userEvent.setup();

    mockGetUserLibrary
      .mockResolvedValueOnce({ success: false, error: 'Failed' })
      .mockResolvedValueOnce({
        success: true,
        data: { books: [mockReadingBook], readerCounts: {} },
      });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-error')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Reading Book')).toBeInTheDocument();
    });

    expect(mockGetUserLibrary).toHaveBeenCalledTimes(2);
  });

  it('has a refresh button', async () => {
    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: { books: [mockReadingBook], readerCounts: {} },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });
  });

  it('shows section empty message when tab has no books', async () => {
    const user = userEvent.setup();

    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: { books: [mockReadingBook], readerCounts: {} },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByTestId('library-tabs')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /finished/i }));

    expect(screen.getByTestId('section-empty')).toBeInTheDocument();
  });

  it('sorts Currently Reading books by updatedAt descending', async () => {
    const olderBook = {
      ...mockReadingBook,
      id: 'ub-older',
      bookId: 'book-older',
      updatedAt: new Date('2024-01-01'),
      book: {
        ...mockBook,
        id: 'book-older',
        isbn13: '9781234567899',
        title: 'Older Book',
        author: 'Author Old',
      },
    };
    const newerBook = {
      ...mockReadingBook,
      id: 'ub-newer',
      bookId: 'book-newer',
      updatedAt: new Date('2024-06-15'),
      book: {
        ...mockBook,
        id: 'book-newer',
        isbn13: '9781234567898',
        title: 'Newer Book',
        author: 'Author New',
      },
    };

    mockGetUserLibrary.mockResolvedValue({
      success: true,
      data: {
        books: [olderBook, newerBook],
        readerCounts: {},
      },
    });

    render(<LibraryView />);

    await waitFor(() => {
      expect(screen.getByText('Newer Book')).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId('library-book-card');
    expect(cards[0]).toHaveTextContent('Newer Book');
    expect(cards[1]).toHaveTextContent('Older Book');
  });

  describe('BookLimitBadge integration', () => {
    it('renders book limit badge with correct count for free user', async () => {
      mockGetUserLibrary.mockResolvedValue({
        success: true,
        data: { books: [mockReadingBook], readerCounts: {} },
      });
      mockGetBookLimitInfo.mockResolvedValue({
        success: true,
        data: { isPremium: false, currentBookCount: 2, maxBooks: 3 },
      });

      render(<LibraryView />);

      await waitFor(() => {
        expect(screen.getByTestId('book-limit-badge')).toBeInTheDocument();
      });

      expect(screen.getByTestId('book-limit-badge')).toHaveTextContent('2/3 books');
    });

    it('does not render badge for premium users', async () => {
      mockGetUserLibrary.mockResolvedValue({
        success: true,
        data: { books: [mockReadingBook], readerCounts: {} },
      });
      mockGetBookLimitInfo.mockResolvedValue({
        success: true,
        data: { isPremium: true, currentBookCount: 5, maxBooks: 3 },
      });

      render(<LibraryView />);

      await waitFor(() => {
        expect(screen.getByTestId('library-tabs')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('book-limit-badge')).not.toBeInTheDocument();
    });

    it('still loads library when getBookLimitInfo fails', async () => {
      mockGetUserLibrary.mockResolvedValue({
        success: true,
        data: { books: [mockReadingBook], readerCounts: {} },
      });
      mockGetBookLimitInfo.mockResolvedValue({
        success: false,
        error: 'Failed',
      });

      render(<LibraryView />);

      await waitFor(() => {
        expect(screen.getByText('Reading Book')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('book-limit-badge')).not.toBeInTheDocument();
    });
  });
});
