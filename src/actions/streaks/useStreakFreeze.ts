'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getYesterdayBounds, getDateInTimezone } from '@/lib/dates';
import type { ActionResult } from '@/actions/books/types';

const useStreakFreezeSchema = z.object({
  timezone: z.string().optional().default('UTC'),
});

export type UseStreakFreezeInput = z.input<typeof useStreakFreezeSchema>;

export type FreezeResult = {
  freezeApplied: boolean;
  freezesRemaining: number;
  currentStreak: number;
  reason:
    | 'freeze_applied'
    | 'already_frozen'
    | 'streak_not_at_risk'
    | 'no_freezes_available'
    | 'no_streak_record';
};

/**
 * Apply a streak freeze to protect the user's streak.
 * The freeze is applied to YESTERDAY (the missed day), not today.
 */
export async function useStreakFreeze(
  input?: UseStreakFreezeInput
): Promise<ActionResult<FreezeResult>> {
  try {
    const validated = useStreakFreezeSchema.parse(input ?? {});

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to use a streak freeze' };
    }

    const userId = session.user.id;
    const timezone = validated.timezone;

    // Fetch user's streak record
    const streak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: 0,
          currentStreak: 0,
          reason: 'no_streak_record',
        },
      };
    }

    // Check if user has freezes available
    if (streak.freezesAvailable <= 0) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: 0,
          currentStreak: streak.currentStreak,
          reason: 'no_freezes_available',
        },
      };
    }

    // Check if streak is actually at risk
    const todayStr = getDateInTimezone(new Date(), timezone);
    const lastMetStr = streak.lastGoalMetDate
      ? getDateInTimezone(streak.lastGoalMetDate, timezone)
      : null;

    // If goal was met today, streak is not at risk
    if (lastMetStr === todayStr) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: streak.freezesAvailable,
          currentStreak: streak.currentStreak,
          reason: 'streak_not_at_risk',
        },
      };
    }

    // Check yesterday
    const { start: yesterdayStart, end: yesterdayEnd } = getYesterdayBounds(timezone);
    const yesterdayStr = getDateInTimezone(yesterdayStart, timezone);

    // If yesterday's goal was met, not at risk
    if (lastMetStr === yesterdayStr) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: streak.freezesAvailable,
          currentStreak: streak.currentStreak,
          reason: 'streak_not_at_risk',
        },
      };
    }

    // Check if yesterday is already frozen (idempotency)
    const yesterdayProgress = await prisma.dailyProgress.findFirst({
      where: {
        userId,
        date: { gte: yesterdayStart, lt: yesterdayEnd },
        freezeUsed: true,
      },
    });

    if (yesterdayProgress) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: streak.freezesAvailable,
          currentStreak: streak.currentStreak,
          reason: 'already_frozen',
        },
      };
    }

    // Streak must have something to protect
    if (streak.currentStreak <= 0) {
      return {
        success: true,
        data: {
          freezeApplied: false,
          freezesRemaining: streak.freezesAvailable,
          currentStreak: streak.currentStreak,
          reason: 'streak_not_at_risk',
        },
      };
    }

    // Apply freeze: mark yesterday as frozen and decrement freezes
    const yesterdayMidnightUTC = new Date(`${yesterdayStr}T00:00:00.000Z`);
    const newFreezesAvailable = streak.freezesAvailable - 1;

    await prisma.$transaction([
      prisma.dailyProgress.upsert({
        where: { userId_date: { userId, date: yesterdayMidnightUTC } },
        create: {
          userId,
          date: yesterdayMidnightUTC,
          minutesRead: 0,
          goalMet: false,
          freezeUsed: true,
        },
        update: {
          freezeUsed: true,
        },
      }),
      prisma.userStreak.update({
        where: { userId },
        data: {
          freezesAvailable: newFreezesAvailable,
          freezeUsedToday: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        freezeApplied: true,
        freezesRemaining: newFreezesAvailable,
        currentStreak: streak.currentStreak,
        reason: 'freeze_applied',
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('Failed to apply streak freeze:', error);
    return { success: false, error: 'Failed to apply streak freeze' };
  }
}
