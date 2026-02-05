/**
 * Unified Book Search Service
 * Provides book search with OpenLibrary as primary and Google Books as fallback
 */

import { searchOpenLibrary } from './openLibrary';
import { searchGoogleBooks } from './googleBooks';
import type { BookSearchResult, BookSearchResponse } from './types';

// Re-export types and utilities
export * from './types';
export { isValidISBN10, isValidISBN13, detectISBN } from './validation';
export { searchOpenLibrary, fetchBookByISBN } from './openLibrary';
export { searchGoogleBooks } from './googleBooks';

/**
 * Deduplicates book results by ISBN, preferring earlier entries
 * Falls back to title-based deduplication if no ISBN available
 */
export function deduplicateResults(results: BookSearchResult[]): BookSearchResult[] {
  const seen = new Map<string, BookSearchResult>();

  for (const book of results) {
    // Create a key from ISBNs (prefer ISBN-13)
    const key = book.isbn13 || book.isbn10 || `title:${book.title.toLowerCase().trim()}`;

    if (!seen.has(key)) {
      seen.set(key, book);
    }
  }

  return Array.from(seen.values());
}

/**
 * Unified book search with automatic fallback
 * - Tries OpenLibrary first (primary source)
 * - Falls back to Google Books if OpenLibrary fails
 * - Deduplicates results by ISBN when possible
 */
export async function searchBooks(
  query: string,
  limit: number = 20
): Promise<BookSearchResponse> {
  try {
    // Try OpenLibrary first
    const response = await searchOpenLibrary(query, limit);
    return {
      ...response,
      results: deduplicateResults(response.results),
    };
  } catch (error) {
    console.error('OpenLibrary failed, falling back to Google Books:', error);

    // Fall back to Google Books
    const response = await searchGoogleBooks(query, limit);
    return {
      ...response,
      results: deduplicateResults(response.results),
    };
  }
}
