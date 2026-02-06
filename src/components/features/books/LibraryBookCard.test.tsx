import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryBookCard } from './LibraryBookCard';

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

const mockBook = {
  id: 'book-1',
  isbn10: '1234567890',
  isbn13: '9781234567890',
  title: 'Test Book Title',
  author: 'Test Author',
  coverUrl: 'https://covers.openlibrary.org/b/id/123-M.jpg',
  pageCount: 300,
  publishedYear: 2024,
  description: 'A test book',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
};

const baseUserBook = {
  id: 'ub-1',
  userId: 'user-1',
  bookId: 'book-1',
  status: 'CURRENTLY_READING' as const,
  progress: 50,
  dateAdded: new Date('2024-01-01'),
  dateFinished: null,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  book: mockBook,
};

describe('LibraryBookCard', () => {
  it('renders book title and author', () => {
    render(<LibraryBookCard userBook={baseUserBook} />);

    expect(screen.getByText('Test Book Title')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders book cover image when coverUrl exists', () => {
    render(<LibraryBookCard userBook={baseUserBook} />);

    const img = screen.getByAltText('Cover of Test Book Title');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://covers.openlibrary.org/b/id/123-M.jpg'
    );
  });

  it('renders fallback when no cover image', () => {
    const noCoverBook = {
      ...baseUserBook,
      book: { ...mockBook, coverUrl: null },
    };

    render(<LibraryBookCard userBook={noCoverBook} />);

    expect(screen.getByTestId('book-cover-fallback')).toBeInTheDocument();
  });

  it('shows progress bar for CURRENTLY_READING status', () => {
    render(<LibraryBookCard userBook={baseUserBook} />);

    expect(screen.getByTestId('reading-progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not show progress bar for FINISHED status', () => {
    const finishedBook = {
      ...baseUserBook,
      status: 'FINISHED' as const,
      progress: 100,
      dateFinished: new Date('2024-03-15'),
    };

    render(<LibraryBookCard userBook={finishedBook} />);

    expect(screen.queryByTestId('reading-progress')).not.toBeInTheDocument();
  });

  it('shows completion date for FINISHED status', () => {
    const finishedBook = {
      ...baseUserBook,
      status: 'FINISHED' as const,
      progress: 100,
      dateFinished: new Date('2024-03-15'),
    };

    render(<LibraryBookCard userBook={finishedBook} />);

    expect(screen.getByTestId('completion-date')).toBeInTheDocument();
    expect(screen.getByTestId('completion-date').textContent).toContain('Finished');
  });

  it('shows "X reading now" when currentlyReading > 0', () => {
    render(
      <LibraryBookCard
        userBook={baseUserBook}
        readerCount={{ total: 5, reading: 3 }}
      />
    );

    expect(screen.getByTestId('reading-now-count')).toBeInTheDocument();
    expect(screen.getByText('3 reading now')).toBeInTheDocument();
  });

  it('does not show reading count when no readers', () => {
    render(
      <LibraryBookCard
        userBook={baseUserBook}
        readerCount={{ total: 1, reading: 0 }}
      />
    );

    expect(screen.queryByTestId('reading-now-count')).not.toBeInTheDocument();
  });

  it('links to correct book detail page using isbn13', () => {
    render(<LibraryBookCard userBook={baseUserBook} />);

    const link = screen.getByTestId('library-book-card');
    expect(link).toHaveAttribute('href', '/book/9781234567890');
  });

  it('falls back to isbn10 when isbn13 is null', () => {
    const noIsbn13Book = {
      ...baseUserBook,
      book: { ...mockBook, isbn13: null },
    };

    render(<LibraryBookCard userBook={noIsbn13Book} />);

    const link = screen.getByTestId('library-book-card');
    expect(link).toHaveAttribute('href', '/book/1234567890');
  });

  it('has accessible aria-label', () => {
    render(<LibraryBookCard userBook={baseUserBook} />);

    const link = screen.getByTestId('library-book-card');
    expect(link).toHaveAttribute(
      'aria-label',
      'Test Book Title by Test Author, Currently Reading'
    );
  });
});
