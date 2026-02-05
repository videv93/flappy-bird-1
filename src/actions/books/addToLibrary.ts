'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Book, ReadingStatus } from '@prisma/client';
import type { ActionResult, UserBookWithBook } from './types';

// Input validation schema
const addToLibrarySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.array(z.string()).min(1, 'At least one author is required'),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  pageCount: z.number().int().positive().optional(),
  publishedYear: z.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(['CURRENTLY_READING', 'FINISHED', 'WANT_TO_READ']),
});

export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;

/**
 * Add a book to the user's library with the specified reading status.
 * Creates the Book record if it doesn't exist (upsert by ISBN).
 */
export async function addToLibrary(
  input: AddToLibraryInput
): Promise<ActionResult<UserBookWithBook>> {
  try {
    // Get authenticated user
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to add books' };
    }

    // Validate input
    const validated = addToLibrarySchema.parse(input);

    // Clean empty coverUrl
    const coverUrl = validated.coverUrl || undefined;

    // Determine upsert strategy based on available ISBNs
    const bookWhere = validated.isbn13
      ? { isbn13: validated.isbn13 }
      : validated.isbn10
        ? { isbn10: validated.isbn10 }
        : undefined;

    let book: Book;

    if (bookWhere) {
      // Upsert book by ISBN
      book = await prisma.book.upsert({
        where: bookWhere,
        create: {
          isbn10: validated.isbn10,
          isbn13: validated.isbn13,
          title: validated.title,
          author: validated.authors.join(', '),
          coverUrl,
          pageCount: validated.pageCount,
          publishedYear: validated.publishedYear,
          description: validated.description,
        },
        update: {
          // Update fields that might have been missing before
          coverUrl: coverUrl ?? undefined,
          pageCount: validated.pageCount ?? undefined,
          description: validated.description ?? undefined,
        },
      });
    } else {
      // No ISBN available - create new book (rare case)
      book = await prisma.book.create({
        data: {
          title: validated.title,
          author: validated.authors.join(', '),
          coverUrl,
          pageCount: validated.pageCount,
          publishedYear: validated.publishedYear,
          description: validated.description,
        },
      });
    }

    // Check if user already has this book
    const existingUserBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: book.id,
        },
      },
    });

    if (existingUserBook) {
      return { success: false, error: 'This book is already in your library' };
    }

    // Create UserBook record
    const userBook = await prisma.userBook.create({
      data: {
        userId: session.user.id,
        bookId: book.id,
        status: validated.status as ReadingStatus,
        progress: validated.status === 'FINISHED' ? 100 : 0,
        dateFinished: validated.status === 'FINISHED' ? new Date() : null,
      },
      include: {
        book: true,
      },
    });

    return { success: true, data: userBook };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid book data' };
    }
    console.error('Failed to add book to library:', error);
    return { success: false, error: 'Failed to add book to library' };
  }
}
