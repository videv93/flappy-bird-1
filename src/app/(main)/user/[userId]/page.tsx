import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Flame, Trophy } from 'lucide-react';
import Link from 'next/link';

import { auth } from '@/lib/auth';
import { getInitials } from '@/lib/utils';
import { getUserProfile } from '@/actions/social/getUserProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/features/social/FollowButton';
import { RecentSessionsList } from '@/components/features/social/RecentSessionsList';
import { FinishedBooksList } from '@/components/features/social/FinishedBooksList';
import { FlagContentButton } from '@/components/features/moderation/FlagContentButton';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) redirect('/login');
  if (session.user.id === userId) redirect('/profile');

  const profileResult = await getUserProfile({ userId });

  if (!profileResult.success) {
    console.error('Failed to load profile:', profileResult.error);
    notFound();
  }

  const {
    user,
    isFollowing,
    followerCount,
    followingCount,
    currentStreak,
    longestStreak,
    currentlyReading,
    recentSessions,
    finishedBooks,
  } = profileResult.data;

  const avatarSrc = user.avatarUrl || user.image || undefined;
  const displayName = user.name || 'Unknown User';

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <h1 className="text-xl font-semibold">{displayName}</h1>
          {user.bioRemovedAt ? (
            <p className="mt-1 text-sm italic text-muted-foreground">
              [Content removed by moderator]
            </p>
          ) : user.bio ? (
            <div className="mt-1 flex items-center justify-center gap-1">
              <p className="text-sm text-muted-foreground">{user.bio}</p>
              <FlagContentButton contentType="PROFILE_BIO" contentId={user.id} />
            </div>
          ) : null}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold">{followerCount}</div>
            <div className="text-muted-foreground">
              {followerCount === 1 ? 'Follower' : 'Followers'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{followingCount}</div>
            <div className="text-muted-foreground">Following</div>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 text-center">
              <Flame className="h-4 w-4 text-orange-500" />
              <div>
                <span className="font-semibold">{currentStreak}</span>
                <span className="ml-1 text-muted-foreground">day streak</span>
              </div>
            </div>
          )}
          {longestStreak > 0 && (
            <div className="flex items-center gap-1 text-center">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div>
                <span className="font-semibold">{longestStreak}</span>
                <span className="ml-1 text-muted-foreground">best</span>
              </div>
            </div>
          )}
        </div>

        <FollowButton
          targetUserId={user.id}
          targetUserName={displayName}
          initialIsFollowing={isFollowing}
        />
      </div>

      {/* Reading Activity */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Reading Activity
        </h2>

        {user.showReadingActivity ? (
          <>
            {/* Currently Reading */}
            <section aria-labelledby="currently-reading-heading">
              <h3
                id="currently-reading-heading"
                className="mb-2 text-xs font-medium text-muted-foreground"
              >
                Currently Reading
              </h3>
              {currentlyReading && currentlyReading.length > 0 ? (
                <div className="space-y-2">
                  {currentlyReading.map((ub) => (
                    <Link
                      key={ub.id}
                      href={`/book/${ub.book.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      {ub.book.coverUrl ? (
                        <img
                          src={ub.book.coverUrl}
                          alt={`Cover of ${ub.book.title}`}
                          className="h-12 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {ub.book.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ub.book.author}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No books currently being read.
                </p>
              )}
            </section>

            {/* Recent Sessions */}
            <section aria-labelledby="recent-sessions-heading">
              <h3
                id="recent-sessions-heading"
                className="mb-2 text-xs font-medium text-muted-foreground"
              >
                Recent Sessions
              </h3>
              <RecentSessionsList sessions={recentSessions} />
            </section>

            {/* Finished Books */}
            <section aria-labelledby="finished-books-heading">
              <h3
                id="finished-books-heading"
                className="mb-2 text-xs font-medium text-muted-foreground"
              >
                Finished Books
              </h3>
              <FinishedBooksList books={finishedBooks} />
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Reading activity is private.
          </p>
        )}
      </div>
    </div>
  );
}
