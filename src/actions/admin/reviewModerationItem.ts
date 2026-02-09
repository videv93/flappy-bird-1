'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { reviewModerationItemSchema } from '@/lib/validation/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ModerationItem } from '@prisma/client';

const ACTION_TO_STATUS = {
  dismiss: 'DISMISSED',
  warn: 'WARNED',
  remove: 'REMOVED',
  suspend: 'SUSPENDED',
} as const;

export async function reviewModerationItem(
  input: unknown
): Promise<ActionResult<ModerationItem>> {
  try {
    const validated = reviewModerationItemSchema.parse(input);

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
      where: { id: validated.moderationItemId },
    });

    if (!item) {
      return { success: false, error: 'Moderation item not found' };
    }

    if (item.status !== 'PENDING') {
      return { success: false, error: 'This item has already been reviewed' };
    }

    const newStatus = ACTION_TO_STATUS[validated.action];

    const [updatedItem] = await prisma.$transaction([
      prisma.moderationItem.update({
        where: { id: validated.moderationItemId },
        data: {
          status: newStatus,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          adminNotes: validated.adminNotes ?? null,
        },
      }),
      prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          actionType: 'REVIEW_MODERATION',
          targetId: validated.moderationItemId,
          targetType: 'ModerationItem',
          details: {
            action: validated.action,
            contentType: item.contentType,
            contentId: item.contentId,
            reportedUserId: item.reportedUserId,
          } as object,
        },
      }),
    ]);

    return { success: true, data: updatedItem };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('reviewModerationItem error:', error);
    return { success: false, error: 'Failed to review moderation item' };
  }
}
