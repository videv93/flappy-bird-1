/**
 * Google Books API client
 * Fallback book search service when OpenLibrary fails
 * https://developers.google.com/books/docs/v1/using
 */

import type {
  BookSearchResult,
  BookSearchResponse,
  GoogleBooksResponse,
  GoogleBooksVolume,
} from './types';
import { detectISBN } from './validation';

const GOOGLE_BOOKS_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Extracts year from Google Books publishedDate
 * Can be "2020-01-15", "2020-01", or "2020"
 */
function extractYear(publishedDate?: string): number | undefined {
  if (!publishedDate) return undefined;
  const year = parseInt(publishedDate.substring(0, 4), 10);
  return isNaN(year) ? undefined : year;
}

/**
 * Extracts ISBN-10 and ISBN-13 from Google Books industry identifiers
 */
function extractISBNs(
  identifiers?: GoogleBooksVolume['volumeInfo']['industryIdentifiers']
): { isbn10?: string; isbn13?: string } {
  if (!identifiers) return {};

  let isbn10: string | undefined;
  let isbn13: string | undefined;

  for (const id of identifiers) {
    if (id.type === 'ISBN_10') {
      isbn10 = id.identifier;
    } else if (id.type === 'ISBN_13') {
      isbn13 = id.identifier;
    }
  }

  return { isbn10, isbn13 };
}

/**
 * Transforms Google Books volume to unified BookSearchResult
 */
function transformVolume(volume: GoogleBooksVolume): BookSearchResult {
  const info = volume.volumeInfo;
  const { isbn10, isbn13 } = extractISBNs(info.industryIdentifiers);

  return {
    id: volume.id,
    source: 'googlebooks',
    title: info.title,
    authors: info.authors || [],
    publishedYear: extractYear(info.publishedDate),
    coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
    isbn10,
    isbn13,
    pageCount: info.pageCount,
    description: info.description,
  };
}

/**
 * Searches Google Books for books
 * Supports title, author, and ISBN search
 */
export async function searchGoogleBooks(
  query: string,
  limit: number = 20
): Promise<BookSearchResponse> {
  const isbnResult = detectISBN(query);

  // Build search query
  let searchQuery: string;
  if (isbnResult.isISBN && isbnResult.cleaned) {
    // Use isbn: prefix for ISBN searches
    searchQuery = `isbn:${isbnResult.cleaned}`;
  } else {
    searchQuery = query;
  }

  const params = new URLSearchParams({
    q: searchQuery,
    maxResults: Math.min(limit, 40).toString(), // Google Books max is 40
  });

  const url = `${GOOGLE_BOOKS_SEARCH_URL}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
  }

  const data: GoogleBooksResponse = await response.json();

  // Handle no results
  if (!data.items || data.items.length === 0) {
    return {
      results: [],
      totalFound: 0,
      source: 'googlebooks',
    };
  }

  // Transform results
  let results = data.items.map(transformVolume);

  // For ISBN search, ensure exact match appears first
  if (isbnResult.isISBN && isbnResult.cleaned) {
    results = results.sort((a, b) => {
      const aMatch =
        a.isbn10 === isbnResult.cleaned || a.isbn13 === isbnResult.cleaned;
      const bMatch =
        b.isbn10 === isbnResult.cleaned || b.isbn13 === isbnResult.cleaned;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }

  return {
    results: results.slice(0, limit),
    totalFound: data.totalItems,
    source: 'googlebooks',
  };
}
