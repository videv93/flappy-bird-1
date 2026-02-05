/**
 * Book search service types
 * Shared types for book search across OpenLibrary and Google Books APIs
 */

// Unified book search result type
export interface BookSearchResult {
  id: string;
  source: 'openlibrary' | 'googlebooks';
  title: string;
  authors: string[];
  publishedYear?: number;
  coverUrl?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  description?: string;
}

// API response wrapper
export interface BookSearchResponse {
  results: BookSearchResult[];
  totalFound: number;
  source: 'openlibrary' | 'googlebooks';
}

// OpenLibrary API types
export interface OpenLibrarySearchResponse {
  start: number;
  num_found: number;
  docs: OpenLibraryDoc[];
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  edition_count?: number;
  number_of_pages_median?: number;
}

// Google Books API types
export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: 'ISBN_10' | 'ISBN_13' | 'OTHER';
      identifier: string;
    }>;
    pageCount?: number;
    description?: string;
  };
}

// ISBN detection result
export interface ISBNDetectionResult {
  isISBN: boolean;
  type?: 'ISBN10' | 'ISBN13';
  cleaned?: string;
}
