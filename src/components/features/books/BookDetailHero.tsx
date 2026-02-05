'use client';

import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookData } from '@/actions/books';
import { AuthorVerifiedBadge } from './AuthorVerifiedBadge';

interface BookDetailHeroProps {
  book: BookData;
  authorVerified?: boolean;
  className?: string;
}

export function BookDetailHero({
  book,
  authorVerified,
  className,
}: BookDetailHeroProps) {
  return (
    <div className={cn('relative', className)} data-testid="book-detail-hero">
      {/* Gradient background for immersive feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent h-64 dark:from-amber-950/20" />

      <div className="relative z-10 flex flex-col items-center pt-6 pb-4">
        {/* Large book cover */}
        <div
          className="w-40 h-56 bg-muted rounded-lg shadow-lg overflow-hidden mb-4"
          data-testid="book-cover"
        >
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              width={160}
              height={224}
              className="w-full h-full object-cover"
              priority
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-muted"
              data-testid="book-cover-fallback"
            >
              <BookOpen className="h-16 w-16 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>

        {/* Book metadata */}
        <h1
          className="text-2xl font-semibold text-center px-4 line-clamp-2"
          data-testid="book-title"
        >
          {book.title}
        </h1>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-muted-foreground" data-testid="book-author">
            {book.author}
          </span>
          {authorVerified && <AuthorVerifiedBadge />}
        </div>

        {/* Year and page count */}
        {(book.publishedYear || book.pageCount) && (
          <p
            className="text-sm text-muted-foreground mt-1"
            data-testid="book-metadata"
          >
            {[book.publishedYear, book.pageCount && `${book.pageCount} pages`]
              .filter(Boolean)
              .join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
}
