import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToLibraryButton } from './AddToLibraryButton';
import type { BookSearchResult } from '@/services/books/types';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/actions/books', () => ({
  addToLibrary: vi.fn(),
}));

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

import { toast } from 'sonner';
import { addToLibrary } from '@/actions/books';

const mockAddToLibrary = addToLibrary as unknown as ReturnType<typeof vi.fn>;

describe('AddToLibraryButton', () => {
  const mockBook: BookSearchResult = {
    id: 'book-123',
    source: 'openlibrary',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    isbn13: '9780743273565',
    publishedYear: 1925,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when book is not in library', () => {
    it('renders "Add to Library" button', () => {
      render(<AddToLibraryButton book={mockBook} />);

      expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
    });

    it('opens status dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));

      expect(screen.getByRole('menuitem', { name: /currently reading/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /finished/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /want to read/i })).toBeInTheDocument();
    });

    it('calls addToLibrary with correct data when status selected', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({ success: true, data: {} });

      render(<AddToLibraryButton book={mockBook} />);

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

    it('shows success toast on successful add', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({ success: true, data: {} });

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Added to Currently Reading');
      });
    });

    it('shows error toast on failure', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({ success: false, error: 'Failed to add' });

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to add');
      });
    });

    it('calls onStatusChange callback on success', async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      mockAddToLibrary.mockResolvedValue({ success: true, data: {} });

      render(<AddToLibraryButton book={mockBook} onStatusChange={onStatusChange} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /finished/i }));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('FINISHED');
      });
    });
  });

  describe('when book is in library', () => {
    it('renders checkmark with current status', () => {
      render(
        <AddToLibraryButton
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
        />
      );

      expect(screen.getByText('Currently Reading')).toBeInTheDocument();
    });

    it('shows "Finished" status correctly', () => {
      render(
        <AddToLibraryButton book={mockBook} isInLibrary={true} currentStatus="FINISHED" />
      );

      expect(screen.getByText('Finished')).toBeInTheDocument();
    });

    it('shows "Want to Read" status correctly', () => {
      render(
        <AddToLibraryButton book={mockBook} isInLibrary={true} currentStatus="WANT_TO_READ" />
      );

      expect(screen.getByText('Want to Read')).toBeInTheDocument();
    });

    it('button is clickable when book is in library (AC #3)', async () => {
      const user = userEvent.setup();
      const onViewInLibrary = vi.fn();
      render(
        <AddToLibraryButton
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          onViewInLibrary={onViewInLibrary}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      await user.click(button);
      expect(onViewInLibrary).toHaveBeenCalled();
    });
  });

  describe('book limit error handling', () => {
    const bookLimitError = {
      success: false as const,
      error: "You've reached the free tier limit of 3 books.",
      code: 'BOOK_LIMIT_REACHED' as const,
      premiumStatus: 'FREE',
      currentBookCount: 3,
      maxBooks: 3,
    };

    it('shows upgrade dialog when BOOK_LIMIT_REACHED error returned', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue(bookLimitError);

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(screen.getByText("You're a power reader!")).toBeInTheDocument();
      });
    });

    it('does NOT call toast.error for book limit error', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue(bookLimitError);

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(screen.getByText("You're a power reader!")).toBeInTheDocument();
      });
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('dismissing dialog returns to normal state', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue(bookLimitError);

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(screen.getByText("You're a power reader!")).toBeInTheDocument();
      });

      // Click "Maybe Later" to dismiss
      await user.click(screen.getByRole('button', { name: /maybe later/i }));

      await waitFor(() => {
        expect(screen.queryByText("You're a power reader!")).not.toBeInTheDocument();
      });

      // Button should still be functional
      expect(screen.getByRole('button', { name: /add to library/i })).toBeInTheDocument();
    });

    it('generic errors still show toast.error (regression)', async () => {
      const user = userEvent.setup();
      mockAddToLibrary.mockResolvedValue({ success: false, error: 'Server error' });

      render(<AddToLibraryButton book={mockBook} />);

      await user.click(screen.getByRole('button', { name: /add to library/i }));
      await user.click(screen.getByRole('menuitem', { name: /currently reading/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });

      // Upgrade dialog should NOT appear
      expect(screen.queryByText("You're a power reader!")).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper aria attributes for dropdown', async () => {
      const user = userEvent.setup();
      render(<AddToLibraryButton book={mockBook} />);

      const button = screen.getByRole('button', { name: /add to library/i });
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper label when in library', () => {
      render(
        <AddToLibraryButton
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
        />
      );

      expect(
        screen.getByRole('button', { name: /in library: currently reading.*tap to view/i })
      ).toBeInTheDocument();
    });
  });
});
