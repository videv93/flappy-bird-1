'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

export interface FollowingUser {
  id: string;
  name: string | null;
  image: string | null;
}

export async function getFollowing(): Promise<ActionResult<FollowingUser[]>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: follows.map((f) => f.following),
    };
  } catch {
    return { success: false, error: 'Failed to fetch following list' };
  }
}
