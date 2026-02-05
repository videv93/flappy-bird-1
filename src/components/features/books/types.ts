import { BookOpen, CheckCircle, BookMarked, type LucideIcon } from 'lucide-react';

// Re-export types from services for component usage
export type { BookSearchResult, BookSearchResponse } from '@/services/books/types';

// Re-export Prisma types commonly used in book components
export type { ReadingStatus, Book, UserBook } from '@prisma/client';

// Re-export action types
export type {
  ActionResult,
  UserBookWithBook,
  UserBookStatus,
} from '@/actions/books/types';

// Component-specific types
export type SearchState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

/**
 * Reading status configuration with labels and icons
 * Shared across AddToLibraryButton and ReadingStatusSelector
 */
export const READING_STATUS_OPTIONS = [
  { value: 'CURRENTLY_READING', label: 'Currently Reading', icon: BookOpen },
  { value: 'FINISHED', label: 'Finished', icon: CheckCircle },
  { value: 'WANT_TO_READ', label: 'Want to Read', icon: BookMarked },
] as const;

export type ReadingStatusOption = (typeof READING_STATUS_OPTIONS)[number];

/**
 * Reading status labels for display (simple map)
 */
export const READING_STATUS_LABELS = {
  CURRENTLY_READING: 'Currently Reading',
  FINISHED: 'Finished',
  WANT_TO_READ: 'Want to Read',
} as const;

/**
 * Get label for a reading status
 */
export function getReadingStatusLabel(status: string): string {
  const option = READING_STATUS_OPTIONS.find((s) => s.value === status);
  return option?.label || status;
}

/**
 * Get icon for a reading status
 */
export function getReadingStatusIcon(status: string): LucideIcon {
  const option = READING_STATUS_OPTIONS.find((s) => s.value === status);
  return option?.icon || BookOpen;
}
