'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult, UserBookStatus } from './types';

/**
 * Check if a book is in the user's library and return its status.
 * Accepts ISBN-10 or ISBN-13 as identifier.
 */
export async function getUserBookStatus(
  isbn: string
): Promise<ActionResult<UserBookStatus>> {
  try {
    // Get authenticated user
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // If not authenticated, book is not in library
    if (!session?.user?.id) {
      return { success: true, data: { isInLibrary: false } };
    }

    // Find book by ISBN (check both isbn10 and isbn13)
    const book = await prisma.book.findFirst({
      where: {
        OR: [{ isbn10: isbn }, { isbn13: isbn }],
      },
    });

    // If book doesn't exist in our database, it's not in any library
    if (!book) {
      return { success: true, data: { isInLibrary: false } };
    }

    // Check if user has this book in their library
    const userBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: book.id,
        },
      },
      include: {
        book: true,
      },
    });

    // If no UserBook record, book is not in user's library
    if (!userBook) {
      return { success: true, data: { isInLibrary: false } };
    }

    // Return the user's book status
    return {
      success: true,
      data: {
        isInLibrary: true,
        status: userBook.status,
        progress: userBook.progress,
        userBook,
      },
    };
  } catch (error) {
    console.error('Failed to get user book status:', error);
    return { success: false, error: 'Failed to check library status' };
  }
}

/**
 * Batch check multiple books' library status.
 * More efficient than checking one by one.
 */
export async function getBatchUserBookStatus(
  isbns: string[]
): Promise<ActionResult<Map<string, UserBookStatus>>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Initialize result map with all books not in library
    const result = new Map<string, UserBookStatus>();
    isbns.forEach((isbn) => {
      result.set(isbn, { isInLibrary: false });
    });

    if (!session?.user?.id || isbns.length === 0) {
      return { success: true, data: result };
    }

    // Find all books by ISBNs
    const books = await prisma.book.findMany({
      where: {
        OR: [{ isbn10: { in: isbns } }, { isbn13: { in: isbns } }],
      },
    });

    if (books.length === 0) {
      return { success: true, data: result };
    }

    // Get user's books for found books
    const userBooks = await prisma.userBook.findMany({
      where: {
        userId: session.user.id,
        bookId: { in: books.map((b) => b.id) },
      },
      include: {
        book: true,
      },
    });

    // Map results back to ISBNs
    userBooks.forEach((userBook) => {
      const isbn = userBook.book.isbn13 || userBook.book.isbn10;
      if (isbn) {
        result.set(isbn, {
          isInLibrary: true,
          status: userBook.status,
          progress: userBook.progress,
          userBook,
        });
      }
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get batch user book status:', error);
    return { success: false, error: 'Failed to check library status' };
  }
}
