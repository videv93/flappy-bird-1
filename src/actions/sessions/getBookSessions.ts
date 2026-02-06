'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ReadingSession } from '@prisma/client';
import type { ActionResult } from '@/actions/books/types';

const getBookSessionsSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type GetBookSessionsInput = z.input<typeof getBookSessionsSchema>;

export interface BookSessionsResult {
  sessions: ReadingSession[];
  nextCursor: string | null;
}

export async function getBookSessions(
  input: GetBookSessionsInput
): Promise<ActionResult<BookSessionsResult>> {
  try {
    const validated = getBookSessionsSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to view sessions' };
    }

    const sessions = await prisma.readingSession.findMany({
      where: {
        userId: session.user.id,
        bookId: validated.bookId,
      },
      orderBy: { startedAt: 'desc' },
      take: validated.limit + 1,
      ...(validated.cursor
        ? {
            skip: 1,
            cursor: { id: validated.cursor },
          }
        : {}),
    });

    let nextCursor: string | null = null;
    if (sessions.length > validated.limit) {
      const extra = sessions.pop()!;
      nextCursor = extra.id;
    }

    return { success: true, data: { sessions, nextCursor } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid request parameters' };
    }
    console.error('Failed to fetch book sessions:', error);
    return { success: false, error: 'Failed to fetch sessions' };
  }
}
