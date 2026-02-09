'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getPusher } from '@/lib/pusher-server';
import { restoreContentSchema } from '@/lib/validation/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ContentRemoval } from '@prisma/client';

const RESTORE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function restoreContent(
  input: unknown
): Promise<ActionResult<ContentRemoval>> {
  try {
    const validated = restoreContentSchema.parse(input);

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

    const removal = await prisma.contentRemoval.findUnique({
      where: { id: validated.contentRemovalId },
      include: { moderationItem: true },
    });

    if (!removal) {
      return { success: false, error: 'Content removal not found' };
    }

    if (removal.restoredAt) {
      return { success: false, error: 'Content has already been restored' };
    }

    // Check 24-hour window
    const elapsed = Date.now() - removal.removedAt.getTime();
    if (elapsed > RESTORE_WINDOW_MS) {
      return { success: false, error: 'Restore window has expired (24 hours)' };
    }

    const item = removal.moderationItem;

    // Build content restore operation based on content type
    const contentRestoreOp =
      item.contentType === 'PROFILE_BIO'
        ? prisma.user.update({
            where: { id: item.contentId },
            data: {
              bio: removal.originalContent,
              bioRemovedAt: null,
            },
          })
        : item.contentType === 'READING_ROOM_DESCRIPTION'
          ? prisma.book.update({
              where: { id: item.contentId },
              data: { description: removal.originalContent },
            })
          : null;

    // Atomic transaction: restore content, update removal, reset moderation status, log action
    const [updatedRemoval] = await prisma.$transaction([
      prisma.contentRemoval.update({
        where: { id: removal.id },
        data: {
          restoredAt: new Date(),
          restoredById: session.user.id,
        },
      }),
      prisma.moderationItem.update({
        where: { id: item.id },
        data: { status: 'PENDING' },
      }),
      prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          actionType: 'RESTORE_CONTENT',
          targetId: removal.id,
          targetType: 'ContentRemoval',
          details: {
            moderationItemId: item.id,
            contentType: item.contentType,
            contentId: item.contentId,
            reportedUserId: item.reportedUserId,
            reason: validated.reason ?? null,
          } as object,
        },
      }),
      ...(contentRestoreOp ? [contentRestoreOp] : []),
    ]);

    // Notify content owner
    try {
      const pusher = getPusher();
      await pusher?.trigger(
        `private-user-${item.reportedUserId}`,
        'moderation:content-restored',
        { contentType: item.contentType }
      );
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
    }

    return { success: true, data: updatedRemoval as ContentRemoval };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('restoreContent error:', error);
    return { success: false, error: 'Failed to restore content' };
  }
}
