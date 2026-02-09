'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFollowStatus } from '@/actions/social/getFollowStatus';
import type { ActionResult } from '@/actions/books/types';

const getUserProfileSchema = z.object({
  userId: z.string().min(1),
});

export type GetUserProfileInput = z.input<typeof getUserProfileSchema>;

export interface RecentSession {
  id: string;
  duration: number;
  startedAt: Date;
  book: {
    id: string;
    title: string;
    coverUrl: string | null;
  };
}

export interface FinishedBook {
  id: string;
  dateFinished: Date | null;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
}

export interface CurrentlyReadingBook {
  id: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
}

export interface UserProfileData {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    bioRemovedAt: Date | null;
    avatarUrl: string | null;
    showReadingActivity: boolean;
  };
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  currentStreak: number;
  longestStreak: number;
  currentlyReading: CurrentlyReadingBook[] | null;
  recentSessions: RecentSession[] | null;
  finishedBooks: FinishedBook[] | null;
}

export async function getUserProfile(
  input: GetUserProfileInput
): Promise<ActionResult<UserProfileData>> {
  try {
    const { userId } = getUserProfileSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const [user, followStatus, streak, currentlyReading, recentSessions, finishedBooks] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            bioRemovedAt: true,
            avatarUrl: true,
            showReadingActivity: true,
          },
        }),
        getFollowStatus({ targetUserId: userId }),
        prisma.userStreak.findUnique({
          where: { userId },
          select: { currentStreak: true, longestStreak: true },
        }),
        prisma.userBook.findMany({
          where: { userId, status: 'CURRENTLY_READING', deletedAt: null },
          take: 3,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
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
        prisma.readingSession.findMany({
          where: { userId },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            duration: true,
            startedAt: true,
            book: {
              select: { id: true, title: true, coverUrl: true },
            },
          },
        }),
        prisma.userBook.findMany({
          where: { userId, status: 'FINISHED', deletedAt: null },
          orderBy: { dateFinished: 'desc' },
          take: 5,
          select: {
            id: true,
            dateFinished: true,
            book: {
              select: { id: true, title: true, author: true, coverUrl: true },
            },
          },
        }),
      ]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isFollowing = followStatus.success
      ? followStatus.data.isFollowing
      : false;
    const followerCount = followStatus.success
      ? followStatus.data.followerCount
      : 0;
    const followingCount = followStatus.success
      ? followStatus.data.followingCount
      : 0;

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
          bio: user.bio,
          bioRemovedAt: user.bioRemovedAt,
          avatarUrl: user.avatarUrl,
          showReadingActivity: user.showReadingActivity,
        },
        isFollowing,
        followerCount,
        followingCount,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        currentlyReading: user.showReadingActivity ? currentlyReading : null,
        recentSessions: user.showReadingActivity ? recentSessions : null,
        finishedBooks: user.showReadingActivity ? finishedBooks : null,
      },
    };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return { success: false, error: 'Failed to load user profile' };
  }
}
