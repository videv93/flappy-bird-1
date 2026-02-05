'use client';

import { useCallback } from 'react';
import { BookOpen } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { BookSearchResult as BookSearchResultType } from '@/services/books/types';

interface BookSearchResultProps {
  book: BookSearchResultType;
  onClick?: (book: BookSearchResultType) => void;
}

export function BookSearchResult({ book, onClick }: BookSearchResultProps) {
  const { title, authors, publishedYear, coverUrl } = book;

  const handleClick = useCallback(() => {
    onClick?.(book);
  }, [book, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(book);
      }
    },
    [book, onClick]
  );

  return (
    <div
      data-testid="book-search-result"
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer min-h-[72px]',
        'hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {/* Book cover */}
      <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            data-testid="book-cover-fallback"
          >
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Book info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {authors.join(', ')}
        </p>
        {publishedYear && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="publication-year"
          >
            {publishedYear}
          </p>
        )}
      </div>
    </div>
  );
}
