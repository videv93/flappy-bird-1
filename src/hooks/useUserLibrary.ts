'use client';

import { useState, useCallback } from 'react';
import { getBatchUserBookStatus } from '@/actions/books';
import type { ReadingStatus } from '@prisma/client';

/**
 * Library book entry stored in the hook's state
 */
interface LibraryBook {
  isbn: string;
  status: ReadingStatus;
  progress: number;
}

/**
 * Return type for the useUserLibrary hook
 */
interface UseUserLibraryReturn {
  /** Map of ISBNs to library book data */
  libraryBooks: Map<string, LibraryBook>;
  /** Whether the hook is currently loading */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Check if a book is in the user's library */
  isInLibrary: (isbn: string) => boolean;
  /** Get the reading status of a book */
  getStatus: (isbn: string) => ReadingStatus | undefined;
  /** Optimistically add a book to the library state */
  addOptimistic: (isbn: string, status: ReadingStatus) => void;
  /** Remove a book from optimistic state (for rollback) */
  removeOptimistic: (isbn: string) => void;
  /** Check the status of multiple books from the server */
  checkBooksStatus: (isbns: string[]) => Promise<void>;
}

/**
 * Hook for managing the user's book library state.
 * Supports optimistic updates and batch status checking.
 *
 * @example
 * ```tsx
 * const { isInLibrary, getStatus, addOptimistic, checkBooksStatus } = useUserLibrary();
 *
 * // Check book status on search results load
 * useEffect(() => {
 *   const isbns = searchResults.map(book => book.isbn13 || book.isbn10).filter(Boolean);
 *   checkBooksStatus(isbns);
 * }, [searchResults]);
 *
 * // Optimistically update on add
 * const handleAdd = (isbn: string, status: ReadingStatus) => {
 *   addOptimistic(isbn, status);
 *   // Call server action...
 * };
 * ```
 */
export function useUserLibrary(): UseUserLibraryReturn {
  const [libraryBooks, setLibraryBooks] = useState<Map<string, LibraryBook>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if a book is in the user's library
   */
  const isInLibrary = useCallback(
    (isbn: string): boolean => {
      return libraryBooks.has(isbn);
    },
    [libraryBooks]
  );

  /**
   * Get the reading status of a book in the library
   */
  const getStatus = useCallback(
    (isbn: string): ReadingStatus | undefined => {
      return libraryBooks.get(isbn)?.status;
    },
    [libraryBooks]
  );

  /**
   * Optimistically add a book to the library state.
   * Used for immediate UI feedback before server confirmation.
   */
  const addOptimistic = useCallback(
    (isbn: string, status: ReadingStatus): void => {
      setLibraryBooks((prev) => {
        const next = new Map(prev);
        next.set(isbn, {
          isbn,
          status,
          progress: status === 'FINISHED' ? 100 : 0,
        });
        return next;
      });
    },
    []
  );

  /**
   * Remove a book from optimistic state.
   * Used for rollback when server action fails.
   */
  const removeOptimistic = useCallback((isbn: string): void => {
    setLibraryBooks((prev) => {
      const next = new Map(prev);
      next.delete(isbn);
      return next;
    });
  }, []);

  /**
   * Check the status of multiple books from the server.
   * More efficient than checking one by one.
   */
  const checkBooksStatus = useCallback(async (isbns: string[]): Promise<void> => {
    if (isbns.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getBatchUserBookStatus(isbns);

      if (result.success) {
        setLibraryBooks((prev) => {
          const next = new Map(prev);
          result.data.forEach((status, isbn) => {
            if (status.isInLibrary && status.status) {
              next.set(isbn, {
                isbn,
                status: status.status,
                progress: status.progress || 0,
              });
            }
          });
          return next;
        });
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to check library status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    libraryBooks,
    isLoading,
    error,
    isInLibrary,
    getStatus,
    addOptimistic,
    removeOptimistic,
    checkBooksStatus,
  };
}
