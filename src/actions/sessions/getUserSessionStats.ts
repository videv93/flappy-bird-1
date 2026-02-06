'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

export interface SessionStats {
  totalSeconds: number;
  sessionCount: number;
  avgSeconds: number;
}

export async function getUserSessionStats(): Promise<ActionResult<SessionStats>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view stats' };
    }

    const stats = await prisma.readingSession.aggregate({
      where: { userId: session.user.id },
      _sum: { duration: true },
      _count: { id: true },
      _avg: { duration: true },
    });

    return {
      success: true,
      data: {
        totalSeconds: stats._sum.duration ?? 0,
        sessionCount: stats._count.id ?? 0,
        avgSeconds: Math.round(stats._avg.duration ?? 0),
      },
    };
  } catch (error) {
    console.error('Failed to fetch session stats:', error);
    return { success: false, error: 'Failed to fetch reading stats' };
  }
}
