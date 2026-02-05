import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchOpenLibrary, getCoverUrl } from './openLibrary';
import type { OpenLibrarySearchResponse } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenLibrary Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCoverUrl', () => {
    it('returns undefined for undefined cover ID', () => {
      expect(getCoverUrl(undefined)).toBeUndefined();
    });

    it('constructs correct URL with default medium size', () => {
      expect(getCoverUrl(12345)).toBe(
        'https://covers.openlibrary.org/b/id/12345-M.jpg'
      );
    });

    it('constructs correct URL with specified size', () => {
      expect(getCoverUrl(12345, 'S')).toBe(
        'https://covers.openlibrary.org/b/id/12345-S.jpg'
      );
      expect(getCoverUrl(12345, 'L')).toBe(
        'https://covers.openlibrary.org/b/id/12345-L.jpg'
      );
    });
  });

  describe('searchOpenLibrary', () => {
    const mockResponse: OpenLibrarySearchResponse = {
      start: 0,
      num_found: 2,
      docs: [
        {
          key: '/works/OL123W',
          title: 'The Hobbit',
          author_name: ['J.R.R. Tolkien'],
          first_publish_year: 1937,
          cover_i: 12345,
          isbn: ['0261102214', '9780261102217'],
          number_of_pages_median: 310,
        },
        {
          key: '/works/OL456W',
          title: 'The Lord of the Rings',
          author_name: ['J.R.R. Tolkien'],
          first_publish_year: 1954,
          cover_i: 67890,
          isbn: ['9780261103252'],
        },
      ],
    };

    it('performs general search correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenLibrary('tolkien');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=tolkien'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('FlappyBird1'),
          }),
        })
      );

      expect(result.source).toBe('openlibrary');
      expect(result.results).toHaveLength(2);
      expect(result.totalFound).toBe(2);
    });

    it('transforms OpenLibrary docs to BookSearchResult', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenLibrary('hobbit');
      const book = result.results[0];

      expect(book.id).toBe('/works/OL123W');
      expect(book.source).toBe('openlibrary');
      expect(book.title).toBe('The Hobbit');
      expect(book.authors).toEqual(['J.R.R. Tolkien']);
      expect(book.publishedYear).toBe(1937);
      expect(book.coverUrl).toBe(
        'https://covers.openlibrary.org/b/id/12345-M.jpg'
      );
      expect(book.isbn10).toBe('0261102214');
      expect(book.isbn13).toBe('9780261102217');
      expect(book.pageCount).toBe(310);
    });

    it('performs ISBN search with isbn parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchOpenLibrary('9780261102217');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('isbn=9780261102217'),
        expect.any(Object)
      );
    });

    it('handles ISBN with hyphens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchOpenLibrary('978-0-261-10221-7');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('isbn=9780261102217'),
        expect.any(Object)
      );
    });

    it('respects limit parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchOpenLibrary('tolkien', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(searchOpenLibrary('test')).rejects.toThrow(
        'OpenLibrary API error: 500 Internal Server Error'
      );
    });

    it('handles empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            start: 0,
            num_found: 0,
            docs: [],
          }),
      });

      const result = await searchOpenLibrary('xyznonexistent');

      expect(result.results).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('handles missing optional fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            start: 0,
            num_found: 1,
            docs: [
              {
                key: '/works/OL789W',
                title: 'Unknown Book',
                // No author_name, cover_i, isbn, etc.
              },
            ],
          }),
      });

      const result = await searchOpenLibrary('unknown');
      const book = result.results[0];

      expect(book.title).toBe('Unknown Book');
      expect(book.authors).toEqual([]);
      expect(book.publishedYear).toBeUndefined();
      expect(book.coverUrl).toBeUndefined();
      expect(book.isbn10).toBeUndefined();
      expect(book.isbn13).toBeUndefined();
    });
  });
});
