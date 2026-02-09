'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ContentType, ViolationType } from '@prisma/client';

const getUserRemovalHistorySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type GetUserRemovalHistoryInput = z.input<typeof getUserRemovalHistorySchema>;

export interface RemovalHistoryItem {
  id: string;
  violationType: ViolationType;
  adminNotes: string | null;
  removedAt: Date;
  restoredAt: Date | null;
  contentType: ContentType;
  removedBy: { id: string; name: string | null };
  restoredBy: { id: string; name: string | null } | null;
}

export interface UserRemovalHistoryResult {
  items: RemovalHistoryItem[];
  totalCount: number;
}

export async function getUserRemovalHistory(
  input: GetUserRemovalHistoryInput
): Promise<ActionResult<UserRemovalHistoryResult>> {
  try {
    const { userId } = getUserRemovalHistorySchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!adminUser || !isAdmin(adminUser)) {
      return { success: false, error: 'Forbidden' };
    }

    const where = {
      moderationItem: { reportedUserId: userId },
    };

    const [removals, totalCount] = await Promise.all([
      prisma.contentRemoval.findMany({
        where,
        orderBy: { removedAt: 'desc' },
        select: {
          id: true,
          violationType: true,
          adminNotes: true,
          removedAt: true,
          restoredAt: true,
          removedBy: { select: { id: true, name: true } },
          restoredBy: { select: { id: true, name: true } },
          moderationItem: { select: { contentType: true } },
        },
      }),
      prisma.contentRemoval.count({ where }),
    ]);

    const items: RemovalHistoryItem[] = removals.map((r) => ({
      id: r.id,
      violationType: r.violationType,
      adminNotes: r.adminNotes,
      removedAt: r.removedAt,
      restoredAt: r.restoredAt,
      contentType: r.moderationItem.contentType,
      removedBy: r.removedBy,
      restoredBy: r.restoredBy,
    }));

    return {
      success: true,
      data: { items, totalCount },
    };
  } catch (error) {
    console.error('getUserRemovalHistory error:', error);
    return { success: false, error: 'Failed to fetch removal history' };
  }
}
