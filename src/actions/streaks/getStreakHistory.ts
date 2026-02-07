'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const GetStreakHistorySchema = z.object({
  timezone: z.string().default('UTC'),
  days: z.number().int().positive().default(90),
});

export type GetStreakHistoryInput = z.input<typeof GetStreakHistorySchema>;

export type StreakHistoryDay = {
  date: string;
  minutesRead: number;
  goalMet: boolean;
  freezeUsed: boolean;
};

export type StreakHistoryData = {
  history: StreakHistoryDay[];
  currentStreak: number;
  longestStreak: number;
  dailyGoalMinutes: number | null;
};

export async function getStreakHistory(
  input?: GetStreakHistoryInput
): Promise<ActionResult<StreakHistoryData>> {
  try {
    const { timezone, days } = GetStreakHistorySchema.parse(input ?? {});

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view streak history' };
    }

    const userId = session.user.id;

    // Calculate start date using user's timezone for correct date range
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const startDate = new Date(`${todayStr}T00:00:00.000Z`);
    startDate.setUTCDate(startDate.getUTCDate() - days);

    // Run all queries in parallel for better latency
    const [progressRecords, streak, user] = await Promise.all([
      prisma.dailyProgress.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          minutesRead: true,
          goalMet: true,
          freezeUsed: true,
        },
      }),
      prisma.userStreak.findUnique({
        where: { userId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoalMinutes: true },
      }),
    ]);

    // Convert to history format — DailyProgress.date is stored as midnight UTC
    // representing the user's local date, so extract YYYY-MM-DD from UTC directly
    const history: StreakHistoryDay[] = progressRecords.map((record) => ({
      date: record.date.toISOString().split('T')[0],
      minutesRead: record.minutesRead,
      goalMet: record.goalMet,
      freezeUsed: record.freezeUsed,
    }));

    return {
      success: true,
      data: {
        history,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        dailyGoalMinutes: user?.dailyGoalMinutes ?? null,
      },
    };
  } catch (error) {
    console.error('Failed to get streak history:', error);
    return { success: false, error: 'Failed to get streak history' };
  }
}
