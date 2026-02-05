import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchBooks, deduplicateResults } from './index';
import * as openLibraryModule from './openLibrary';
import * as googleBooksModule from './googleBooks';
import type { BookSearchResult } from './types';

// Mock the individual service modules
vi.mock('./openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

vi.mock('./googleBooks', () => ({
  searchGoogleBooks: vi.fn(),
}));

describe('Book Search Service', () => {
  const mockOpenLibrary = vi.mocked(openLibraryModule.searchOpenLibrary);
  const mockGoogleBooks = vi.mocked(googleBooksModule.searchGoogleBooks);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deduplicateResults', () => {
    it('removes duplicates by ISBN-13', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'The Hobbit',
          authors: ['Tolkien'],
          isbn13: '9780547928227',
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'The Hobbit (Different Edition)',
          authors: ['J.R.R. Tolkien'],
          isbn13: '9780547928227',
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].id).toBe('1'); // First entry wins
    });

    it('removes duplicates by ISBN-10', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'Book A',
          authors: [],
          isbn10: '0547928227',
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'Book A Different',
          authors: [],
          isbn10: '0547928227',
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(1);
    });

    it('prefers ISBN-13 over ISBN-10 for deduplication key', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'Book',
          authors: [],
          isbn13: '9780547928227',
          isbn10: '0547928227',
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'Book',
          authors: [],
          isbn13: '9780547928227',
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(1);
    });

    it('falls back to title-based deduplication when no ISBN', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'The Hobbit',
          authors: ['Tolkien'],
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'The Hobbit',
          authors: ['J.R.R. Tolkien'],
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(1);
    });

    it('is case-insensitive for title deduplication', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'THE HOBBIT',
          authors: [],
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'the hobbit',
          authors: [],
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(1);
    });

    it('keeps books with different ISBNs', () => {
      const results: BookSearchResult[] = [
        {
          id: '1',
          source: 'openlibrary',
          title: 'The Hobbit',
          authors: [],
          isbn13: '9780547928227',
        },
        {
          id: '2',
          source: 'googlebooks',
          title: 'The Hobbit (Illustrated)',
          authors: [],
          isbn13: '9780618968633',
        },
      ];

      const deduplicated = deduplicateResults(results);

      expect(deduplicated).toHaveLength(2);
    });

    it('handles empty array', () => {
      const deduplicated = deduplicateResults([]);
      expect(deduplicated).toEqual([]);
    });

    it('handles single item array', () => {
      const results: BookSearchResult[] = [
        { id: '1', source: 'openlibrary', title: 'Book', authors: [] },
      ];
      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(1);
    });
  });

  describe('searchBooks', () => {
    const mockOpenLibraryResponse = {
      results: [
        {
          id: '/works/OL123W',
          source: 'openlibrary' as const,
          title: 'The Hobbit',
          authors: ['J.R.R. Tolkien'],
          isbn13: '9780547928227',
        },
      ],
      totalFound: 1,
      source: 'openlibrary' as const,
    };

    const mockGoogleBooksResponse = {
      results: [
        {
          id: 'abc123',
          source: 'googlebooks' as const,
          title: 'The Hobbit',
          authors: ['J.R.R. Tolkien'],
          isbn13: '9780547928227',
        },
      ],
      totalFound: 1,
      source: 'googlebooks' as const,
    };

    it('uses OpenLibrary as primary source', async () => {
      mockOpenLibrary.mockResolvedValueOnce(mockOpenLibraryResponse);

      const result = await searchBooks('hobbit');

      expect(mockOpenLibrary).toHaveBeenCalledWith('hobbit', 20);
      expect(mockGoogleBooks).not.toHaveBeenCalled();
      expect(result.source).toBe('openlibrary');
    });

    it('falls back to Google Books when OpenLibrary fails', async () => {
      mockOpenLibrary.mockRejectedValueOnce(new Error('OpenLibrary is down'));
      mockGoogleBooks.mockResolvedValueOnce(mockGoogleBooksResponse);

      const result = await searchBooks('hobbit');

      expect(mockOpenLibrary).toHaveBeenCalled();
      expect(mockGoogleBooks).toHaveBeenCalledWith('hobbit', 20);
      expect(result.source).toBe('googlebooks');
    });

    it('passes limit parameter to services', async () => {
      mockOpenLibrary.mockResolvedValueOnce(mockOpenLibraryResponse);

      await searchBooks('hobbit', 10);

      expect(mockOpenLibrary).toHaveBeenCalledWith('hobbit', 10);
    });

    it('deduplicates results from OpenLibrary', async () => {
      mockOpenLibrary.mockResolvedValueOnce({
        results: [
          { id: '1', source: 'openlibrary', title: 'Book', authors: [], isbn13: '123' },
          { id: '2', source: 'openlibrary', title: 'Book', authors: [], isbn13: '123' },
        ],
        totalFound: 2,
        source: 'openlibrary',
      });

      const result = await searchBooks('book');

      expect(result.results).toHaveLength(1);
    });

    it('deduplicates results from Google Books fallback', async () => {
      mockOpenLibrary.mockRejectedValueOnce(new Error('fail'));
      mockGoogleBooks.mockResolvedValueOnce({
        results: [
          { id: '1', source: 'googlebooks', title: 'Book', authors: [], isbn13: '123' },
          { id: '2', source: 'googlebooks', title: 'Book', authors: [], isbn13: '123' },
        ],
        totalFound: 2,
        source: 'googlebooks',
      });

      const result = await searchBooks('book');

      expect(result.results).toHaveLength(1);
    });

    it('throws when both services fail', async () => {
      mockOpenLibrary.mockRejectedValueOnce(new Error('OpenLibrary down'));
      mockGoogleBooks.mockRejectedValueOnce(new Error('Google Books down'));

      await expect(searchBooks('book')).rejects.toThrow('Google Books down');
    });

    it('logs error when OpenLibrary fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOpenLibrary.mockRejectedValueOnce(new Error('OpenLibrary error'));
      mockGoogleBooks.mockResolvedValueOnce(mockGoogleBooksResponse);

      await searchBooks('book');

      expect(consoleSpy).toHaveBeenCalledWith(
        'OpenLibrary failed, falling back to Google Books:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
