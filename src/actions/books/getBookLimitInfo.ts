'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { isPremium } from '@/lib/premium';
import { FREE_TIER_BOOK_LIMIT } from '@/lib/config/constants';
import type { ActionResult } from './types';

export interface BookLimitInfo {
  isPremium: boolean;
  currentBookCount: number;
  maxBooks: number;
}

export async function getBookLimitInfo(): Promise<ActionResult<BookLimitInfo>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const [userIsPremium, currentBookCount] = await Promise.all([
      isPremium(session.user.id),
      prisma.userBook.count({
        where: { userId: session.user.id, deletedAt: null },
      }),
    ]);

    return {
      success: true,
      data: {
        isPremium: userIsPremium,
        currentBookCount,
        maxBooks: FREE_TIER_BOOK_LIMIT,
      },
    };
  } catch (error) {
    console.error('Failed to fetch book limit info:', error);
    return { success: false, error: 'Failed to load book limit info' };
  }
}
