import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserLibrary } from './useUserLibrary';

// Mock server action
vi.mock('@/actions/books', () => ({
  getBatchUserBookStatus: vi.fn(),
}));

import { getBatchUserBookStatus } from '@/actions/books';

const mockGetBatchUserBookStatus = getBatchUserBookStatus as unknown as ReturnType<typeof vi.fn>;

describe('useUserLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty library', () => {
      const { result } = renderHook(() => useUserLibrary());

      expect(result.current.libraryBooks.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('isInLibrary', () => {
    it('returns false for books not in library', () => {
      const { result } = renderHook(() => useUserLibrary());

      expect(result.current.isInLibrary('9780743273565')).toBe(false);
    });

    it('returns true after optimistic add', () => {
      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.addOptimistic('9780743273565', 'CURRENTLY_READING');
      });

      expect(result.current.isInLibrary('9780743273565')).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('returns undefined for books not in library', () => {
      const { result } = renderHook(() => useUserLibrary());

      expect(result.current.getStatus('9780743273565')).toBeUndefined();
    });

    it('returns correct status after optimistic add', () => {
      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.addOptimistic('9780743273565', 'FINISHED');
      });

      expect(result.current.getStatus('9780743273565')).toBe('FINISHED');
    });
  });

  describe('addOptimistic', () => {
    it('adds book to library', () => {
      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.addOptimistic('9780743273565', 'CURRENTLY_READING');
      });

      const book = result.current.libraryBooks.get('9780743273565');
      expect(book).toBeDefined();
      expect(book?.status).toBe('CURRENTLY_READING');
      expect(book?.progress).toBe(0);
    });

    it('sets progress to 100 for FINISHED status', () => {
      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.addOptimistic('9780743273565', 'FINISHED');
      });

      const book = result.current.libraryBooks.get('9780743273565');
      expect(book?.progress).toBe(100);
    });
  });

  describe('removeOptimistic', () => {
    it('removes book from library', () => {
      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.addOptimistic('9780743273565', 'CURRENTLY_READING');
      });

      expect(result.current.isInLibrary('9780743273565')).toBe(true);

      act(() => {
        result.current.removeOptimistic('9780743273565');
      });

      expect(result.current.isInLibrary('9780743273565')).toBe(false);
    });
  });

  describe('checkBooksStatus', () => {
    it('does nothing for empty ISBN array', async () => {
      const { result } = renderHook(() => useUserLibrary());

      await act(async () => {
        await result.current.checkBooksStatus([]);
      });

      expect(mockGetBatchUserBookStatus).not.toHaveBeenCalled();
    });

    it('updates library from server response', async () => {
      const serverResponse = new Map([
        ['9780743273565', { isInLibrary: true, status: 'CURRENTLY_READING', progress: 50 }],
        ['9780141439518', { isInLibrary: false }],
      ]);
      mockGetBatchUserBookStatus.mockResolvedValue({ success: true, data: serverResponse });

      const { result } = renderHook(() => useUserLibrary());

      await act(async () => {
        await result.current.checkBooksStatus(['9780743273565', '9780141439518']);
      });

      expect(result.current.isInLibrary('9780743273565')).toBe(true);
      expect(result.current.getStatus('9780743273565')).toBe('CURRENTLY_READING');
      expect(result.current.libraryBooks.get('9780743273565')?.progress).toBe(50);
      expect(result.current.isInLibrary('9780141439518')).toBe(false);
    });

    it('sets loading state while fetching', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetBatchUserBookStatus.mockReturnValue(promise);

      const { result } = renderHook(() => useUserLibrary());

      act(() => {
        result.current.checkBooksStatus(['9780743273565']);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, data: new Map() });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockGetBatchUserBookStatus.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const { result } = renderHook(() => useUserLibrary());

      await act(async () => {
        await result.current.checkBooksStatus(['9780743273565']);
      });

      expect(result.current.error).toBe('Server error');
    });

    it('handles exceptions gracefully', async () => {
      mockGetBatchUserBookStatus.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUserLibrary());

      await act(async () => {
        await result.current.checkBooksStatus(['9780743273565']);
      });

      expect(result.current.error).toBe('Failed to check library status');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
