'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastGoalMetDate: string | null;
  freezeUsedToday: boolean;
  freezesAvailable: number;
};

/**
 * Get the user's current streak data.
 * Returns default values if no UserStreak record exists yet.
 */
export async function getStreakData(): Promise<ActionResult<StreakData>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view streak data' };
    }

    const streak = await prisma.userStreak.findUnique({
      where: { userId: session.user.id },
    });

    if (!streak) {
      return {
        success: true,
        data: {
          currentStreak: 0,
          longestStreak: 0,
          lastGoalMetDate: null,
          freezeUsedToday: false,
          freezesAvailable: 0,
        },
      };
    }

    return {
      success: true,
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastGoalMetDate: streak.lastGoalMetDate?.toISOString() ?? null,
        freezeUsedToday: streak.freezeUsedToday,
        freezesAvailable: streak.freezesAvailable,
      },
    };
  } catch (error) {
    console.error('Failed to get streak data:', error);
    return { success: false, error: 'Failed to get streak data' };
  }
}
