'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserDetailResult } from '@/actions/admin/getUserDetail';

interface UserAccountCardProps {
  account: UserDetailResult['account'];
  readingStats: UserDetailResult['readingStats'];
  socialStats: UserDetailResult['socialStats'];
}

export function UserAccountCard({ account, readingStats, socialStats }: UserAccountCardProps) {
  const isSuspended =
    account.suspendedUntil && new Date(account.suspendedUntil) > new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          {(account.avatarUrl || account.image) && (
            <img
              src={account.avatarUrl ?? account.image ?? ''}
              alt={account.name ?? 'User avatar'}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div>
            <CardTitle className="text-lg">{account.name ?? 'Unknown User'}</CardTitle>
            <p className="text-sm text-muted-foreground">{account.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Role</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">{account.role}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Joined</span>
            <span>{new Date(account.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Email Verified</span>
            <span>{account.emailVerified ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Current Streak</span>
            <span>{readingStats.currentStreak} days</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Longest Streak</span>
            <span>{readingStats.longestStreak} days</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Total Reading Time</span>
            <span>{readingStats.totalReadingTimeHours}h ({readingStats.totalSessions} sessions)</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Followers</span>
            <span>{socialStats.followerCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Following</span>
            <span>{socialStats.followingCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Status</span>
            {isSuspended ? (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                Suspended
              </span>
            ) : (
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
        </div>
        {account.bio && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-muted-foreground text-sm block mb-1">Bio</span>
            <p className="text-sm">{account.bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
