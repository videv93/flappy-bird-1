'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const respondSchema = z.object({
  invitationId: z.string().min(1),
  response: z.enum(['ACCEPTED', 'DECLINED']),
});

export type RespondToBuddyReadInput = z.input<typeof respondSchema>;

export async function respondToBuddyReadInvitation(
  input: RespondToBuddyReadInput
): Promise<ActionResult<{ status: string }>> {
  try {
    const { invitationId, response } = respondSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch invitation and verify ownership
    const invitation = await prisma.buddyReadInvitation.findUnique({
      where: { id: invitationId },
      include: {
        buddyRead: {
          select: { bookId: true },
        },
      },
    });

    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.inviteeId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (invitation.status !== 'PENDING') {
      return { success: false, error: 'Invitation already responded to' };
    }

    // Update invitation status
    await prisma.buddyReadInvitation.update({
      where: { id: invitationId },
      data: { status: response },
    });

    // On accept, add book to invitee's library if not already present
    if (response === 'ACCEPTED') {
      const existing = await prisma.userBook.findUnique({
        where: {
          userId_bookId: {
            userId: session.user.id,
            bookId: invitation.buddyRead.bookId,
          },
        },
      });

      if (!existing) {
        await prisma.userBook.create({
          data: {
            userId: session.user.id,
            bookId: invitation.buddyRead.bookId,
            status: 'WANT_TO_READ',
          },
        });
      }
    }

    return { success: true, data: { status: response } };
  } catch {
    return { success: false, error: 'Failed to respond to invitation' };
  }
}
