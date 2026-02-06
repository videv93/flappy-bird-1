'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const setDailyGoalSchema = z.object({
  dailyGoalMinutes: z.number().int().min(1).max(480),
});

export type SetDailyGoalInput = z.infer<typeof setDailyGoalSchema>;
export type SetDailyGoalResult = { dailyGoalMinutes: number };

/**
 * Set or update the user's daily reading goal (in minutes).
 * Valid range: 1–480 minutes.
 */
export async function setDailyGoal(
  input: SetDailyGoalInput
): Promise<ActionResult<SetDailyGoalResult>> {
  try {
    const validated = setDailyGoalSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to set a goal' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { dailyGoalMinutes: validated.dailyGoalMinutes },
    });

    return {
      success: true,
      data: { dailyGoalMinutes: validated.dailyGoalMinutes },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid goal value' };
    }
    console.error('Failed to set daily goal:', error);
    return { success: false, error: 'Failed to set daily goal' };
  }
}
