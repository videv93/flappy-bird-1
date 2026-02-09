'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type SearchUsersInput = z.input<typeof searchUsersSchema>;

export interface UserSearchResult {
  id: string;
  name: string | null;
  bio: string | null;
  bioRemovedAt: Date | null;
  avatarUrl: string | null;
  image: string | null;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export async function searchUsers(
  input: SearchUsersInput
): Promise<ActionResult<{ users: UserSearchResult[]; total: number }>> {
  try {
    const { query, limit, offset } = searchUsersSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const where = {
      id: { not: session.user.id },
      name: { contains: query, mode: 'insensitive' as const },
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          bio: true,
          bioRemovedAt: true,
          avatarUrl: true,
          image: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Get follow status for all returned users in one query
    const followRecords = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: users.map((u) => u.id) },
      },
      select: { followingId: true },
    });

    const followingSet = new Set(followRecords.map((f) => f.followingId));

    const results: UserSearchResult[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      bio: user.bio,
      bioRemovedAt: user.bioRemovedAt,
      avatarUrl: user.avatarUrl,
      image: user.image,
      isFollowing: followingSet.has(user.id),
      followerCount: user._count.followers,
      followingCount: user._count.following,
    }));

    return { success: true, data: { users: results, total } };
  } catch {
    return { success: false, error: 'Failed to search users' };
  }
}
