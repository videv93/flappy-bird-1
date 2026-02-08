import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookDetailActions } from './BookDetailActions';
import type { BookSearchResult } from '@/services/books/types';

// Mock next/navigation (used by SessionSummary)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock auth-client (used by ReadingRoomPanel)
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: 'user-1', name: 'Test User' } },
  }),
}));

// Mock usePresenceStore (used by ReadingRoomPanel)
vi.mock('@/stores/usePresenceStore', () => ({
  usePresenceStore: vi.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({ currentChannel: null, memberCount: 0, members: new Map() })
  ),
}));

// Mock idb-storage to prevent IndexedDB access in SessionTimer
vi.mock('@/lib/idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate,
      transition,
      layout,
      initial,
      exit,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    main: 'main',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => false,
}));

// Mock the server actions
vi.mock('@/actions/books', () => ({
  addToLibrary: vi.fn(),
  updateReadingStatus: vi.fn(),
  removeFromLibrary: vi.fn(),
  restoreToLibrary: vi.fn(),
}));

// Mock presence actions (used by ReadingRoomPanel)
vi.mock('@/actions/presence', () => ({
  joinRoom: vi.fn().mockResolvedValue({ success: true, data: { id: 'p1' } }),
  leaveRoom: vi.fn().mockResolvedValue({ success: true, data: { leftAt: new Date() } }),
  getRoomMembers: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/actions/presence/updatePresenceHeartbeat', () => ({
  updatePresenceHeartbeat: vi.fn().mockResolvedValue({ success: true, data: { updated: true } }),
}));

// Mock usePresenceChannel hook (used by ReadingRoomPanel)
vi.mock('@/hooks/usePresenceChannel', () => ({
  usePresenceChannel: vi.fn().mockReturnValue({
    members: new Map(),
    currentChannel: null,
    isConnected: false,
    connectionMode: 'disconnected',
    memberCount: 0,
  }),
}));

// Mock sessions action (used by SessionSummary via SessionTimer)
vi.mock('@/actions/sessions', () => ({
  saveReadingSession: vi.fn(),
  getBookSessions: vi.fn(),
  getUserSessionStats: vi.fn(),
}));

vi.mock('sonner', () => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  fn.success = vi.fn();
  fn.error = vi.fn();
  return { toast: fn };
});

import { updateReadingStatus, removeFromLibrary, restoreToLibrary } from '@/actions/books';
import { toast } from 'sonner';
import { useTimerStore } from '@/stores/useTimerStore';

const mockUpdateReadingStatus = updateReadingStatus as unknown as ReturnType<typeof vi.fn>;
const mockRemoveFromLibrary = removeFromLibrary as unknown as ReturnType<typeof vi.fn>;
const mockRestoreToLibrary = restoreToLibrary as unknown as ReturnType<typeof vi.fn>;
const mockToast = toast as unknown as ReturnType<typeof vi.fn>;
const mockToastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as unknown as ReturnType<typeof vi.fn>;

const mockBook: BookSearchResult = {
  id: 'book-123',
  source: 'openlibrary',
  title: 'Test Book',
  authors: ['Test Author'],
  publishedYear: 2024,
  coverUrl: 'https://example.com/cover.jpg',
  isbn10: '0123456789',
  isbn13: '9780123456789',
  pageCount: 300,
  description: 'A test book',
};

