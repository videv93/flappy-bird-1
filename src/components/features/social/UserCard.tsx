'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { FollowButton } from './FollowButton';

interface UserCardProps {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    bioRemovedAt: Date | null;
    avatarUrl: string | null;
    image: string | null;
    isFollowing: boolean;
    followerCount: number;
  };
}

export function UserCard({ user }: UserCardProps) {
  const avatarSrc = user.avatarUrl || user.image || undefined;
  const displayName = user.name || 'Unknown User';

  return (
    <article className="flex items-center gap-3 rounded-lg border p-3">
      <Link
        href={`/user/${user.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar size="lg">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{displayName}</h3>
          {user.bioRemovedAt ? (
            <p className="truncate text-xs italic text-muted-foreground">
              [Content removed by moderator]
            </p>
          ) : user.bio ? (
            <p className="truncate text-xs text-muted-foreground">{user.bio}</p>
          ) : null}
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              {user.followerCount} {user.followerCount === 1 ? 'follower' : 'followers'}
            </span>
          </div>
        </div>
      </Link>

      <FollowButton
        targetUserId={user.id}
        targetUserName={displayName}
        initialIsFollowing={user.isFollowing}
      />
    </article>
  );
}
