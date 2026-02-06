import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOfflineStore } from './useOfflineStore';

// Mock idb-storage
vi.mock('@/lib/idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

const testSession = {
  bookId: 'book-1',
  duration: 300,
  startedAt: '2026-02-06T10:00:00.000Z',
  endedAt: '2026-02-06T10:05:00.000Z',
};

describe('useOfflineStore', () => {
  beforeEach(() => {
    useOfflineStore.setState({
      pendingSessions: [],
      _hasHydrated: true,
    });
  });

  it('has correct initial state', () => {
    const state = useOfflineStore.getState();
    expect(state.pendingSessions).toEqual([]);
  });

  it('queueSession adds a session to pending list', () => {
    useOfflineStore.getState().queueSession(testSession);

    const state = useOfflineStore.getState();
    expect(state.pendingSessions).toHaveLength(1);
    expect(state.pendingSessions[0]).toEqual(testSession);
  });

  it('queueSession appends multiple sessions', () => {
    useOfflineStore.getState().queueSession(testSession);
    useOfflineStore.getState().queueSession({ ...testSession, bookId: 'book-2' });

    expect(useOfflineStore.getState().pendingSessions).toHaveLength(2);
  });

  it('removeSession removes session at index', () => {
    useOfflineStore.getState().queueSession(testSession);
    useOfflineStore.getState().queueSession({ ...testSession, bookId: 'book-2' });

    useOfflineStore.getState().removeSession(0);

    const state = useOfflineStore.getState();
    expect(state.pendingSessions).toHaveLength(1);
    expect(state.pendingSessions[0].bookId).toBe('book-2');
  });

  it('clearSessions removes all pending sessions', () => {
    useOfflineStore.getState().queueSession(testSession);
    useOfflineStore.getState().queueSession({ ...testSession, bookId: 'book-2' });

    useOfflineStore.getState().clearSessions();

    expect(useOfflineStore.getState().pendingSessions).toHaveLength(0);
  });

  it('getPendingSessions returns current pending list', () => {
    useOfflineStore.getState().queueSession(testSession);

    const pending = useOfflineStore.getState().getPendingSessions();
    expect(pending).toEqual([testSession]);
  });

  it('hasPendingSessions returns false when empty', () => {
    expect(useOfflineStore.getState().hasPendingSessions()).toBe(false);
  });

  it('hasPendingSessions returns true when sessions exist', () => {
    useOfflineStore.getState().queueSession(testSession);
    expect(useOfflineStore.getState().hasPendingSessions()).toBe(true);
  });

  it('triggers subscribers on state change', () => {
    const listener = vi.fn();
    const unsub = useOfflineStore.subscribe(listener);

    useOfflineStore.getState().queueSession(testSession);
    expect(listener).toHaveBeenCalled();

    unsub();
  });
});