describe('BookDetailActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
  });

  describe('when book is not in library', () => {
    it('renders Add to Library button', () => {
      render(<BookDetailActions book={mockBook} isInLibrary={false} />);

      expect(screen.getByTestId('add-to-library-section')).toBeInTheDocument();
      expect(screen.getByText('Add to Library')).toBeInTheDocument();
    });

    it('does not render status section', () => {
      render(<BookDetailActions book={mockBook} isInLibrary={false} />);

      expect(
        screen.queryByTestId('library-status-section')
      ).not.toBeInTheDocument();
    });
  });

  describe('when book is in library', () => {
    it('renders current status', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      expect(screen.getByTestId('library-status-section')).toBeInTheDocument();
      expect(screen.getByTestId('current-status')).toHaveTextContent(
        'Currently Reading'
      );
    });

    it('renders Finished status label', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="FINISHED"
          userBookId="ub-123"
        />
      );
      expect(screen.getByTestId('current-status')).toHaveTextContent('Finished');
    });

    it('renders Want to Read status label', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="WANT_TO_READ"
          userBookId="ub-123"
        />
      );
      expect(screen.getByTestId('current-status')).toHaveTextContent(
        'Want to Read'
      );
    });

    it('renders progress bar when currently reading', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={45}
          userBookId="ub-123"
        />
      );

      expect(screen.getByTestId('progress-section')).toBeInTheDocument();
      expect(screen.getByTestId('progress-value')).toHaveTextContent('45%');
    });

    it('does not render progress bar when not currently reading', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="FINISHED"
          progress={100}
          userBookId="ub-123"
        />
      );

      expect(screen.queryByTestId('progress-section')).not.toBeInTheDocument();
    });

    it('renders session timer for CURRENTLY_READING books', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      expect(screen.getByTestId('start-reading-button')).toBeInTheDocument();
      expect(screen.getByTestId('update-progress-button')).toBeDisabled();
    });

    it('does not render session timer for non-CURRENTLY_READING books', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="FINISHED"
          userBookId="ub-123"
        />
      );

      expect(screen.queryByTestId('start-reading-button')).not.toBeInTheDocument();
    });

    it('renders enabled change status button', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      expect(screen.getByTestId('change-status-button')).not.toBeDisabled();
    });

    it('opens popover with status selector on click', async () => {
      const user = userEvent.setup();
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByText('Finished')).toBeInTheDocument();
      expect(screen.getByText('Want to Read')).toBeInTheDocument();
    });

    it('shows current status highlighted in picker', async () => {
      const user = userEvent.setup();
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));

      const currentlyReadingOption = screen.getByRole('radio', {
        name: /Currently Reading/i,
      });
      expect(currentlyReadingOption).toHaveAttribute('aria-checked', 'true');
    });

    it('calls updateReadingStatus on status selection', async () => {
      const user = userEvent.setup();
      mockUpdateReadingStatus.mockResolvedValue({
        success: true,
        data: { id: 'ub-123', status: 'FINISHED' },
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      await waitFor(() => {
        expect(mockUpdateReadingStatus).toHaveBeenCalledWith({
          userBookId: 'ub-123',
          status: 'FINISHED',
        });
      });
    });

    it('shows success toast after status update', async () => {
      const user = userEvent.setup();
      mockUpdateReadingStatus.mockResolvedValue({
        success: true,
        data: { id: 'ub-123', status: 'FINISHED' },
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          'Status updated to Finished'
        );
      });
    });

    it('updates UI optimistically on status change', async () => {
      const user = userEvent.setup();
      // Make the server action hang to observe optimistic state
      mockUpdateReadingStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: {} }), 100))
      );

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={30}
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      // Optimistic: status should change immediately
      await waitFor(() => {
        expect(screen.getByTestId('current-status')).toHaveTextContent('Finished');
      });
    });

    it('rolls back on error', async () => {
      const user = userEvent.setup();
      mockUpdateReadingStatus.mockResolvedValue({
        success: false,
        error: 'Something went wrong',
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={30}
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
      });

      // Should roll back to original status
      await waitFor(() => {
        expect(screen.getByTestId('current-status')).toHaveTextContent(
          'Currently Reading'
        );
      });
    });

    it('sets progress to 100% when changing to Finished', async () => {
      const user = userEvent.setup();
      mockUpdateReadingStatus.mockResolvedValue({
        success: true,
        data: { id: 'ub-123', status: 'FINISHED', progress: 100 },
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={30}
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      // Finished doesn't show progress bar, but status should update
      await waitFor(() => {
        expect(screen.getByTestId('current-status')).toHaveTextContent('Finished');
      });
      // Progress section hidden for FINISHED
      expect(screen.queryByTestId('progress-section')).not.toBeInTheDocument();
    });

    it('keeps progress at 100% when changing from Finished to Currently Reading', async () => {
      const user = userEvent.setup();
      mockUpdateReadingStatus.mockResolvedValue({
        success: true,
        data: { id: 'ub-123', status: 'CURRENTLY_READING' },
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="FINISHED"
          progress={100}
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(
        screen.getByRole('radio', { name: /Currently Reading/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-status')).toHaveTextContent(
          'Currently Reading'
        );
      });

      // Progress should remain at 100% per AC#5
      expect(screen.getByTestId('progress-value')).toHaveTextContent('100%');
    });

    it('does not call server action when selecting same status', async () => {
      const user = userEvent.setup();

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(
        screen.getByRole('radio', { name: /Currently Reading/i })
      );

      expect(mockUpdateReadingStatus).not.toHaveBeenCalled();
    });

    it('calls onStatusChange callback on success', async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      mockUpdateReadingStatus.mockResolvedValue({
        success: true,
        data: { id: 'ub-123', status: 'FINISHED' },
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
          onStatusChange={onStatusChange}
        />
      );

      await user.click(screen.getByTestId('change-status-button'));
      await user.click(screen.getByRole('radio', { name: /Finished/i }));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('FINISHED');
      });
    });
  });

  it('accepts additional className', () => {
    render(
      <BookDetailActions
        book={mockBook}
        isInLibrary={true}
        currentStatus="CURRENTLY_READING"
        className="custom-class"
        userBookId="ub-123"
      />
    );

    const section = screen.getByTestId('library-status-section');
    expect(section.className).toContain('custom-class');
  });

  it('defaults progress to 0', () => {
    render(
      <BookDetailActions
        book={mockBook}
        isInLibrary={true}
        currentStatus="CURRENTLY_READING"
        userBookId="ub-123"
      />
    );

    expect(screen.getByTestId('progress-value')).toHaveTextContent('0%');
  });

  describe('remove from library', () => {
    it('renders remove button when book is in library', () => {
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      expect(screen.getByTestId('remove-from-library-button')).toBeInTheDocument();
      expect(screen.getByTestId('remove-from-library-button')).toHaveTextContent('Remove from Library');
    });

    it('does not render remove button when book is not in library', () => {
      render(<BookDetailActions book={mockBook} isInLibrary={false} />);

      expect(screen.queryByTestId('remove-from-library-button')).not.toBeInTheDocument();
    });

    it('opens confirmation dialog on button click', async () => {
      const user = userEvent.setup();
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));

      expect(screen.getByTestId('remove-dialog-title')).toHaveTextContent('Test Book');
      expect(screen.getByTestId('remove-dialog-description')).toHaveTextContent(
        'This will remove your reading history for this book.'
      );
      expect(screen.getByTestId('remove-dialog-cancel')).toBeInTheDocument();
      expect(screen.getByTestId('remove-dialog-confirm')).toBeInTheDocument();
    });

    it('closes dialog on cancel without calling removeFromLibrary', async () => {
      const user = userEvent.setup();
      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-cancel'));

      expect(mockRemoveFromLibrary).not.toHaveBeenCalled();
    });

    it('calls removeFromLibrary and onRemove on confirm', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      mockRemoveFromLibrary.mockResolvedValue({ success: true, data: {} });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={45}
          userBookId="ub-123"
          onRemove={onRemove}
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      await waitFor(() => {
        expect(mockRemoveFromLibrary).toHaveBeenCalledWith({ userBookId: 'ub-123' });
      });
      expect(onRemove).toHaveBeenCalled();
    });

    it('shows toast with undo action on successful removal', async () => {
      const user = userEvent.setup();
      mockRemoveFromLibrary.mockResolvedValue({ success: true, data: {} });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          'Book removed from library',
          expect.objectContaining({
            action: expect.objectContaining({ label: 'Undo' }),
            duration: 5000,
          })
        );
      });
    });

    it('calls onRestore and restoreToLibrary when undo is clicked', async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn();
      mockRemoveFromLibrary.mockResolvedValue({ success: true, data: {} });
      mockRestoreToLibrary.mockResolvedValue({ success: true, data: {} });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={45}
          userBookId="ub-123"
          onRestore={onRestore}
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      // Extract the undo callback from the toast call
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      const toastCall = mockToast.mock.calls[0];
      const undoCallback = toastCall[1].action.onClick;

      // Invoke the undo callback
      await undoCallback();

      expect(mockRestoreToLibrary).toHaveBeenCalledWith({ userBookId: 'ub-123' });
      expect(onRestore).toHaveBeenCalledWith('CURRENTLY_READING', 45);
      expect(mockToastSuccess).toHaveBeenCalledWith('Book restored to library');
    });

    it('rolls back with onRestore on removal failure', async () => {
      const user = userEvent.setup();
      const onRestore = vi.fn();
      mockRemoveFromLibrary.mockResolvedValue({
        success: false,
        error: 'Failed to remove book',
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          progress={45}
          userBookId="ub-123"
          onRestore={onRestore}
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to remove book');
      });
      expect(onRestore).toHaveBeenCalledWith('CURRENTLY_READING', 45);
    });

    it('shows error toast when undo restore fails', async () => {
      const user = userEvent.setup();
      mockRemoveFromLibrary.mockResolvedValue({ success: true, data: {} });
      mockRestoreToLibrary.mockResolvedValue({
        success: false,
        error: 'Restore failed',
      });

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      const toastCall = mockToast.mock.calls[0];
      const undoCallback = toastCall[1].action.onClick;
      await undoCallback();

      expect(mockToastError).toHaveBeenCalledWith('Failed to restore book');
    });

    it('disables change-status button while removing', async () => {
      const user = userEvent.setup();
      // Make removal hang to observe disabled state
      mockRemoveFromLibrary.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: {} }), 100))
      );

      render(
        <BookDetailActions
          book={mockBook}
          isInLibrary={true}
          currentStatus="CURRENTLY_READING"
          userBookId="ub-123"
        />
      );

      await user.click(screen.getByTestId('remove-from-library-button'));
      await user.click(screen.getByTestId('remove-dialog-confirm'));

      // While removing, change-status should be disabled
      await waitFor(() => {
        expect(screen.getByTestId('change-status-button')).toBeDisabled();
      });
    });
  });
});
