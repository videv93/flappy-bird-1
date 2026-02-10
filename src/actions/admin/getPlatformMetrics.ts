'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export interface UserMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  dauMauRatio: number;
}

export interface EngagementMetrics {
  totalSessions: number;
  totalReadingTimeHours: number;
  avgSessionDurationMinutes: number;
  activeStreaks: number;
  avgStreakLength: number;
}

export interface SocialMetrics {
  kudosToday: number;
  kudosAllTime: number;
  activeReadingRooms: number;
  totalFollows: number;
}

export interface ContentMetrics {
  totalBooks: number;
  verifiedAuthors: number;
  pendingAuthorClaims: number;
}

export interface PlatformMetrics {
  user: UserMetrics;
  engagement: EngagementMetrics;
  social: SocialMetrics;
  content: ContentMetrics;
}

export async function getPlatformMetrics(): Promise<ActionResult<PlatformMetrics>> {
  try {
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

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const startOfMonth = new Date(startOfDay);
    startOfMonth.setUTCDate(1);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      dauResult,
      mauResult,
      totalSessions,
      readingTimeResult,
      avgDurationResult,
      activeStreaks,
      avgStreakResult,
      kudosToday,
      kudosAllTime,
      activeRoomsResult,
      totalFollows,
      totalBooks,
      verifiedAuthors,
      pendingAuthorClaims,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT user_id) as count
        FROM reading_sessions
        WHERE started_at >= ${startOfDay}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT user_id) as count
        FROM reading_sessions
        WHERE started_at >= ${thirtyDaysAgo}
      `,
      prisma.readingSession.count(),
      prisma.readingSession.aggregate({ _sum: { duration: true } }),
      prisma.readingSession.aggregate({ _avg: { duration: true } }),
      prisma.userStreak.count({ where: { currentStreak: { gt: 0 } } }),
      prisma.userStreak.aggregate({ _avg: { currentStreak: true } }),
      prisma.kudos.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.kudos.count(),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT book_id) as count
        FROM room_presences
        WHERE left_at IS NULL
      `,
      prisma.follow.count(),
      prisma.book.count(),
      prisma.authorClaim.count({ where: { status: 'APPROVED' } }),
      prisma.authorClaim.count({ where: { status: 'PENDING' } }),
    ]);

    const dau = Number(dauResult[0]?.count ?? 0);
    const mau = Number(mauResult[0]?.count ?? 0);
    const activeRooms = Number(activeRoomsResult[0]?.count ?? 0);
    const totalDurationSeconds = readingTimeResult._sum.duration ?? 0;
    const avgDurationSeconds = avgDurationResult._avg.duration ?? 0;

    return {
      success: true,
      data: {
        user: {
          totalUsers,
          newUsersToday,
          newUsersThisWeek,
          newUsersThisMonth,
          dailyActiveUsers: dau,
          monthlyActiveUsers: mau,
          dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) / 100 : 0,
        },
        engagement: {
          totalSessions,
          totalReadingTimeHours: Math.round((totalDurationSeconds / 3600) * 10) / 10,
          avgSessionDurationMinutes: Math.round((avgDurationSeconds / 60) * 10) / 10,
          activeStreaks,
          avgStreakLength: Math.round((avgStreakResult._avg.currentStreak ?? 0) * 10) / 10,
        },
        social: {
          kudosToday,
          kudosAllTime,
          activeReadingRooms: activeRooms,
          totalFollows,
        },
        content: {
          totalBooks,
          verifiedAuthors,
          pendingAuthorClaims,
        },
      },
    };
  } catch (error) {
    console.error('getPlatformMetrics error:', error);
    return { success: false, error: 'Failed to fetch platform metrics' };
  }
}
