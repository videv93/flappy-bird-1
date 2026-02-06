import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibrarySection } from './LibrarySection';

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
  title: 'Test Book',
  author: 'Author One',
  coverUrl: null,
  pageCount: 200,
  publishedYear: 2024,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserBook = {
  id: 'ub-1',
  userId: 'user-1',
  bookId: 'book-1',
  status: 'CURRENTLY_READING' as const,
  progress: 30,
  dateAdded: new Date(),
  dateFinished: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  book: mockBook,
};

describe('LibrarySection', () => {
  it('renders book cards when books exist', () => {
    render(
      <LibrarySection books={[mockUserBook]} readerCounts={{}} />
    );

    expect(screen.getByTestId('library-section')).toBeInTheDocument();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
  });

  it('renders multiple book cards', () => {
    const book2 = {
      ...mockUserBook,
      id: 'ub-2',
      bookId: 'book-2',
      book: { ...mockBook, id: 'book-2', title: 'Second Book' },
    };

    render(
      <LibrarySection books={[mockUserBook, book2]} readerCounts={{}} />
    );

    expect(screen.getAllByTestId('library-book-card')).toHaveLength(2);
  });

  it('shows empty message when no books', () => {
    render(
      <LibrarySection books={[]} readerCounts={{}} />
    );

    expect(screen.getByTestId('section-empty')).toBeInTheDocument();
    expect(screen.getByText('No books in this section yet.')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <LibrarySection
        books={[]}
        readerCounts={{}}
        emptyMessage="Start reading something new!"
      />
    );

    expect(screen.getByText('Start reading something new!')).toBeInTheDocument();
  });

  it('passes reader counts to book cards', () => {
    const readerCounts = { 'book-1': { total: 5, reading: 3 } };

    render(
      <LibrarySection books={[mockUserBook]} readerCounts={readerCounts} />
    );

    expect(screen.getByText('3 reading now')).toBeInTheDocument();
  });
});
