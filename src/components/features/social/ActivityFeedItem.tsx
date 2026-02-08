'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookCheck, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { ActivityItem } from '@/actions/social/getActivityFeed';
import { formatRelativeTime, formatDuration, getInitials } from '@/lib/utils';
import { KudosButton } from '@/components/features/social/KudosButton';

interface ActivityFeedItemProps {
  activity: ActivityItem;
}

export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      {/* User Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage
          src={activity.userAvatar || undefined}
          alt={activity.userName || 'User'}
        />
        <AvatarFallback>{getInitials(activity.userName)}</AvatarFallback>
      </Avatar>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        {activity.type === 'session' && (
          <p className="text-sm">
            <span className="font-medium">{activity.userName}</span> read{' '}
            <Link
              href={`/book/${activity.bookId}`}
              className="font-medium hover:underline"
            >
              {activity.bookTitle}
            </Link>{' '}
            for {formatDuration(activity.duration)}
          </p>
        )}

        {activity.type === 'finished' && (
          <p className="text-sm">
            <span className="font-medium">{activity.userName}</span> finished{' '}
            <Link
              href={`/book/${activity.bookId}`}
              className="font-medium hover:underline"
            >
              {activity.bookTitle}
            </Link>
            {activity.bookAuthor && (
              <span className="text-muted-foreground">
                {' '}
                by {activity.bookAuthor}
              </span>
            )}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {activity.type === 'session' && (
            <>
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(activity.timestamp)}</span>
            </>
          )}
          {activity.type === 'finished' && (
            <>
              <BookCheck className="h-3 w-3" />
              <span>{formatRelativeTime(activity.timestamp)}</span>
            </>
          )}
        </div>

        {/* KudosButton for session activities only */}
        {activity.type === 'session' && (
          <div className="mt-1">
            <KudosButton
              sessionId={activity.id}
              receiverId={activity.userId}
              initialKudosCount={activity.kudosCount ?? 0}
              initialUserGaveKudos={activity.userGaveKudos ?? false}
            />
          </div>
        )}
      </div>

      {/* Book Cover */}
      <Link href={`/book/${activity.bookId}`} className="shrink-0">
        {activity.bookCover ? (
          <Image
            src={activity.bookCover}
            alt={activity.bookTitle}
            width={40}
            height={64}
            className="h-16 w-10 object-cover rounded"
          />
        ) : (
          <div className="h-16 w-10 bg-muted rounded flex items-center justify-center">
            <BookCheck className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </Link>
    </div>
  );
}
