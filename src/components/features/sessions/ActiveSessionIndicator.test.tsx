import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('ActiveSessionIndicator', () => {
  beforeEach(() => {
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
  });

  it('renders nothing when no timer is active', () => {
    const { container } = render(<ActiveSessionIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('shows book title and elapsed time when timer is active', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 125000, // 2 min 5 sec
      currentBookId: 'book-1',
      currentBookTitle: 'The Great Gatsby',
    });

    render(<ActiveSessionIndicator />);

    expect(screen.getByTestId('active-session-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('active-session-title')).toHaveTextContent(
      'The Great Gatsby'
    );
    const time = screen.getByTestId('active-session-time');
    expect(time.textContent).toMatch(/02:0[4-6]/);
  });

  it('links to the active book detail page', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 5000,
      currentBookId: 'book-42',
      currentBookTitle: 'Test Book',
    });

    render(<ActiveSessionIndicator />);

    const link = screen.getByTestId('active-session-indicator');
    expect(link).toHaveAttribute('href', '/book/book-42');
  });

  it('has accessible aria-label with book title and time', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 65000,
      currentBookId: 'book-1',
      currentBookTitle: 'My Book',
    });

    render(<ActiveSessionIndicator />);

    const link = screen.getByTestId('active-session-indicator');
    expect(link.getAttribute('aria-label')).toMatch(
      /Active reading session: My Book/
    );
  });

  it('renders nothing during hydration', () => {
    useTimerStore.setState({ _hasHydrated: false });

    const { container } = render(<ActiveSessionIndicator />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when isRunning but currentBookId is null', () => {
    useTimerStore.setState({
      isRunning: true,
      startTime: Date.now() - 5000,
      currentBookId: null,
      currentBookTitle: null,
    });

    const { container } = render(<ActiveSessionIndicator />);
    expect(container.innerHTML).toBe('');
  });
});
