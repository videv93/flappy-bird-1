'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebounce, useMediaQuery } from '@/hooks';
import { cn } from '@/lib/utils';

interface BookSearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function BookSearchInput({
  onSearch,
  isLoading = false,
  placeholder = 'Search by title, author, or ISBN',
}: BookSearchInputProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const lastSearchedQuery = useRef<string>('');

  // Autofocus on mobile
  useEffect(() => {
    if (isMobile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile]);

  // Trigger search when debounced query changes and meets minimum length
  useEffect(() => {
    if (debouncedQuery.length >= 3 && debouncedQuery !== lastSearchedQuery.current) {
      lastSearchedQuery.current = debouncedQuery;
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && query.length >= 3) {
        e.preventDefault();
        lastSearchedQuery.current = query;
        onSearch(query);
      }
    },
    [query, onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    lastSearchedQuery.current = '';
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        data-testid="search-icon"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn('pl-10 pr-10 h-12')}
        aria-label="Search for books"
      />
      {query.length > 0 && !isLoading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="clear-button"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isLoading && (
        <Loader2
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
          data-testid="loading-spinner"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
