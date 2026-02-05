import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookSearchResult } from './BookSearchResult';
import type { BookSearchResult as BookSearchResultType } from '@/services/books/types';

// Mock AddToLibraryButton to avoid mocking all its dependencies
vi.mock('./AddToLibraryButton', () => ({
  AddToLibraryButton: vi.fn(({ isInLibrary, currentStatus, onStatusChange, onViewInLibrary }) => (
    <button
      data-testid="add-to-library-button"
      data-in-library={isInLibrary ? 'true' : 'false'}
      data-status={currentStatus || ''}
      onClick={() => {
        if (isInLibrary) {
          onViewInLibrary?.();
        } else {
          onStatusChange?.('CURRENTLY_READING');
        }
      }}
    >
      {isInLibrary ? `In Library: ${currentStatus}` : 'Add to Library'}
    </button>
  )),
}));

const mockBook: BookSearchResultType = {
  id: '/works/OL123W',
  source: 'openlibrary',
  title: 'The Hobbit',
  authors: ['J.R.R. Tolkien'],
  publishedYear: 1937,
  coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
  isbn13: '9780261102217',
};

const mockBookNoCover: BookSearchResultType = {
  id: '/works/OL456W',
  source: 'openlibrary',
  title: 'Unknown Book',
  authors: ['Unknown Author'],
};

const mockBookMultipleAuthors: BookSearchResultType = {
  id: '/works/OL789W',
  source: 'googlebooks',
  title: 'Collaborative Work',
  authors: ['Author One', 'Author Two', 'Author Three'],
  publishedYear: 2020,
};

describe('BookSearchResult', () => {
  it('renders book title', () => {
    render(<BookSearchResult book={mockBook} />);

    expect(screen.getByText('The Hobbit')).toBeInTheDocument();
  });

  it('renders book author', () => {
    render(<BookSearchResult book={mockBook} />);

    expect(screen.getByText('J.R.R. Tolkien')).toBeInTheDocument();
  });

  it('renders multiple authors as comma-separated list', () => {
    render(<BookSearchResult book={mockBookMultipleAuthors} />);

    expect(
      screen.getByText('Author One, Author Two, Author Three')
    ).toBeInTheDocument();
  });

  it('renders publication year when available', () => {
    render(<BookSearchResult book={mockBook} />);

    expect(screen.getByText('1937')).toBeInTheDocument();
  });

  it('does not render publication year when not available', () => {
    render(<BookSearchResult book={mockBookNoCover} />);

    expect(screen.queryByTestId('publication-year')).not.toBeInTheDocument();
  });

  it('renders book cover image when coverUrl is provided', () => {
    render(<BookSearchResult book={mockBook} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockBook.coverUrl);
    expect(img).toHaveAttribute('alt', `Cover of ${mockBook.title}`);
  });

  it('renders fallback icon when no coverUrl', () => {
    render(<BookSearchResult book={mockBookNoCover} />);

    expect(screen.getByTestId('book-cover-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has minimum height for touch target (72px)', () => {
    render(<BookSearchResult book={mockBook} />);

    const resultElement = screen.getByTestId('book-search-result');
    expect(resultElement.className).toContain('min-h-[72px]');
  });

  it('has hover styles for interactivity', () => {
    render(<BookSearchResult book={mockBook} />);

    const resultElement = screen.getByTestId('book-search-result');
    expect(resultElement.className).toContain('hover:bg-accent');
  });

  it('truncates long titles', () => {
    render(<BookSearchResult book={mockBook} />);

    const titleElement = screen.getByText('The Hobbit');
    expect(titleElement.className).toContain('line-clamp-1');
  });

  it('truncates long author names', () => {
    render(<BookSearchResult book={mockBook} />);

    const authorElement = screen.getByText('J.R.R. Tolkien');
    expect(authorElement.className).toContain('line-clamp-1');
  });

  it('calls onClick when provided and clicked', () => {
    const handleClick = vi.fn();
    render(<BookSearchResult book={mockBook} onClick={handleClick} />);

    const resultElement = screen.getByTestId('book-search-result');
    resultElement.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockBook);
  });

  it('has proper keyboard accessibility with tabIndex', () => {
    render(<BookSearchResult book={mockBook} onClick={() => {}} />);

    const resultElement = screen.getByTestId('book-search-result');
    expect(resultElement).toHaveAttribute('tabIndex', '0');
  });

  it('triggers onClick on Enter key press', () => {
    const handleClick = vi.fn();
    render(<BookSearchResult book={mockBook} onClick={handleClick} />);

    const resultElement = screen.getByTestId('book-search-result');
    resultElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    expect(handleClick).toHaveBeenCalled();
  });

  describe('AddToLibraryButton integration', () => {
    it('renders AddToLibraryButton component', () => {
      render(<BookSearchResult book={mockBook} />);

      expect(screen.getByTestId('add-to-library-button')).toBeInTheDocument();
    });

    it('passes isInLibrary prop to AddToLibraryButton', () => {
      render(<BookSearchResult book={mockBook} isInLibrary={true} currentStatus="FINISHED" />);

      const button = screen.getByTestId('add-to-library-button');
      expect(button).toHaveAttribute('data-in-library', 'true');
      expect(button).toHaveAttribute('data-status', 'FINISHED');
    });

    it('passes onAdd callback to AddToLibraryButton', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<BookSearchResult book={mockBook} onAdd={onAdd} />);

      await user.click(screen.getByTestId('add-to-library-button'));

      expect(onAdd).toHaveBeenCalledWith('CURRENTLY_READING');
    });

    it('does not trigger onClick when AddToLibraryButton is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onAdd = vi.fn();
      render(<BookSearchResult book={mockBook} onClick={onClick} onAdd={onAdd} />);

      await user.click(screen.getByTestId('add-to-library-button'));

      expect(onAdd).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onClick when in-library button is clicked (AC #3: tap to view book)', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <BookSearchResult
          book={mockBook}
          onClick={onClick}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
        />
      );

      await user.click(screen.getByTestId('add-to-library-button'));

      // When book is in library, clicking the button should navigate to the book
      expect(onClick).toHaveBeenCalledWith(mockBook);
    });
  });
});
