'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { logAdminAction } from '@/actions/admin/logAdminAction';
import type { ActionResult } from '@/actions/books/types';

export interface UserDetailResult {
  account: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    suspendedUntil: Date | null;
    suspensionReason: string | null;
  };
  readingStats: {
    currentStreak: number;
    longestStreak: number;
    totalReadingTimeHours: number;
    totalSessions: number;
  };
  socialStats: {
    followerCount: number;
    followingCount: number;
  };
  recentActivity: {
    lastLogin: Date | null;
    recentKudosGiven: Array<{
      id: string;
      receiverId: string;
      createdAt: Date;
    }>;
    recentKudosReceived: Array<{
      id: string;
      giverId: string;
      createdAt: Date;
    }>;
    currentRoom: { bookId: string; joinedAt: Date } | null;
  };
  moderationSummary: {
    warningCount: number;
    suspensionCount: number;
    flagsReceived: number;
    flagsSubmitted: number;
  };
}

export async function getUserDetail(
  userId: string
): Promise<ActionResult<UserDetailResult>> {
  try {
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'User ID is required' };
    }

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!adminUser || !isAdmin(adminUser)) {
      return { success: false, error: 'Forbidden' };
    }

    const [
      user,
      streak,
      readingStats,
      followerCount,
      followingCount,
      lastSession,
      recentKudosGiven,
      recentKudosReceived,
      roomPresence,
      warningCount,
      suspensionCount,
      flagsReceived,
      flagsSubmitted,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          avatarUrl: true,
          bio: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          suspendedUntil: true,
          suspensionReason: true,
        },
      }),
      prisma.userStreak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      prisma.readingSession.aggregate({
        where: { userId },
        _sum: { duration: true },
        _count: true,
      }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.kudos.findMany({
        where: { giverId: userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, receiverId: true, createdAt: true },
      }),
      prisma.kudos.findMany({
        where: { receiverId: userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, giverId: true, createdAt: true },
      }),
      prisma.roomPresence.findFirst({
        where: { userId, leftAt: null },
        select: { bookId: true, joinedAt: true },
      }),
      prisma.userWarning.count({ where: { userId } }),
      prisma.userSuspension.count({ where: { userId } }),
      prisma.moderationItem.count({ where: { reportedUserId: userId } }),
      prisma.moderationItem.count({ where: { reporterId: userId } }),
    ]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const totalDurationSeconds = readingStats._sum.duration ?? 0;
    const totalReadingTimeHours = Math.round((totalDurationSeconds / 3600) * 10) / 10;

    await logAdminAction({
      adminId: session.user.id,
      actionType: 'VIEW_USER_DETAIL',
      targetId: userId,
      targetType: 'User',
    });

    return {
      success: true,
      data: {
        account: user,
        readingStats: {
          currentStreak: streak?.currentStreak ?? 0,
          longestStreak: streak?.longestStreak ?? 0,
          totalReadingTimeHours,
          totalSessions: readingStats._count,
        },
        socialStats: {
          followerCount,
          followingCount,
        },
        recentActivity: {
          lastLogin: lastSession?.createdAt ?? null,
          recentKudosGiven,
          recentKudosReceived,
          currentRoom: roomPresence,
        },
        moderationSummary: {
          warningCount,
          suspensionCount,
          flagsReceived,
          flagsSubmitted,
        },
      },
    };
  } catch (error) {
    console.error('getUserDetail error:', error);
    return { success: false, error: 'Failed to fetch user details' };
  }
}
