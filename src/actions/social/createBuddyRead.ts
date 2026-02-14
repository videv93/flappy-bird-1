'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const createBuddyReadSchema = z.object({
  bookId: z.string().min(1),
  inviteeId: z.string().min(1),
});

export type CreateBuddyReadInput = z.input<typeof createBuddyReadSchema>;

export async function createBuddyRead(
  input: CreateBuddyReadInput
): Promise<ActionResult<{ buddyReadId: string; invitationId: string }>> {
  try {
    const { bookId, inviteeId } = createBuddyReadSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (session.user.id === inviteeId) {
      return { success: false, error: 'Cannot invite yourself to a buddy read' };
    }

    // Verify inviter follows the invitee (prevent spam)
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: inviteeId,
        },
      },
    });
    if (!follow) {
      return { success: false, error: 'You can only invite users you follow' };
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    // Create buddy read and invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const buddyRead = await tx.buddyRead.create({
        data: {
          creatorId: session.user.id,
          bookId,
        },
      });

      const invitation = await tx.buddyReadInvitation.create({
        data: {
          buddyReadId: buddyRead.id,
          inviterId: session.user.id,
          inviteeId,
        },
      });

      return { buddyReadId: buddyRead.id, invitationId: invitation.id };
    });

    return { success: true, data: result };
  } catch {
    return { success: false, error: 'Failed to create buddy read' };
  }
}
