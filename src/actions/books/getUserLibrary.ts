'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { ActionResult, UserBookWithBook } from './types';

export interface LibraryData {
  books: UserBookWithBook[];
  readerCounts: Record<string, { total: number; reading: number }>;
}

export async function getUserLibrary(): Promise<ActionResult<LibraryData>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const books = await prisma.userBook.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Batch fetch reader counts for all books
    const bookIds = books.map((ub) => ub.bookId);
    const readerCounts: Record<string, { total: number; reading: number }> = {};

    if (bookIds.length > 0) {
      const [totalCounts, readingCounts] = await Promise.all([
        prisma.userBook.groupBy({
          by: ['bookId'],
          where: { bookId: { in: bookIds }, deletedAt: null },
          _count: true,
        }),
        prisma.userBook.groupBy({
          by: ['bookId'],
          where: {
            bookId: { in: bookIds },
            status: 'CURRENTLY_READING',
            deletedAt: null,
          },
          _count: true,
        }),
      ]);

      totalCounts.forEach((c) => {
        readerCounts[c.bookId] = { total: c._count, reading: 0 };
      });
      readingCounts.forEach((c) => {
        if (readerCounts[c.bookId]) {
          readerCounts[c.bookId].reading = c._count;
        }
      });
    }

    return { success: true, data: { books, readerCounts } };
  } catch (error) {
    console.error('Failed to fetch user library:', error);
    return { success: false, error: 'Failed to load library' };
  }
}
