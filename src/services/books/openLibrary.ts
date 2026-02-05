/**
 * OpenLibrary API client
 * Primary book search service
 * https://openlibrary.org/dev/docs/api/search
 */

import type {
  BookSearchResult,
  BookSearchResponse,
  OpenLibrarySearchResponse,
  OpenLibraryDoc,
} from './types';
import { detectISBN } from './validation';

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b/id';

// User-Agent header per OpenLibrary rate limiting guidance
const USER_AGENT = 'FlappyBird1/1.0 (social-reading-app)';

/**
 * Constructs cover image URL from OpenLibrary cover ID
 */
export function getCoverUrl(
  coverId: number | undefined,
  size: 'S' | 'M' | 'L' = 'M'
): string | undefined {
  if (!coverId) return undefined;
  return `${OPEN_LIBRARY_COVERS_URL}/${coverId}-${size}.jpg`;
}

/**
 * Extracts ISBN-10 and ISBN-13 from OpenLibrary ISBN array
 */
function extractISBNs(isbns?: string[]): {
  isbn10?: string;
  isbn13?: string;
} {
  if (!isbns || isbns.length === 0) return {};

  let isbn10: string | undefined;
  let isbn13: string | undefined;

  for (const isbn of isbns) {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length === 10 && !isbn10) {
      isbn10 = cleaned;
    } else if (cleaned.length === 13 && !isbn13) {
      isbn13 = cleaned;
    }
    if (isbn10 && isbn13) break;
  }

  return { isbn10, isbn13 };
}

/**
 * Transforms OpenLibrary doc to unified BookSearchResult
 */
function transformDoc(doc: OpenLibraryDoc): BookSearchResult {
  const { isbn10, isbn13 } = extractISBNs(doc.isbn);

  return {
    id: doc.key,
    source: 'openlibrary',
    title: doc.title,
    authors: doc.author_name || [],
    publishedYear: doc.first_publish_year,
    coverUrl: getCoverUrl(doc.cover_i, 'M'),
    isbn10,
    isbn13,
    pageCount: doc.number_of_pages_median,
  };
}

/**
 * Fetches a single book by ISBN from OpenLibrary
 * Returns undefined if not found
 */
export async function fetchBookByISBN(
  isbn: string
): Promise<BookSearchResult | undefined> {
  const cleaned = isbn.replace(/[-\s]/g, '');

  const params = new URLSearchParams();
  params.set('isbn', cleaned);
  params.set('limit', '1');
  params.set(
    'fields',
    'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median'
  );

  const url = `${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `OpenLibrary API error: ${response.status} ${response.statusText}`
    );
  }

  const data: OpenLibrarySearchResponse = await response.json();

  if (data.docs.length === 0) {
    return undefined;
  }

  return transformDoc(data.docs[0]);
}

/**
 * Searches OpenLibrary for books
 * Supports title, author, and ISBN search
 */
export async function searchOpenLibrary(
  query: string,
  limit: number = 20
): Promise<BookSearchResponse> {
  const isbnResult = detectISBN(query);

  // Build search URL
  const params = new URLSearchParams();

  if (isbnResult.isISBN && isbnResult.cleaned) {
    // ISBN search - use specific ISBN parameter for exact match
    params.set('isbn', isbnResult.cleaned);
  } else {
    // General search
    params.set('q', query);
  }

  params.set('limit', limit.toString());
  // Request fields we need to reduce response size
  params.set(
    'fields',
    'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median'
  );

  const url = `${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenLibrary API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenLibrarySearchResponse = await response.json();

  // Transform results
  let results = data.docs.map(transformDoc);

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
    totalFound: data.num_found,
    source: 'openlibrary',
  };
}
