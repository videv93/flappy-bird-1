'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ReadingSession } from '@prisma/client';
import type { ActionResult } from '@/actions/books/types';

const saveSessionSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  duration: z.number().int().min(60, 'Sessions under 1 minute cannot be saved'),
  startedAt: z.string().datetime({ message: 'Invalid start time' }),
  endedAt: z.string().datetime({ message: 'Invalid end time' }),
});

export type SaveReadingSessionInput = z.infer<typeof saveSessionSchema>;

/**
 * Save a completed reading session to the database.
 * Validates minimum duration (60s), authenticates user,
 * and verifies the book is in the user's library.
 */
export async function saveReadingSession(
  input: SaveReadingSessionInput
): Promise<ActionResult<ReadingSession>> {
  try {
    const validated = saveSessionSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to save a session' };
    }

    // Verify the book exists in the user's library (not soft-deleted)
    const userBook = await prisma.userBook.findFirst({
      where: {
        userId: session.user.id,
        bookId: validated.bookId,
        deletedAt: null,
      },
    });

    if (!userBook) {
      return { success: false, error: 'Book not found in your library' };
    }

    const readingSession = await prisma.readingSession.create({
      data: {
        userId: session.user.id,
        bookId: validated.bookId,
        duration: validated.duration,
        startedAt: new Date(validated.startedAt),
        endedAt: new Date(validated.endedAt),
      },
    });

    return { success: true, data: readingSession };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const durationError = error.issues.find((e) => e.path.includes('duration'));
      if (durationError) {
        return { success: false, error: "Sessions under 1 minute aren't saved. Keep reading!" };
      }
      return { success: false, error: 'Invalid session data' };
    }
    console.error('Failed to save reading session:', error);
    return { success: false, error: 'Failed to save reading session' };
  }
}
