'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { flagContentSchema } from '@/lib/validation/admin';
import type { ActionResult } from '@/actions/books/types';
import type { ModerationItem } from '@prisma/client';

export async function flagContent(input: unknown): Promise<ActionResult<ModerationItem>> {
  try {
    const validated = flagContentSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Determine the reported user based on content type
    let reportedUserId: string | null = null;

    if (validated.contentType === 'PROFILE_BIO') {
      const targetUser = await prisma.user.findUnique({
        where: { id: validated.contentId },
        select: { id: true },
      });
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }
      reportedUserId = targetUser.id;

      // Prevent self-flagging
      if (reportedUserId === session.user.id) {
        return { success: false, error: 'You cannot flag your own content' };
      }
    } else if (validated.contentType === 'READING_ROOM_DESCRIPTION') {
      // For reading room descriptions, contentId is the bookId
      const book = await prisma.book.findUnique({
        where: { id: validated.contentId },
        select: { id: true },
      });
      if (!book) {
        return { success: false, error: 'Content not found' };
      }
      // Reading room descriptions don't have a specific user owner yet
      // Use a placeholder - the admin will identify the user from context
      reportedUserId = 'system';
    }

    if (!reportedUserId) {
      return { success: false, error: 'Invalid content type' };
    }

    // Check for duplicate flag
    const existingFlag = await prisma.moderationItem.findUnique({
      where: {
        reporterId_contentType_contentId: {
          reporterId: session.user.id,
          contentType: validated.contentType,
          contentId: validated.contentId,
        },
      },
    });

    if (existingFlag) {
      return { success: false, error: 'You have already reported this content' };
    }

    const moderationItem = await prisma.moderationItem.create({
      data: {
        contentType: validated.contentType,
        contentId: validated.contentId,
        reporterId: session.user.id,
        reportedUserId,
        reason: validated.reason,
      },
    });

    return { success: true, data: moderationItem };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return { success: false, error: 'Invalid input' };
    }
    console.error('flagContent error:', error);
    return { success: false, error: 'Failed to submit report' };
  }
}
