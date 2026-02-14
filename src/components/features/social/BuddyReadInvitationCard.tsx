'use client';

import { useState } from 'react';
import { ExternalLink, Check, X, BookOpen, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { respondToBuddyReadInvitation } from '@/actions/social/respondToBuddyReadInvitation';
import type { BuddyReadInvitationData } from '@/actions/social/getBuddyReadInvitations';

function buildAffiliateUrl(isbn: string, provider: string, bookId: string): string {
  const params = new URLSearchParams({
    isbn,
    provider,
    bookId,
    source: 'buddy-read',
  });
  return `/api/affiliate?${params.toString()}`;
}

interface BuddyReadInvitationCardProps {
  invitation: BuddyReadInvitationData;
  onRespond?: (invitationId: string, response: 'ACCEPTED' | 'DECLINED') => void;
}

export function BuddyReadInvitationCard({
  invitation,
  onRespond,
}: BuddyReadInvitationCardProps) {
  const [responding, setResponding] = useState(false);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);

  const { book, inviter } = invitation;
  const isbn = book.isbn13 || book.isbn10;

  const handleRespond = async (response: 'ACCEPTED' | 'DECLINED') => {
    setResponding(true);
    const result = await respondToBuddyReadInvitation({
      invitationId: invitation.id,
      response,
    });
    if (result.success) {
      setResponseStatus(response);
      onRespond?.(invitation.id, response);
    }
    setResponding(false);
  };

  if (responseStatus) {
    return (
      <div
        className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground"
        data-testid="invitation-responded"
      >
        {responseStatus === 'ACCEPTED'
          ? 'Invitation accepted! Book added to your library.'
          : 'Invitation declined.'}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border p-4 space-y-3"
      data-testid="buddy-read-invitation-card"
    >
      {/* Inviter info */}
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarImage src={inviter.image ?? undefined} alt={inviter.name ?? 'User'} />
          <AvatarFallback>{inviter.name?.charAt(0) ?? '?'}</AvatarFallback>
        </Avatar>
        <p className="text-sm">
          <span className="font-medium">{inviter.name ?? 'Someone'}</span>{' '}
          wants to read with you
        </p>
      </div>

      {/* Book info */}
      <div className="flex gap-3">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-16 h-24 rounded object-cover"
          />
        ) : (
          <div className="w-16 h-24 rounded bg-muted flex items-center justify-center">
            <BookOpen className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{book.title}</h4>
          {book.author && (
            <p className="text-xs text-muted-foreground">{book.author}</p>
          )}
        </div>
      </div>

      {/* Purchase/free options */}
      {isbn && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Get this book</p>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" asChild className="min-h-[44px]">
              <a
                href={`https://openlibrary.org/isbn/${isbn}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Read free on OpenLibrary"
              >
                <ExternalLink className="size-3.5" />
                Free on OpenLibrary
              </a>
            </Button>
            <Button variant="secondary" size="sm" asChild className="min-h-[44px]">
              <a
                href={buildAffiliateUrl(isbn, 'amazon', book.id)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy on Amazon (supports app)"
              >
                <ExternalLink className="size-3.5" />
                Amazon
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  (supports app)
                </span>
              </a>
            </Button>
            <Button variant="secondary" size="sm" asChild className="min-h-[44px]">
              <a
                href={buildAffiliateUrl(isbn, 'bookshop', book.id)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buy on Bookshop.org (supports app)"
              >
                <ExternalLink className="size-3.5" />
                Bookshop.org
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  (supports app)
                </span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="min-h-[44px]">
              <a
                href={`https://www.worldcat.org/isbn/${isbn}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Find at library"
              >
                <Library className="size-3.5" />
                Find at library
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Accept/Decline */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="min-h-[44px] flex-1"
          onClick={() => handleRespond('ACCEPTED')}
          disabled={responding}
          aria-label="Accept buddy read invitation"
        >
          <Check className="size-4" />
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] flex-1"
          onClick={() => handleRespond('DECLINED')}
          disabled={responding}
          aria-label="Decline buddy read invitation"
        >
          <X className="size-4" />
          Decline
        </Button>
      </div>
    </div>
  );
}
