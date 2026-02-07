'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDayBounds } from '@/lib/dates';
import type { ActionResult } from '@/actions/books/types';

const GetDayDetailSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  timezone: z.string().default('UTC'),
});

export type GetDayDetailInput = z.input<typeof GetDayDetailSchema>;

export type DayDetailData = {
  date: string;
  minutesRead: number;
  goalMinutes: number | null;
  goalMet: boolean;
  freezeUsed: boolean;
  sessionCount: number;
};

export async function getDayDetail(
  input: GetDayDetailInput
): Promise<ActionResult<DayDetailData>> {
  try {
    const { date, timezone } = GetDayDetailSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view day details' };
    }

    const userId = session.user.id;

    // DailyProgress.date is stored as midnight UTC representing the user's local date
    const targetDateUTC = new Date(`${date}T00:00:00.000Z`);

    // ReadingSession.startedAt is an actual UTC timestamp, so use timezone-aware bounds
    const { start, end } = getDayBounds(timezone, new Date(`${date}T12:00:00Z`));

    // Run all queries in parallel for better latency
    const [progress, sessionCount, user] = await Promise.all([
      prisma.dailyProgress.findFirst({
        where: {
          userId,
          date: targetDateUTC,
        },
      }),
      prisma.readingSession.count({
        where: {
          userId,
          startedAt: { gte: start, lt: end },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoalMinutes: true },
      }),
    ]);

    return {
      success: true,
      data: {
        date,
        minutesRead: progress?.minutesRead ?? 0,
        goalMinutes: user?.dailyGoalMinutes ?? null,
        goalMet: progress?.goalMet ?? false,
        freezeUsed: progress?.freezeUsed ?? false,
        sessionCount,
      },
    };
  } catch (error) {
    console.error('Failed to get day detail:', error);
    return { success: false, error: 'Failed to get day detail' };
  }
}
