'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const leaveRoomSchema = z.object({
  bookId: z.string().min(1),
});

export async function leaveRoom(bookId: string): Promise<ActionResult<{ leftAt: Date }>> {
  try {
    const validated = leaveRoomSchema.parse({ bookId });

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const existing = await prisma.roomPresence.findFirst({
      where: {
        userId: session.user.id,
        bookId: validated.bookId,
        leftAt: null,
      },
    });

    if (!existing) {
      return { success: false, error: 'Not in this room' };
    }

    const now = new Date();
    await prisma.roomPresence.update({
      where: { id: existing.id },
      data: { leftAt: now },
    });

    return { success: true, data: { leftAt: now } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid book ID' };
    }
    return { success: false, error: 'Failed to leave room' };
  }
}
