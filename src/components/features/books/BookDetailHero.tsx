'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookData } from '@/actions/books';
import { AuthorVerifiedBadge } from './AuthorVerifiedBadge';
import { ClaimStatusBadge } from '@/components/features/authors/ClaimStatusBadge';
import { AuthorClaimForm } from '@/components/features/authors/AuthorClaimForm';
import { getClaimStatus } from '@/actions/authors/getClaimStatus';
import type { ClaimStatusData } from '@/actions/authors/getClaimStatus';

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
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatusData | null>(null);

  const isExternal = 'isExternal' in book && book.isExternal;

  useEffect(() => {
    if (isExternal) return;

    getClaimStatus(book.id).then((result) => {
      if (result.success) {
        setClaimStatus(result.data);
      }
    });
  }, [book.id, isExternal]);

  const handleClaimSuccess = () => {
    setClaimStatus({ hasClaim: true, status: 'PENDING' });
  };

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

        {/* Author claim section */}
        {!isExternal && (
          <div className="mt-2" data-testid="author-claim-section">
            {claimStatus?.hasClaim && claimStatus.status ? (
              <ClaimStatusBadge status={claimStatus.status} />
            ) : !authorVerified ? (
              <button
                onClick={() => setClaimFormOpen(true)}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors min-h-[44px] px-2 flex items-center"
                data-testid="are-you-author-link"
              >
                Are you the author?
              </button>
            ) : null}
          </div>
        )}

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

      {/* Claim form sheet */}
      {!isExternal && (
        <AuthorClaimForm
          bookId={book.id}
          open={claimFormOpen}
          onOpenChange={setClaimFormOpen}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}
