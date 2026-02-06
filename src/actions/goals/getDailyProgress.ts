'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
 * Compute today's start and end in the given timezone, returned as UTC Dates.
 */
function getTodayBounds(timezone: string): { start: Date; end: Date } {
  const now = new Date();

  // Format the current date in the target timezone to get YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // "2026-02-06"

  // Parse into midnight in the target timezone by creating a date string
  // with the timezone offset. We use a temporary Date to find the offset.
  const midnightLocal = new Date(`${todayStr}T00:00:00`);

  // Get the offset for the target timezone at this date
  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(midnightLocal);

  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(midnightLocal);

  // Build dates from parts for comparison
  const getPartValue = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  const utcHour = getPartValue(utcParts, 'hour');
  const tzHour = getPartValue(tzParts, 'hour');
  const utcDay = getPartValue(utcParts, 'day');
  const tzDay = getPartValue(tzParts, 'day');

  // Calculate offset in hours (approximate, handles most cases)
  let offsetHours = tzHour - utcHour;
  if (tzDay > utcDay) offsetHours += 24;
  if (tzDay < utcDay) offsetHours -= 24;

  // Today's start in UTC = midnight in TZ converted to UTC
  const start = new Date(`${todayStr}T00:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - offsetHours);

  // Today's end = start + 24 hours
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

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
    const minutesRead = Math.floor(totalSeconds / 60);
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
