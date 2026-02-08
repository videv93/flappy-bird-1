import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimer } from './SessionTimer';
import { useTimerStore } from '@/stores/useTimerStore';

// Mock next/navigation (used by SessionSummary)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock idb-storage to prevent IndexedDB access
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

// Mock sessions action (used by SessionSummary)
vi.mock('@/actions/sessions', () => ({
  saveReadingSession: vi.fn(),
  getBookSessions: vi.fn(),
  getUserSessionStats: vi.fn(),
}));

// Mock presence actions (auto-join on start)
const mockJoinRoom = vi.fn();
const mockGetRoomMembers = vi.fn();
vi.mock('@/actions/presence', () => ({
  joinRoom: (...args: unknown[]) => mockJoinRoom(...args),
  getRoomMembers: (...args: unknown[]) => mockGetRoomMembers(...args),
}));

// Mock sonner (used by SessionSummary and auto-join)
const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(
    (...args: unknown[]) => mockToast(...args),
    { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  ),
}));

describe('SessionTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
    mockJoinRoom.mockResolvedValue({ success: true, data: { id: 'p1' } });
    mockGetRoomMembers.mockResolvedValue({
      success: true,
      data: [{ id: 'user-1', name: 'Test User', avatarUrl: null, joinedAt: new Date(), isAuthor: false }],
    });
  });

  it('renders "Start Reading" button for CURRENTLY_READING books', () => {
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );
    expect(screen.getByTestId('start-reading-button')).toBeInTheDocument();
    expect(screen.getByText('Start Reading')).toBeInTheDocument();
  });

  it('does not render for WANT_TO_READ books', () => {
    const { container } = render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="WANT_TO_READ"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('does not render for FINISHED books', () => {
    const { container } = render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="FINISHED"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows skeleton during hydration', () => {
    useTimerStore.setState({ _hasHydrated: false });
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );
    expect(screen.getByTestId('session-timer-skeleton')).toBeInTheDocument();
  });

  it('clicking Start sets timer running and shows timer display', async () => {
    const user = userEvent.setup();
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));

    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    expect(screen.getByTestId('stop-reading-button')).toBeInTheDocument();
    expect(useTimerStore.getState().isRunning).toBe(true);
    expect(useTimerStore.getState().currentBookId).toBe('book-1');
  });

  it('clicking Stop stops the timer', async () => {
    const user = userEvent.setup();

    // Start with active timer for this book
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 5000,
      currentBookId: 'book-1',
      currentBookTitle: 'Test Book',
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    expect(screen.getByTestId('stop-reading-button')).toBeInTheDocument();

    await user.click(screen.getByTestId('stop-reading-button'));

    expect(useTimerStore.getState().isRunning).toBe(false);
  });

  it('shows conflict dialog when starting timer while another book is active', async () => {
    const user = userEvent.setup();

    // Set active timer for a different book
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-other',
      currentBookTitle: 'Other Book',
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    // Should show Start Reading since it's not active for THIS book
    await user.click(screen.getByTestId('start-reading-button'));

    // Conflict dialog should appear
    expect(screen.getByTestId('conflict-dialog-title')).toBeInTheDocument();
    expect(screen.getByText(/Other Book/)).toBeInTheDocument();
  });

  it('conflict dialog "End Session" resets old timer and starts new one', async () => {
    const user = userEvent.setup();

    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-other',
      currentBookTitle: 'Other Book',
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));
    await user.click(screen.getByTestId('conflict-dialog-end'));

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.currentBookId).toBe('book-1');
    expect(state.currentBookTitle).toBe('Test Book');
  });

  it('conflict dialog "Cancel" keeps current timer', async () => {
    const user = userEvent.setup();

    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-other',
      currentBookTitle: 'Other Book',
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));
    await user.click(screen.getByTestId('conflict-dialog-cancel'));

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.currentBookId).toBe('book-other');
  });

  it('displays elapsed time in MM:SS format', () => {
    // 65 seconds ago = 01:05
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 65000,
      currentBookId: 'book-1',
      currentBookTitle: 'Test Book',
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    const display = screen.getByTestId('timer-display');
    // Should show approximately 01:05 (allow some tolerance)
    expect(display.textContent).toMatch(/01:0[4-6]/);
  });

  // --- Auto-join reading room tests ---

  it('calls joinRoom when starting a reading session', async () => {
    const user = userEvent.setup();
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));
    expect(mockJoinRoom).toHaveBeenCalledWith('book-1');
  });

  it('shows solo reader toast when joining empty room on session start', async () => {
    const user = userEvent.setup();
    mockGetRoomMembers.mockResolvedValue({
      success: true,
      data: [{ id: 'user-1', name: 'Me', avatarUrl: null, joinedAt: new Date(), isAuthor: false }],
    });
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));

    // Wait for async joinRoom + getRoomMembers to resolve
    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "You're the first reader here!",
        expect.objectContaining({ duration: 3000 })
      );
    });
  });

  it('shows multi-reader toast when joining room with others on session start', async () => {
    const user = userEvent.setup();
    mockGetRoomMembers.mockResolvedValue({
      success: true,
      data: [
        { id: 'user-1', name: 'Me', avatarUrl: null, joinedAt: new Date(), isAuthor: false },
        { id: 'user-2', name: 'Other', avatarUrl: null, joinedAt: new Date(), isAuthor: false },
        { id: 'user-3', name: 'Another', avatarUrl: null, joinedAt: new Date(), isAuthor: false },
      ],
    });
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));

    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "You're reading with 2 others",
        expect.objectContaining({ duration: 3000 })
      );
    });
  });

  it('does not show toast if joinRoom fails', async () => {
    const user = userEvent.setup();
    mockJoinRoom.mockResolvedValue({ success: false, error: 'Failed' });
    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));

    // Wait a tick for async to settle
    await vi.waitFor(() => {
      expect(mockGetRoomMembers).not.toHaveBeenCalled();
    });
  });
});
