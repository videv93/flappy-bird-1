'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getPusher } from '@/lib/pusher-server';
import { removeContentSchema } from '@/lib/validation/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ContentRemoval } from '@prisma/client';

export async function removeContent(
  input: unknown
): Promise<ActionResult<ContentRemoval>> {
  try {
    const validated = removeContentSchema.parse(input);

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

    if (item.status !== 'PENDING' && item.status !== 'REMOVED') {
      return { success: false, error: 'This item has already been reviewed' };
    }

    // Read original content based on content type
    let originalContent = '';

    if (item.contentType === 'PROFILE_BIO') {
      const user = await prisma.user.findUnique({
        where: { id: item.contentId },
        select: { bio: true },
      });
      originalContent = user?.bio ?? '';
    } else if (item.contentType === 'READING_ROOM_DESCRIPTION') {
      const book = await prisma.book.findUnique({
        where: { id: item.contentId },
        select: { description: true },
      });
      originalContent = book?.description ?? '';
    }

    // Build soft-delete operation based on content type
    const contentDeleteOp =
      item.contentType === 'PROFILE_BIO'
        ? prisma.user.update({
            where: { id: item.contentId },
            data: { bioRemovedAt: new Date() },
          })
        : item.contentType === 'READING_ROOM_DESCRIPTION'
          ? prisma.book.update({
              where: { id: item.contentId },
              data: { description: null },
            })
          : null;

    // Atomic transaction: create ContentRemoval, update ModerationItem, soft-delete content, log AdminAction
    const [contentRemoval] = await prisma.$transaction([
      prisma.contentRemoval.create({
        data: {
          moderationItemId: item.id,
          violationType: validated.violationType,
          adminNotes: validated.adminNotes ?? null,
          removedById: session.user.id,
          originalContent,
        },
      }),
      prisma.moderationItem.update({
        where: { id: item.id },
        data: {
          status: 'REMOVED',
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          adminNotes: validated.adminNotes ?? null,
        },
      }),
      prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          actionType: 'REMOVE_CONTENT',
          targetId: item.id,
          targetType: 'ModerationItem',
          details: {
            violationType: validated.violationType,
            contentType: item.contentType,
            contentId: item.contentId,
            reportedUserId: item.reportedUserId,
          } as object,
        },
      }),
      ...(contentDeleteOp ? [contentDeleteOp] : []),
    ]);

    // Send notification to content owner
    try {
      const pusher = getPusher();
      await pusher?.trigger(
        `private-user-${item.reportedUserId}`,
        'moderation:content-removed',
        {
          contentType: item.contentType,
          violationType: validated.violationType,
        }
      );
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
    }

    return { success: true, data: contentRemoval as ContentRemoval };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('removeContent error:', error);
    return { success: false, error: 'Failed to remove content' };
  }
}
