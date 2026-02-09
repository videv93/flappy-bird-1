'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ContentType, ModerationStatus } from '@prisma/client';

export interface ModerationItemDetail {
  id: string;
  contentType: ContentType;
  contentId: string;
  reason: string;
  status: ModerationStatus;
  adminNotes: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reporter: { id: string; name: string | null; image: string | null };
  reportedUser: { id: string; name: string | null; image: string | null };
  reviewer: { id: string; name: string | null } | null;
  reportedUserFlagCount: number;
}

export async function getModerationItemDetail(
  moderationItemId: string
): Promise<ActionResult<ModerationItemDetail>> {
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

    const item = await prisma.moderationItem.findUnique({
      where: { id: moderationItemId },
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        reportedUser: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      return { success: false, error: 'Moderation item not found' };
    }

    const reportedUserFlagCount = await prisma.moderationItem.count({
      where: { reportedUserId: item.reportedUserId },
    });

    return {
      success: true,
      data: { ...item, reportedUserFlagCount },
    };
  } catch (error) {
    console.error('getModerationItemDetail error:', error);
    return { success: false, error: 'Failed to fetch moderation item detail' };
  }
}
