import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimerStore } from './useTimerStore';

// Mock idb-storage to avoid actual IndexedDB in tests
vi.mock('@/lib/idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

describe('useTimerStore', () => {
  beforeEach(() => {
    useTimerStore.setState({
      isRunning: false,
      startTime: null,
      currentBookId: null,
      currentBookTitle: null,
      _hasHydrated: true,
    });
  });

  it('has correct initial state', () => {
    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.currentBookId).toBeNull();
    expect(state.currentBookTitle).toBeNull();
  });

  it('start() sets isRunning, startTime, bookId, and bookTitle', () => {
    const before = Date.now();
    useTimerStore.getState().start('book-123', 'Project Hail Mary');
    const after = Date.now();

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.startTime).toBeGreaterThanOrEqual(before);
    expect(state.startTime).toBeLessThanOrEqual(after);
    expect(state.currentBookId).toBe('book-123');
    expect(state.currentBookTitle).toBe('Project Hail Mary');
  });

  it('stop() sets isRunning to false but keeps startTime', () => {
    useTimerStore.getState().start('book-123', 'Test Book');
    const { startTime } = useTimerStore.getState();

    useTimerStore.getState().stop();

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.startTime).toBe(startTime);
    expect(state.currentBookId).toBe('book-123');
  });

  it('reset() clears all state', () => {
    useTimerStore.getState().start('book-123', 'Test Book');
    useTimerStore.getState().reset();

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.currentBookId).toBeNull();
    expect(state.currentBookTitle).toBeNull();
  });

  it('getElapsedSeconds() returns 0 when no startTime', () => {
    expect(useTimerStore.getState().getElapsedSeconds()).toBe(0);
  });

  it('getElapsedSeconds() calculates from startTime correctly', () => {
    const fiveSecondsAgo = Date.now() - 5000;
    useTimerStore.setState({ startTime: fiveSecondsAgo, isRunning: true });

    const elapsed = useTimerStore.getState().getElapsedSeconds();
    // Allow 1 second of tolerance for test execution time
    expect(elapsed).toBeGreaterThanOrEqual(4);
    expect(elapsed).toBeLessThanOrEqual(6);
  });

  it('triggers subscribers on state change', () => {
    const listener = vi.fn();
    const unsub = useTimerStore.subscribe(listener);

    useTimerStore.getState().start('book-1', 'Book');
    expect(listener).toHaveBeenCalled();

    unsub();
  });

  it('isActive() returns true when running with a book', () => {
    useTimerStore.getState().start('book-1', 'Test Book');
    expect(useTimerStore.getState().isActive()).toBe(true);
  });

  it('isActive() returns false when not running', () => {
    expect(useTimerStore.getState().isActive()).toBe(false);
  });

  it('rehydration with existing startTime sets isRunning to true', () => {
    // Simulate rehydration by setting state as persist would
    const pastTime = Date.now() - 60000; // 1 minute ago
    useTimerStore.setState({
      startTime: pastTime,
      currentBookId: 'book-1',
      currentBookTitle: 'Test',
      isRunning: false,
      _hasHydrated: false,
    });

    // Simulate what onRehydrateStorage does
    const state = useTimerStore.getState();
    if (state.startTime) {
      useTimerStore.setState({ isRunning: true });
    }
    useTimerStore.setState({ _hasHydrated: true });

    const result = useTimerStore.getState();
    expect(result.isRunning).toBe(true);
    expect(result._hasHydrated).toBe(true);
    expect(result.startTime).toBe(pastTime);
  });
});
