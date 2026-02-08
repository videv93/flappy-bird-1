'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

// Input validation schema
const getActivityFeedSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetActivityFeedInput = z.input<typeof getActivityFeedSchema>;

// Activity item types
export type SessionActivity = {
  type: 'session';
  id: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  bookId: string;
  bookTitle: string;
  bookCover: string | null;
  duration: number; // seconds
  timestamp: Date;
  kudosCount: number;
  userGaveKudos: boolean;
};

export type FinishedBookActivity = {
  type: 'finished';
  id: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  bookId: string;
  bookTitle: string;
  bookCover: string | null;
  bookAuthor: string | null;
  timestamp: Date;
};

export type ActivityItem = SessionActivity | FinishedBookActivity;

export type ActivityFeedData = {
  activities: ActivityItem[];
  total: number;
  hasFollows: boolean;
};

// Time-bound filter: only show activities from the last 30 days
const ACTIVITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function getActivityFeed(
  input: GetActivityFeedInput = {}
): Promise<ActionResult<ActivityFeedData>> {
  try {
    // Validate input
    const validated = getActivityFeedSchema.parse(input);
    const { limit, offset } = validated;

    // Authenticate
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const currentUserId = session.user.id;

    // Get list of users the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const followedUserIds = follows.map((f) => f.followingId);
    const hasFollows = followedUserIds.length > 0;

    // If user follows no one, return empty result
    if (!hasFollows) {
      return {
        success: true,
        data: {
          activities: [],
          total: 0,
          hasFollows: false,
        },
      };
    }

    // Cap per-type queries to prevent loading excessive data when merging
    const queryCap = limit + offset;
    const activityCutoff = new Date(Date.now() - ACTIVITY_WINDOW_MS);

    // Fetch reading sessions and finished books in parallel
    const [sessions, finishedBooks] = await Promise.all([
      // Reading sessions from followed users with public activity
      prisma.readingSession.findMany({
        where: {
          userId: { in: followedUserIds },
          user: { showReadingActivity: true },
          startedAt: { gte: activityCutoff },
        },
        orderBy: { startedAt: 'desc' },
        take: queryCap,
        select: {
          id: true,
          userId: true,
          bookId: true,
          duration: true,
          startedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              image: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
            },
          },
        },
      }),
      // Finished books from followed users with public activity
      prisma.userBook.findMany({
        where: {
          userId: { in: followedUserIds },
          status: 'FINISHED',
          deletedAt: null,
          user: { showReadingActivity: true },
          dateFinished: { gte: activityCutoff },
        },
        orderBy: { dateFinished: 'desc' },
        take: queryCap,
        select: {
          id: true,
          userId: true,
          bookId: true,
          dateFinished: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              image: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverUrl: true,
            },
          },
        },
      }),
    ]);

    // Run separate count queries for accurate total (Issue 1)
    const [sessionCount, finishedBookCount] = await Promise.all([
      prisma.readingSession.count({
        where: {
          userId: { in: followedUserIds },
          user: { showReadingActivity: true },
          startedAt: { gte: activityCutoff },
        },
      }),
      prisma.userBook.count({
        where: {
          userId: { in: followedUserIds },
          status: 'FINISHED',
          deletedAt: null,
          user: { showReadingActivity: true },
          dateFinished: { gte: activityCutoff },
        },
      }),
    ]);

    const total = sessionCount + finishedBookCount;

    // Merge into unified activity list (without kudos data yet)
    const allActivities: (
      | { type: 'session'; session: (typeof sessions)[number]; timestamp: Date }
      | { type: 'finished'; finishedBook: (typeof finishedBooks)[number]; timestamp: Date }
    )[] = [
      ...sessions.map((s) => ({
        type: 'session' as const,
        session: s,
        timestamp: s.startedAt,
      })),
      ...finishedBooks.map((fb) => ({
        type: 'finished' as const,
        finishedBook: fb,
        timestamp: fb.dateFinished || fb.createdAt,
      })),
    ];

    // Sort by timestamp descending (most recent first)
    allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination first, then fetch kudos only for paginated items (Issue 2)
    const paginatedRaw = allActivities.slice(offset, offset + limit);

    // Extract session IDs from paginated results only
    const paginatedSessionIds = paginatedRaw
      .filter((a) => a.type === 'session')
      .map((a) => a.session.id);

    const sessionKudos =
      paginatedSessionIds.length > 0
        ? await prisma.kudos.findMany({
            where: { sessionId: { in: paginatedSessionIds } },
            select: { sessionId: true, giverId: true },
          })
        : [];

    // Build final activity items with kudos data
    const paginatedActivities: ActivityItem[] = paginatedRaw.map((item) => {
      if (item.type === 'session') {
        const s = item.session;
        const kudosForSession = sessionKudos.filter(
          (k) => k.sessionId === s.id
        );
        return {
          type: 'session',
          id: s.id,
          userId: s.userId,
          userName: s.user.name,
          userAvatar: s.user.avatarUrl || s.user.image || null,
          bookId: s.bookId,
          bookTitle: s.book.title,
          bookCover: s.book.coverUrl,
          duration: s.duration,
          timestamp: s.startedAt,
          kudosCount: kudosForSession.length,
          userGaveKudos: kudosForSession.some(
            (k) => k.giverId === currentUserId
          ),
        } satisfies SessionActivity;
      } else {
        const fb = item.finishedBook;
        return {
          type: 'finished',
          id: fb.id,
          userId: fb.userId,
          userName: fb.user.name,
          userAvatar: fb.user.avatarUrl || fb.user.image || null,
          bookId: fb.bookId,
          bookTitle: fb.book.title,
          bookCover: fb.book.coverUrl,
          bookAuthor: fb.book.author,
          timestamp: fb.dateFinished || fb.createdAt,
        } satisfies FinishedBookActivity;
      }
    });

    return {
      success: true,
      data: {
        activities: paginatedActivities,
        total,
        hasFollows: true,
      },
    };
  } catch (error) {
    console.error('getActivityFeed error:', error);
    return {
      success: false,
      error: 'Failed to load activity feed',
    };
  }
}
