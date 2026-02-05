/**
 * Integration tests for book search with library functionality
 * Tests the integration between BookSearch, BookSearchResult, and AddToLibraryButton
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookSearchResult } from './BookSearchResult';
import type { BookSearchResult as BookSearchResultType } from '@/services/books/types';

// Mock all external dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/actions/books', () => ({
  addToLibrary: vi.fn(),
  getBatchUserBookStatus: vi.fn(),
}));

import { toast } from 'sonner';
import { addToLibrary } from '@/actions/books';

const mockAddToLibrary = addToLibrary as unknown as ReturnType<typeof vi.fn>;

describe('Book Search Library Integration', () => {
  const mockBook: BookSearchResultType = {
    id: 'book-123',
    source: 'openlibrary',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    isbn13: '9780743273565',
    publishedYear: 1925,
    coverUrl: 'https://example.com/cover.jpg',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add button visibility', () => {
    it('shows "Add to Library" button for books not in library', () => {
      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
    });

    it('shows checkmark with status for books already in library', () => {
      render(
        <BookSearchResult
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
        />
      );

      expect(screen.getByText('Currently Reading')).toBeInTheDocument();
      // Should not show "Add to Library" button
      expect(screen.queryByRole('button', { name: /add to library/i })).not.toBeInTheDocument();
    });
  });

  describe('Status selector interaction', () => {
    it('opens status selector when Add to Library button is clicked', async () => {
      const user = userEvent.setup();
      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));

      // Check all three status options are visible
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /currently reading/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /finished/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /want to read/i })).toBeInTheDocument();
      });
    });
  });

  describe('Add book flow', () => {
    it('calls addToLibrary with correct data when status selected', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({
        success: true,
        data: { id: 'userbook-1', status: 'CURRENTLY_READING' },
      });

      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(mockAddToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'The Great Gatsby',
            authors: ['F. Scott Fitzgerald'],
            isbn13: '9780743273565',
            status: 'CURRENTLY_READING',
          })
        );
      });
    });

    it('shows success toast when book is added successfully', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({
        success: true,
        data: { id: 'userbook-1', status: 'FINISHED' },
      });

      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /finished/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Added to Finished');
      });
    });

    it('calls onAdd callback when book is added', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      mockAddToLibrary.mockResolvedValue({
        success: true,
        data: { id: 'userbook-1', status: 'WANT_TO_READ' },
      });

      render(<BookSearchResult book={mockBook} isInLibrary={false} onAdd={onAdd} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /want to read/i }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith('WANT_TO_READ');
      });
    });
  });

  describe('Error handling', () => {
    it('shows error toast when add fails', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({
        success: false,
        error: 'You must be logged in to add books',
      });

      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('You must be logged in to add books');
      });
    });

    it('shows error toast when book is already in library', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({
        success: false,
        error: 'This book is already in your library',
      });

      render(<BookSearchResult book={mockBook} isInLibrary={false} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('This book is already in your library');
      });
    });
  });

  describe('Status display', () => {
    it('displays "Currently Reading" status correctly', () => {
      render(
        <BookSearchResult
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
        />
      );

      expect(screen.getByText('Currently Reading')).toBeInTheDocument();
    });

    it('displays "Finished" status correctly', () => {
      render(
        <BookSearchResult book={mockBook} isInLibrary={true} currentStatus="FINISHED" />
      );

      expect(screen.getByText('Finished')).toBeInTheDocument();
    });

    it('displays "Want to Read" status correctly', () => {
      render(
        <BookSearchResult book={mockBook} isInLibrary={true} currentStatus="WANT_TO_READ" />
      );

      expect(screen.getByText('Want to Read')).toBeInTheDocument();
    });
  });

  describe('Interaction prevention', () => {
    it('prevents click propagation when clicking add button', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      mockAddToLibrary.mockResolvedValue({ success: true, data: {} });

      render(<BookSearchResult book={mockBook} onClick={onClick} isInLibrary={false} />);

      // Find the button within the search result container
      const addButton = screen.getByText('Add to Library').closest('button');
      expect(addButton).toBeInTheDocument();
      await user.click(addButton!);

      // onClick should NOT be called when clicking the add button
      expect(onClick).not.toHaveBeenCalled();
    });

    it('allows click on result area when not clicking button', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<BookSearchResult book={mockBook} onClick={onClick} isInLibrary={false} />);

      // Click on the title (not the button)
      await user.click(screen.getByText('The Great Gatsby'));

      expect(onClick).toHaveBeenCalledWith(mockBook);
    });
  });
});
