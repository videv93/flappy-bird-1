'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTodayBounds } from '@/lib/dates';
import type { ActionResult } from '@/actions/books/types';

const getDailyProgressSchema = z.object({
  timezone: z.string().optional().default('UTC'),
});

export type GetDailyProgressInput = z.input<typeof getDailyProgressSchema>;

export type DailyProgressResult = {
  minutesRead: number;
  goalMinutes: number | null;
  goalMet: boolean;
};

/**
 * Get the user's daily reading progress for today.
 * Sums all ReadingSession durations for the current day in the given timezone.
 */
export async function getDailyProgress(
  input?: GetDailyProgressInput
): Promise<ActionResult<DailyProgressResult>> {
  try {
    const validated = getDailyProgressSchema.parse(input ?? {});

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view progress' };
    }

    // Fetch user's goal
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dailyGoalMinutes: true },
    });

    const goalMinutes = user?.dailyGoalMinutes ?? null;

    // Get today's bounds in UTC based on user's timezone
    const { start, end } = getTodayBounds(validated.timezone);

    // Aggregate today's reading sessions
    const result = await prisma.readingSession.aggregate({
      _sum: { duration: true },
      where: {
        userId: session.user.id,
        startedAt: { gte: start, lt: end },
      },
    });

    const totalSeconds = result._sum.duration ?? 0;
    const minutesRead = Math.round(totalSeconds / 60);
    const goalMet = goalMinutes !== null && minutesRead >= goalMinutes;

    return {
      success: true,
      data: { minutesRead, goalMinutes, goalMet },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('Failed to get daily progress:', error);
    return { success: false, error: 'Failed to get daily progress' };
  }
}
