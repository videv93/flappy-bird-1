import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSummary } from './SessionSummary';
import { useTimerStore } from '@/stores/useTimerStore';
import { useOfflineStore } from '@/stores/useOfflineStore';

// Mock idb-storage
vi.mock('@/lib/idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

// Mock server action
const mockSaveReadingSession = vi.fn();
vi.mock('@/actions/sessions', () => ({
  saveReadingSession: (...args: unknown[]) => mockSaveReadingSession(...args),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';
const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: { div: 'div', main: 'main' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const defaultProps = {
  bookId: 'book-1',
  bookTitle: 'The Great Gatsby',
  duration: 300, // 5 minutes
  startTime: Date.now() - 300000,
  onComplete: vi.fn(),
};

describe('SessionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
    useOfflineStore.setState({
      pendingSessions: [],
      _hasHydrated: true,
    });
    mockSaveReadingSession.mockResolvedValue({ success: true, data: { id: 'rs-1' } });
    // Ensure navigator.onLine is true
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('renders session summary with book title, duration, and date', () => {
    render(<SessionSummary {...defaultProps} />);

    expect(screen.getByTestId('summary-book-title')).toHaveTextContent('The Great Gatsby');
    expect(screen.getByTestId('summary-duration')).toHaveTextContent('05:00');
    expect(screen.getByTestId('summary-date')).toBeInTheDocument();
    expect(screen.getByTestId('save-session-button')).toBeInTheDocument();
    expect(screen.getByTestId('discard-session-button')).toBeInTheDocument();
  });

  it('shows "too short" message for sessions under 60 seconds', () => {
    render(<SessionSummary {...defaultProps} duration={30} />);

    expect(screen.getByTestId('session-too-short')).toBeInTheDocument();
    expect(screen.getByText(/Sessions under 1 minute/)).toBeInTheDocument();
    expect(screen.queryByTestId('save-session-button')).not.toBeInTheDocument();
  });

  it('dismiss button on short session resets timer and calls onComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SessionSummary {...defaultProps} duration={30} onComplete={onComplete} />);

    await user.click(screen.getByTestId('dismiss-short-session'));

    const state = useTimerStore.getState();
    expect(state.startTime).toBeNull();
    expect(onComplete).toHaveBeenCalled();
  });

  it('save button calls saveReadingSession and shows success toast', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SessionSummary {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByTestId('save-session-button'));

    expect(mockSaveReadingSession).toHaveBeenCalledWith({
      bookId: 'book-1',
      duration: 300,
      startedAt: expect.any(String),
      endedAt: expect.any(String),
    });
    expect(mockToast.success).toHaveBeenCalledWith('Reading session saved!');
    expect(onComplete).toHaveBeenCalled();
  });

  it('save button shows error toast on failure', async () => {
    mockSaveReadingSession.mockResolvedValue({ success: false, error: 'Server error' });
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SessionSummary {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByTestId('save-session-button'));

    expect(mockToast.error).toHaveBeenCalledWith('Server error');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('discard button shows confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<SessionSummary {...defaultProps} />);

    await user.click(screen.getByTestId('discard-session-button'));

    expect(screen.getByText('Discard session?')).toBeInTheDocument();
    expect(screen.getByText(/will not be saved/)).toBeInTheDocument();
  });

  it('confirming discard resets timer and calls onComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SessionSummary {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByTestId('discard-session-button'));
    await user.click(screen.getByTestId('discard-confirm'));

    const state = useTimerStore.getState();
    expect(state.startTime).toBeNull();
    expect(onComplete).toHaveBeenCalled();
  });

  it('cancelling discard closes dialog without reset', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    // Set some timer state first
    useTimerStore.setState({
      startTime: Date.now() - 300000,
      currentBookId: 'book-1',
      currentBookTitle: 'The Great Gatsby',
    });

    render(<SessionSummary {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByTestId('discard-session-button'));
    await user.click(screen.getByTestId('discard-cancel'));

    expect(onComplete).not.toHaveBeenCalled();
    // Timer state should still be set
    expect(useTimerStore.getState().currentBookId).toBe('book-1');
  });

  it('queues session offline when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SessionSummary {...defaultProps} onComplete={onComplete} />);

    await user.click(screen.getByTestId('save-session-button'));

    expect(mockSaveReadingSession).not.toHaveBeenCalled();
    expect(mockToast.info).toHaveBeenCalledWith('Session saved offline. Will sync when connected.');
    expect(useOfflineStore.getState().pendingSessions).toHaveLength(1);
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows freeze earned toast when session save returns freezesEarned > 0', async () => {
    mockSaveReadingSession.mockResolvedValue({
      success: true,
      data: {
        id: 'rs-1',
        streakUpdate: {
          freezesEarned: 1,
          freezesAvailable: 2,
          message: 'You earned 1 streak freeze!',
        },
      },
    });
    const user = userEvent.setup();
    render(<SessionSummary {...defaultProps} />);

    await user.click(screen.getByTestId('save-session-button'));

    expect(mockToast.success).toHaveBeenCalledWith('Reading session saved!');
    expect(mockToast.success).toHaveBeenCalledWith('You earned 1 streak freeze!');
  });

  it('does not show freeze toast when freezesEarned is 0', async () => {
    mockSaveReadingSession.mockResolvedValue({
      success: true,
      data: {
        id: 'rs-1',
        streakUpdate: {
          freezesEarned: 0,
          freezesAvailable: 1,
        },
      },
    });
    const user = userEvent.setup();
    render(<SessionSummary {...defaultProps} />);

    await user.click(screen.getByTestId('save-session-button'));

    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledWith('Reading session saved!');
  });

  it('has accessible aria attributes', () => {
    render(<SessionSummary {...defaultProps} />);

    expect(screen.getByRole('region', { name: /reading session summary/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/save reading session/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discard reading session/i)).toBeInTheDocument();
  });
});
