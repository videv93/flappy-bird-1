'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import { RefreshCw } from 'lucide-react';

import { getUserLibrary } from '@/actions/books';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReadingStatus } from '@prisma/client';
import type { UserBookWithBook } from './types';

import { LibrarySection } from './LibrarySection';
import { LibraryBookCardSkeleton } from './LibraryBookCardSkeleton';
import { LibraryEmptyState } from './LibraryEmptyState';

type LibraryState = {
  books: UserBookWithBook[];
  readerCounts: Record<string, { total: number; reading: number }>;
  loadingState: 'loading' | 'success' | 'error';
};

type LibraryAction =
  | { type: 'FETCH_SUCCESS'; books: UserBookWithBook[]; readerCounts: Record<string, { total: number; reading: number }> }
  | { type: 'FETCH_ERROR' }
  | { type: 'RETRY' };

function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { books: action.books, readerCounts: action.readerCounts, loadingState: 'success' };
    case 'FETCH_ERROR':
      return { ...state, loadingState: 'error' };
    case 'RETRY':
      return { ...state, loadingState: 'loading' };
  }
}

const TABS: { value: ReadingStatus; label: string }[] = [
  { value: 'CURRENTLY_READING', label: 'Reading' },
  { value: 'WANT_TO_READ', label: 'Want to Read' },
  { value: 'FINISHED', label: 'Finished' },
];

function sortBooks(books: UserBookWithBook[], status: ReadingStatus): UserBookWithBook[] {
  return [...books].sort((a, b) => {
    if (status === 'FINISHED') {
      const aDate = a.dateFinished ? new Date(a.dateFinished).getTime() : 0;
      const bDate = b.dateFinished ? new Date(b.dateFinished).getTime() : 0;
      return bDate - aDate;
    }
    if (status === 'WANT_TO_READ') {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }
    // CURRENTLY_READING: by updatedAt desc
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function LibraryView() {
  const [{ books, readerCounts, loadingState }, dispatch] = useReducer(libraryReducer, {
    books: [],
    readerCounts: {},
    loadingState: 'loading' as const,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLibrary = useCallback(async () => {
    const result = await getUserLibrary();
    if (result.success) {
      dispatch({ type: 'FETCH_SUCCESS', books: result.data.books, readerCounts: result.data.readerCounts });
    } else {
      dispatch({ type: 'FETCH_ERROR' });
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchLibrary();
    setIsRefreshing(false);
  }, [fetchLibrary]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY' });
    fetchLibrary();
  }, [fetchLibrary]);

  // Group books by status
  const grouped: Record<ReadingStatus, UserBookWithBook[]> = {
    CURRENTLY_READING: [],
    WANT_TO_READ: [],
    FINISHED: [],
  };

  books.forEach((ub) => {
    if (grouped[ub.status]) {
      grouped[ub.status].push(ub);
    }
  });

  // Sort each group
  for (const status of Object.keys(grouped) as ReadingStatus[]) {
    grouped[status] = sortBooks(grouped[status], status);
  }

  const totalBooks = books.length;

  if (loadingState === 'loading') {
    return (
      <div className="p-4" data-testid="library-loading">
        <LibraryBookCardSkeleton count={5} />
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-8 py-16"
        data-testid="library-error"
      >
        <p className="text-sm text-muted-foreground">Failed to load your library.</p>
        <Button variant="outline" onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    );
  }

  if (totalBooks === 0) {
    return <LibraryEmptyState />;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Refresh button */}
      <div className="flex justify-end px-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="refresh-button"
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="CURRENTLY_READING" className="w-full">
        <TabsList className="mx-4 w-[calc(100%-2rem)]" data-testid="library-tabs">
          {TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="flex-1 text-xs">
              {label}
              <span
                className="ml-1 text-muted-foreground"
                data-testid={`tab-count-${value}`}
              >
                ({grouped[value].length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className={isRefreshing ? 'pointer-events-none opacity-50 transition-opacity' : ''}>
          {TABS.map(({ value }) => (
            <TabsContent key={value} value={value} className="px-4">
              <LibrarySection
                books={grouped[value]}
                readerCounts={readerCounts}
                emptyMessage={emptyMessages[value]}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

const emptyMessages: Record<ReadingStatus, string> = {
  CURRENTLY_READING: 'No books in progress. Start reading something new!',
  WANT_TO_READ: 'No books on your reading list yet. Browse to find your next read!',
  FINISHED: 'No finished books yet. Keep reading!',
};
