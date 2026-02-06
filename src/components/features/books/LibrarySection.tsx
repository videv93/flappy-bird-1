'use client';

import type { UserBookWithBook } from './types';

import { LibraryBookCard } from './LibraryBookCard';

interface LibrarySectionProps {
  books: UserBookWithBook[];
  readerCounts: Record<string, { total: number; reading: number }>;
  emptyMessage?: string;
}

export function LibrarySection({
  books,
  readerCounts,
  emptyMessage = 'No books in this section yet.',
}: LibrarySectionProps) {
  if (books.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid="section-empty"
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-1" data-testid="library-section">
      {books.map((userBook) => (
        <LibraryBookCard
          key={userBook.id}
          userBook={userBook}
          readerCount={readerCounts[userBook.bookId]}
        />
      ))}
    </div>
  );
}
