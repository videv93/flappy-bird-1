'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayBounds, getYesterdayBounds, getDateInTimezone } from '@/lib/dates';
import { MAX_STREAK_FREEZES, FREEZE_MILESTONES } from '@/lib/config/constants';
import type { ActionResult } from '@/actions/books/types';

const updateStreakSchema = z.object({
  timezone: z.string().optional().default('UTC'),
});

export type UpdateStreakInput = z.input<typeof updateStreakSchema>;

export type StreakUpdateResult = {
  streakUpdated: boolean;
  currentStreak: number;
  longestStreak: number;
  wasReset: boolean;
  reason: 'goal_met_streak_incremented' | 'goal_met_streak_reset' | 'goal_not_met' | 'already_credited_today' | 'no_goal_set';
  message?: string;
  freezesEarned: number;
  freezesAvailable: number;
};

/**
 * Internal streak update logic — accepts userId directly to avoid double auth.
 * Called from saveReadingSession after successful save.
 */
export async function updateStreakInternal(
  userId: string,
  timezone: string
): Promise<StreakUpdateResult> {
  // Fetch user's goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyGoalMinutes: true },
  });

  if (!user?.dailyGoalMinutes) {
    return {
      streakUpdated: false,
      currentStreak: 0,
      longestStreak: 0,
      wasReset: false,
      reason: 'no_goal_set',
      freezesEarned: 0,
      freezesAvailable: 0,
    };
  }

  const goalMinutes = user.dailyGoalMinutes;

  // Aggregate today's reading sessions
  const { start: todayStart, end: todayEnd } = getTodayBounds(timezone);

  const result = await prisma.readingSession.aggregate({
    _sum: { duration: true },
    where: {
      userId,
      startedAt: { gte: todayStart, lt: todayEnd },
    },
  });

  const totalSeconds = result._sum.duration ?? 0;
  const minutesRead = Math.floor(totalSeconds / 60);

  if (minutesRead < goalMinutes) {
    return {
      streakUpdated: false,
      currentStreak: 0,
      longestStreak: 0,
      wasReset: false,
      reason: 'goal_not_met',
      freezesEarned: 0,
      freezesAvailable: 0,
    };
  }

  // Goal is met — now evaluate streak
  const existingStreak = await prisma.userStreak.findUnique({
    where: { userId },
  });

  const todayStr = getDateInTimezone(new Date(), timezone);

  // Idempotency: already credited today
  if (existingStreak?.lastGoalMetDate) {
    const lastMetStr = getDateInTimezone(existingStreak.lastGoalMetDate, timezone);
    if (lastMetStr === todayStr) {
      return {
        streakUpdated: false,
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        wasReset: false,
        reason: 'already_credited_today',
        freezesEarned: 0,
        freezesAvailable: existingStreak.freezesAvailable,
      };
    }
  }

  // Determine streak action
  const { start: yesterdayStart, end: yesterdayEnd } = getYesterdayBounds(timezone);
  const yesterdayStr = getDateInTimezone(new Date(yesterdayStart.getTime()), timezone);

  let shouldIncrement = false;

  if (existingStreak?.lastGoalMetDate) {
    const lastMetStr = getDateInTimezone(existingStreak.lastGoalMetDate, timezone);

    if (lastMetStr === yesterdayStr) {
      // Yesterday's goal was met — continue streak
      shouldIncrement = true;
    } else {
      // Check if yesterday had a freeze (via DailyProgress)
      const yesterdayProgress = await prisma.dailyProgress.findFirst({
        where: {
          userId,
          date: { gte: yesterdayStart, lt: yesterdayEnd },
          freezeUsed: true,
        },
      });

      if (yesterdayProgress) {
        // Yesterday was frozen — streak continues
        shouldIncrement = true;
      }
    }
  }

  // Calculate new streak values
  const previousStreak = existingStreak?.currentStreak ?? 0;
  const previousLongest = existingStreak?.longestStreak ?? 0;

  let newStreak: number;
  let wasReset = false;

  if (shouldIncrement) {
    newStreak = previousStreak + 1;
  } else {
    // Reset: this is day 1 of a new streak
    newStreak = 1;
    wasReset = previousStreak > 0;
  }

  const newLongest = Math.max(newStreak, previousLongest);

  // Calculate freeze earnings from milestone
  const currentFreezes = existingStreak?.freezesAvailable ?? 0;
  const freezesToAward = FREEZE_MILESTONES[newStreak] ?? 0;
  const newFreezesAvailable = Math.min(currentFreezes + freezesToAward, MAX_STREAK_FREEZES);

  // Store today's date as midnight UTC in user's timezone
  const todayMidnightUTC = new Date(`${todayStr}T00:00:00.000Z`);

  // Atomically update both tables
  await prisma.$transaction([
    prisma.userStreak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastGoalMetDate: todayMidnightUTC,
        freezesAvailable: newFreezesAvailable,
      },
      update: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastGoalMetDate: todayMidnightUTC,
        freezesAvailable: newFreezesAvailable,
      },
    }),
    prisma.dailyProgress.upsert({
      where: { userId_date: { userId, date: todayMidnightUTC } },
      create: {
        userId,
        date: todayMidnightUTC,
        minutesRead,
        goalMet: true,
      },
      update: {
        minutesRead,
        goalMet: true,
      },
    }),
  ]);

  // Build message
  let message: string | undefined;
  if (wasReset) {
    message = 'Fresh start! Day 1 of your new streak.';
  } else if (freezesToAward > 0 && newFreezesAvailable < currentFreezes + freezesToAward) {
    message = `Freeze bank full (${MAX_STREAK_FREEZES}/${MAX_STREAK_FREEZES})`;
  } else if (freezesToAward > 0) {
    message = `You earned ${freezesToAward} streak freeze${freezesToAward > 1 ? 's' : ''}!`;
  }

  return {
    streakUpdated: true,
    currentStreak: newStreak,
    longestStreak: newLongest,
    wasReset,
    reason: wasReset ? 'goal_met_streak_reset' : 'goal_met_streak_incremented',
    message,
    freezesEarned: freezesToAward,
    freezesAvailable: newFreezesAvailable,
  };
}

/**
 * Public server action: Update streak when daily reading goal is met.
 * Authenticates user and delegates to updateStreakInternal.
 */
export async function updateStreakOnGoalMet(
  input?: UpdateStreakInput
): Promise<ActionResult<StreakUpdateResult>> {
  try {
    const validated = updateStreakSchema.parse(input ?? {});

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to update streak' };
    }

    const result = await updateStreakInternal(session.user.id, validated.timezone);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('Failed to update streak:', error);
    return { success: false, error: 'Failed to update streak' };
  }
}
