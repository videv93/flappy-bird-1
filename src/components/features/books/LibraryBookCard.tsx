'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { UserBookWithBook } from './types';
import { getReadingStatusLabel } from './types';

interface LibraryBookCardProps {
  userBook: UserBookWithBook;
  readerCount?: { total: number; reading: number };
  className?: string;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LibraryBookCard({
  userBook,
  readerCount,
  className,
}: LibraryBookCardProps) {
  const { book, status, progress } = userBook;
  const bookIdentifier = book.isbn13 || book.isbn10 || book.id;

  return (
    <Link
      href={`/book/${bookIdentifier}`}
      className={cn(
        'flex gap-3 rounded-lg p-3 transition-colors',
        'hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'min-h-[72px]',
        className
      )}
      aria-label={`${book.title} by ${book.author}, ${getReadingStatusLabel(status)}`}
      data-testid="library-book-card"
    >
      {/* Book cover */}
      <div className="h-[80px] w-[54px] flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            width={54}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            data-testid="book-cover-fallback"
          >
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Book info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <h3 className="line-clamp-1 text-sm font-medium">{book.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>

        {/* Status-specific content */}
        {status === 'CURRENTLY_READING' && (
          <div className="mt-1 flex items-center gap-2" data-testid="reading-progress">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}

        {status === 'FINISHED' && userBook.dateFinished && (
          <p className="text-xs text-muted-foreground" data-testid="completion-date">
            Finished {formatDate(userBook.dateFinished)}
          </p>
        )}

        {/* Reader count */}
        {readerCount && readerCount.reading > 0 && (
          <p className="text-xs text-amber-600" data-testid="reading-now-count">
            {readerCount.reading} reading now
          </p>
        )}
      </div>
    </Link>
  );
}
