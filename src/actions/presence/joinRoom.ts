'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';
import type { RoomPresence } from '@prisma/client';

const joinRoomSchema = z.object({
  bookId: z.string().min(1),
});

export async function joinRoom(bookId: string): Promise<ActionResult<RoomPresence>> {
  try {
    const validated = joinRoomSchema.parse({ bookId });

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Use transaction to prevent duplicate active presences under concurrent requests.
    // NOTE: The @@unique([userId, bookId, leftAt]) constraint does NOT prevent duplicates
    // when leftAt is NULL because PostgreSQL treats NULL != NULL in unique indexes.
    const presence = await prisma.$transaction(async (tx) => {
      const existing = await tx.roomPresence.findFirst({
        where: {
          userId: session.user.id,
          bookId: validated.bookId,
          leftAt: null,
        },
      });

      if (existing) {
        return tx.roomPresence.update({
          where: { id: existing.id },
          data: { lastActiveAt: new Date() },
        });
      }

      return tx.roomPresence.create({
        data: {
          userId: session.user.id,
          bookId: validated.bookId,
        },
      });
    });

    return { success: true, data: presence };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid book ID' };
    }
    return { success: false, error: 'Failed to join room' };
  }
}
