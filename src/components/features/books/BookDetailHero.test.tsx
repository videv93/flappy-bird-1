import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookDetailHero } from './BookDetailHero';
import type { Book } from '@prisma/client';

// Mock shouldReduceMotion for AuthorVerifiedBadge
vi.mock('@/lib/motion', () => ({
  shouldReduceMotion: vi.fn(() => false),
}));

// Mock getClaimStatus
vi.mock('@/actions/authors/getClaimStatus', () => ({
  getClaimStatus: vi.fn().mockResolvedValue({
    success: true,
    data: { hasClaim: false },
  }),
}));

// Mock AuthorClaimForm (Sheet-based component)
vi.mock('@/components/features/authors/AuthorClaimForm', () => ({
  AuthorClaimForm: () => null,
}));

// Mock window.matchMedia for tooltip
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockBook: Book = {
  id: 'book-123',
  isbn10: '0123456789',
  isbn13: '9780123456789',
  title: 'The Great Test Book',
  author: 'Test Author',
  coverUrl: 'https://example.com/cover.jpg',
  pageCount: 352,
  publishedYear: 2024,
  description: 'A great book about testing',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BookDetailHero', () => {
  it('renders book title', () => {
    render(<BookDetailHero book={mockBook} />);

    expect(screen.getByTestId('book-title')).toHaveTextContent(
      'The Great Test Book'
    );
  });

  it('renders book author', () => {
    render(<BookDetailHero book={mockBook} />);

    expect(screen.getByTestId('book-author')).toHaveTextContent('Test Author');
  });

  it('renders book cover when coverUrl is provided', () => {
    render(<BookDetailHero book={mockBook} />);

    const cover = screen.getByTestId('book-cover');
    const image = cover.querySelector('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', 'Cover of The Great Test Book');
  });

  it('renders fallback when coverUrl is not provided', () => {
    const bookWithoutCover = { ...mockBook, coverUrl: null };
    render(<BookDetailHero book={bookWithoutCover} />);

    expect(screen.getByTestId('book-cover-fallback')).toBeInTheDocument();
  });

  it('renders publication year and page count', () => {
    render(<BookDetailHero book={mockBook} />);

    const metadata = screen.getByTestId('book-metadata');
    expect(metadata).toHaveTextContent('2024');
    expect(metadata).toHaveTextContent('352 pages');
  });

  it('renders only publication year when no page count', () => {
    const bookWithoutPages = { ...mockBook, pageCount: null };
    render(<BookDetailHero book={bookWithoutPages} />);

    const metadata = screen.getByTestId('book-metadata');
    expect(metadata).toHaveTextContent('2024');
    expect(metadata).not.toHaveTextContent('pages');
  });

  it('renders only page count when no publication year', () => {
    const bookWithoutYear = { ...mockBook, publishedYear: null };
    render(<BookDetailHero book={bookWithoutYear} />);

    const metadata = screen.getByTestId('book-metadata');
    expect(metadata).toHaveTextContent('352 pages');
    expect(metadata).not.toHaveTextContent('2024');
  });

  it('does not render metadata section when no year or page count', () => {
    const bookWithoutMetadata = {
      ...mockBook,
      publishedYear: null,
      pageCount: null,
    };
    render(<BookDetailHero book={bookWithoutMetadata} />);

    expect(screen.queryByTestId('book-metadata')).not.toBeInTheDocument();
  });

  it('renders verified badge when authorVerified is true', () => {
    render(<BookDetailHero book={mockBook} authorVerified />);

    expect(screen.getByTestId('author-verified-badge')).toBeInTheDocument();
  });

  it('does not render verified badge when authorVerified is false', () => {
    render(<BookDetailHero book={mockBook} authorVerified={false} />);

    expect(screen.queryByTestId('author-verified-badge')).not.toBeInTheDocument();
  });

  it('does not render verified badge by default', () => {
    render(<BookDetailHero book={mockBook} />);

    expect(screen.queryByTestId('author-verified-badge')).not.toBeInTheDocument();
  });

  it('accepts additional className', () => {
    render(<BookDetailHero book={mockBook} className="custom-class" />);

    const hero = screen.getByTestId('book-detail-hero');
    expect(hero.className).toContain('custom-class');
  });

  it('renders "Are you the author?" link for non-external books', () => {
    render(<BookDetailHero book={mockBook} />);

    expect(screen.getByTestId('are-you-author-link')).toBeInTheDocument();
  });

  it('does not render author claim section for external books', () => {
    const externalBook = {
      ...mockBook,
      isExternal: true as const,
    };
    render(<BookDetailHero book={externalBook} />);

    expect(screen.queryByTestId('author-claim-section')).not.toBeInTheDocument();
  });

  it('hides "Are you the author?" link when authorVerified is true (AC#1)', () => {
    render(<BookDetailHero book={mockBook} authorVerified />);

    expect(screen.queryByTestId('are-you-author-link')).not.toBeInTheDocument();
  });
});
