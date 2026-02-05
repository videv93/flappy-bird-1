import type { Book, UserBook, ReadingStatus } from '@prisma/client';

/**
 * Standard action result type for server actions
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * UserBook with included Book relation
 */
export interface UserBookWithBook extends UserBook {
  book: Book;
}

/**
 * Status information for a user's book
 */
export interface UserBookStatus {
  isInLibrary: boolean;
  status?: ReadingStatus;
  progress?: number;
  userBook?: UserBookWithBook;
}

/**
 * Input type for adding a book to library
 */
export interface AddToLibraryInput {
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  coverUrl?: string;
  pageCount?: number;
  publishedYear?: number;
  description?: string;
  status: 'CURRENTLY_READING' | 'FINISHED' | 'WANT_TO_READ';
}
