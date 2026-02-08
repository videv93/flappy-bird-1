'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { KudosWithDetails } from '@/actions/social';

interface KudosListItemProps {
  kudos: KudosWithDetails;
}

export function KudosListItem({ kudos }: KudosListItemProps) {
  const { giver, session, createdAt } = kudos;
  const displayName = giver.name || 'Anonymous';

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Giver Avatar - 48px with proper touch target */}
      <Link
        href={`/user/${giver.id}`}
        className="shrink-0 min-h-[44px] flex items-center"
        aria-label={`View ${displayName}'s profile`}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={giver.image || undefined} alt={displayName} />
          <AvatarFallback>{getInitials(giver.name)}</AvatarFallback>
        </Avatar>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-h-[44px]">
          <Link
            href={`/user/${giver.id}`}
            className="font-medium hover:underline inline-flex items-center min-h-[44px]"
          >
            {displayName}
          </Link>
          <span className="text-sm text-muted-foreground">sent you kudos</span>
        </div>

        <Link
          href={`/book/${session.book.id}`}
          className="flex items-center gap-2 mt-1 hover:underline min-h-[44px]"
          aria-label={`View kudos for ${session.book.title}`}
        >
          {session.book.coverUrl && (
            <Image
              src={session.book.coverUrl}
              alt={session.book.title}
              width={32}
              height={48}
              className="rounded object-cover"
            />
          )}
          <span className="text-sm text-muted-foreground truncate">
            {session.book.title}
          </span>
        </Link>

        <time className="text-xs text-muted-foreground mt-1 block">
          {formatRelativeTime(createdAt)}
        </time>
      </div>
    </div>
  );
}
