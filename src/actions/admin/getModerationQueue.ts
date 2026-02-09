'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ContentType, ModerationStatus } from '@prisma/client';

export interface ModerationQueueItem {
  id: string;
  contentType: ContentType;
  contentId: string;
  reason: string;
  status: ModerationStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  reporter: { id: string; name: string | null; image: string | null };
  reportedUser: { id: string; name: string | null; image: string | null };
  contentRemoval: { id: string; removedAt: Date } | null;
}

export interface ModerationQueueResult {
  items: ModerationQueueItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface GetModerationQueueInput {
  page?: number;
  pageSize?: number;
  contentType?: ContentType;
  status?: ModerationStatus;
}

export async function getModerationQueue(
  input?: GetModerationQueueInput
): Promise<ActionResult<ModerationQueueResult>> {
  try {
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

    const page = input?.page ?? 1;
    const pageSize = input?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (input?.contentType) where.contentType = input.contentType;
    if (input?.status) {
      where.status = input.status;
    } else {
      where.status = 'PENDING';
    }

    const [items, totalCount] = await Promise.all([
      prisma.moderationItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          reporter: { select: { id: true, name: true, image: true } },
          reportedUser: { select: { id: true, name: true, image: true } },
          contentRemoval: { select: { id: true, removedAt: true } },
        },
      }),
      prisma.moderationItem.count({ where }),
    ]);

    return {
      success: true,
      data: { items, totalCount, page, pageSize },
    };
  } catch (error) {
    console.error('getModerationQueue error:', error);
    return { success: false, error: 'Failed to fetch moderation queue' };
  }
}
