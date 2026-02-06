'use client';

import { useState, useCallback, useMemo } from 'react';
import { BookDetailHero } from './BookDetailHero';
import { BookDescription } from './BookDescription';
import { BookReadersCount } from './BookReadersCount';
import { BookDetailActions } from './BookDetailActions';
import { SessionList } from '@/components/features/sessions/SessionList';
import type { BookDetailData } from '@/actions/books';
import type { BookSearchResult } from '@/services/books/types';
import type { ReadingStatus, ReadingSession } from '@prisma/client';

interface BookDetailProps {
  data: BookDetailData;
  initialSessions?: ReadingSession[];
  initialCursor?: string | null;
}

export function BookDetail({ data, initialSessions = [], initialCursor = null }: BookDetailProps) {
  const { book, stats, userStatus, authorVerified } = data;

  // Local state to track library status for optimistic updates
  const [isInLibrary, setIsInLibrary] = useState(userStatus?.isInLibrary ?? false);
  const [currentStatus, setCurrentStatus] = useState<ReadingStatus | undefined>(
    userStatus?.status
  );
  const [progress, setProgress] = useState(userStatus?.progress ?? 0);

  // Convert Book to BookSearchResult for AddToLibraryButton
  // TODO: Book model doesn't track original source. Using 'openlibrary' as fallback.
  // Consider adding source field to Book model if source tracking becomes needed.
  const bookSearchResult: BookSearchResult = {
    id: book.id,
    source: 'openlibrary', // Fallback - actual source not tracked in Book model
    title: book.title,
    authors: [book.author],
    publishedYear: book.publishedYear ?? undefined,
    coverUrl: book.coverUrl ?? undefined,
    isbn10: book.isbn10 ?? undefined,
    isbn13: book.isbn13 ?? undefined,
    pageCount: book.pageCount ?? undefined,
    description: book.description ?? undefined,
  };

  const userBookId = useMemo(() => userStatus?.userBookId, [userStatus?.userBookId]);

  const handleStatusChange = useCallback((status: ReadingStatus) => {
    setIsInLibrary(true);
    setCurrentStatus(status);
    if (status === 'FINISHED') {
      setProgress(100);
    } else if (status === 'WANT_TO_READ') {
      setProgress(0);
    }
    // For CURRENTLY_READING, keep existing progress
  }, []);

  const handleRemove = useCallback(() => {
    setIsInLibrary(false);
    setCurrentStatus(undefined);
    setProgress(0);
  }, []);

  const handleRestore = useCallback((status: ReadingStatus, restoredProgress: number) => {
    setIsInLibrary(true);
    setCurrentStatus(status);
    setProgress(restoredProgress);
  }, []);

  return (
    <div data-testid="book-detail">
      <BookDetailHero book={book} authorVerified={authorVerified} />

      <BookReadersCount
        totalReaders={stats.totalReaders}
        currentlyReading={stats.currentlyReading}
        className="border-t border-b border-border"
      />

      <BookDescription
        description={book.description}
        isbn={book.isbn13 || book.isbn10}
        className="py-4"
      />

      {isInLibrary && initialSessions.length > 0 && (
        <div className="border-t border-border py-4" data-testid="book-sessions-section">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Your Sessions</h3>
          <SessionList
            bookId={book.id}
            initialSessions={initialSessions}
            initialCursor={initialCursor ?? null}
          />
        </div>
      )}

      <BookDetailActions
        book={bookSearchResult}
        isInLibrary={isInLibrary}
        currentStatus={currentStatus}
        progress={progress}
        userBookId={userBookId}
        onStatusChange={handleStatusChange}
        onRemove={handleRemove}
        onRestore={handleRestore}
        className="border-t border-border"
      />
    </div>
  );
}
