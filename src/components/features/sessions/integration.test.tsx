import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTimer } from './SessionTimer';
import { ActiveSessionIndicator } from './ActiveSessionIndicator';
import { useTimerStore } from '@/stores/useTimerStore';

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
    div: 'div',
    main: 'main',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sessions action (used by SessionSummary via SessionTimer)
vi.mock('@/actions/sessions', () => ({
  saveReadingSession: vi.fn(),
  getBookSessions: vi.fn(),
  getUserSessionStats: vi.fn(),
}));

// Mock sonner (used by SessionSummary)
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('Session Timer Integration', () => {
  beforeEach(() => {
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
  });

  it('"Start Reading" button appears on CURRENTLY_READING book detail', () => {
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

  it('button does NOT appear for WANT_TO_READ books', () => {
    const { container } = render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="WANT_TO_READ"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('button does NOT appear for FINISHED books', () => {
    const { container } = render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Test Book"
        bookStatus="FINISHED"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('clicking "Start Reading" starts the timer display', async () => {
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
    expect(screen.getByTestId('timer-display').textContent).toMatch(/00:00/);
  });

  it('timer displays elapsed time in MM:SS format', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 125000, // 2m 5s
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
    expect(display.textContent).toMatch(/02:0[4-6]/);
  });

  it('clicking "Stop Reading" stops the timer', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByTestId('stop-reading-button'));
    expect(useTimerStore.getState().isRunning).toBe(false);
  });

  it('starting timer for Book B while Book A is active shows conflict dialog', async () => {
    const user = userEvent.setup();
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-a',
      currentBookTitle: 'Book A',
    });

    render(
      <SessionTimer
        bookId="book-b"
        bookTitle="Book B"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));

    expect(screen.getByTestId('conflict-dialog-title')).toBeInTheDocument();
    expect(screen.getByText(/Book A/)).toBeInTheDocument();
  });

  it('conflict dialog allows ending current session and starting new one', async () => {
    const user = userEvent.setup();
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-a',
      currentBookTitle: 'Book A',
    });

    render(
      <SessionTimer
        bookId="book-b"
        bookTitle="Book B"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));
    await user.click(screen.getByTestId('conflict-dialog-end'));

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.currentBookId).toBe('book-b');
    expect(state.currentBookTitle).toBe('Book B');
  });

  it('conflict dialog allows canceling to keep current timer', async () => {
    const user = userEvent.setup();
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 10000,
      currentBookId: 'book-a',
      currentBookTitle: 'Book A',
    });

    render(
      <SessionTimer
        bookId="book-b"
        bookTitle="Book B"
        bookStatus="CURRENTLY_READING"
      />
    );

    await user.click(screen.getByTestId('start-reading-button'));
    await user.click(screen.getByTestId('conflict-dialog-cancel'));

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.currentBookId).toBe('book-a');
  });

  it('ActiveSessionIndicator appears when timer is running', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 30000,
      currentBookId: 'book-1',
      currentBookTitle: 'My Book',
    });

    render(<ActiveSessionIndicator />);

    expect(screen.getByTestId('active-session-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('active-session-title')).toHaveTextContent('My Book');
  });

  it('ActiveSessionIndicator disappears when timer is stopped', () => {
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
    });

    const { container } = render(<ActiveSessionIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('ActiveSessionIndicator links to the active book detail page', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 5000,
      currentBookId: '9780123456789',
      currentBookTitle: 'Test Book',
    });

    render(<ActiveSessionIndicator />);

    const link = screen.getByTestId('active-session-indicator');
    expect(link).toHaveAttribute('href', '/book/9780123456789');
  });

  it('timer resumes correctly from persisted startTime on rehydration', () => {
    // Simulate rehydration: startTime exists, _hasHydrated becomes true
    const startedAt = Date.now() - 300000; // 5 minutes ago
    useTimerStore.setState({
      isRunning: true,
      startTime: startedAt,
      currentBookId: 'book-1',
      currentBookTitle: 'Resumed Book',
      _hasHydrated: true,
    });

    render(
      <SessionTimer
        bookId="book-1"
        bookTitle="Resumed Book"
        bookStatus="CURRENTLY_READING"
      />
    );

    const display = screen.getByTestId('timer-display');
    // Should show approximately 05:00
    expect(display.textContent).toMatch(/05:0[0-2]/);
  });
});
