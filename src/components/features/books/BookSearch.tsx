'use client';

import { useState, useCallback, useRef } from 'react';

import type { BookSearchResult as BookSearchResultType } from '@/services/books/types';

import { BookSearchInput } from './BookSearchInput';
import { BookSearchResult } from './BookSearchResult';
import { BookSearchResultSkeleton } from './BookSearchResultSkeleton';
import { BookSearchEmpty } from './BookSearchEmpty';
import { BookSearchError } from './BookSearchError';
import type { SearchState } from './types';

interface BookSearchProps {
  onBookSelect?: (book: BookSearchResultType) => void;
}

const MAX_RESULTS = 20;

export function BookSearch({ onBookSelect }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResultType[]>([]);
  const [state, setState] = useState<SearchState>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query is too short
    if (searchQuery.length < 3) {
      setState('idle');
      setResults([]);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState('loading');
    setQuery(searchQuery);

    try {
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (data.results.length === 0) {
        setState('empty');
        setResults([]);
      } else {
        setState('success');
        setResults(data.results.slice(0, MAX_RESULTS));
      }
    } catch (error) {
      // Don't handle aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Search error:', error);
      setState('error');
      setResults([]);
    }
  }, []);

  // BookSearchInput already debounces, so just perform search directly
  const handleSearch = useCallback(
    (searchQuery: string) => {
      performSearch(searchQuery);
    },
    [performSearch]
  );

  const handleRetry = useCallback(() => {
    if (query.length >= 3) {
      performSearch(query);
    }
  }, [query, performSearch]);

  const handleBookClick = useCallback(
    (book: BookSearchResultType) => {
      onBookSelect?.(book);
    },
    [onBookSelect]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background pb-4">
        <BookSearchInput
          onSearch={handleSearch}
          isLoading={state === 'loading'}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {state === 'loading' && (
          <div data-testid="book-search-loading">
            <BookSearchResultSkeleton count={5} />
          </div>
        )}

        {state === 'success' && (
          <div data-testid="book-search-results" className="space-y-1">
            {results.map((book) => (
              <BookSearchResult
                key={book.id}
                book={book}
                onClick={handleBookClick}
              />
            ))}
          </div>
        )}

        {state === 'empty' && <BookSearchEmpty query={query} />}

        {state === 'error' && <BookSearchError onRetry={handleRetry} />}
      </div>
    </div>
  );
}
