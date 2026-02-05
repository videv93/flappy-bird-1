import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchGoogleBooks } from './googleBooks';
import type { GoogleBooksResponse } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Google Books Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchGoogleBooks', () => {
    const mockResponse: GoogleBooksResponse = {
      kind: 'books#volumes',
      totalItems: 2,
      items: [
        {
          id: 'abc123',
          volumeInfo: {
            title: 'The Hobbit',
            authors: ['J.R.R. Tolkien'],
            publishedDate: '1937-09-21',
            imageLinks: {
              thumbnail: 'http://books.google.com/books?id=abc123&cover',
            },
            industryIdentifiers: [
              { type: 'ISBN_10', identifier: '0261102214' },
              { type: 'ISBN_13', identifier: '9780261102217' },
            ],
            pageCount: 310,
            description: 'A hobbit goes on an adventure.',
          },
        },
        {
          id: 'def456',
          volumeInfo: {
            title: 'The Lord of the Rings',
            authors: ['J.R.R. Tolkien'],
            publishedDate: '1954',
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780261103252' },
            ],
          },
        },
      ],
    };

    it('performs general search correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchGoogleBooks('tolkien');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=tolkien')
      );

      expect(result.source).toBe('googlebooks');
      expect(result.results).toHaveLength(2);
      expect(result.totalFound).toBe(2);
    });

    it('transforms Google Books volumes to BookSearchResult', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchGoogleBooks('hobbit');
      const book = result.results[0];

      expect(book.id).toBe('abc123');
      expect(book.source).toBe('googlebooks');
      expect(book.title).toBe('The Hobbit');
      expect(book.authors).toEqual(['J.R.R. Tolkien']);
      expect(book.publishedYear).toBe(1937);
      expect(book.coverUrl).toBe('https://books.google.com/books?id=abc123&cover');
      expect(book.isbn10).toBe('0261102214');
      expect(book.isbn13).toBe('9780261102217');
      expect(book.pageCount).toBe(310);
      expect(book.description).toBe('A hobbit goes on an adventure.');
    });

    it('converts http cover URLs to https', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchGoogleBooks('hobbit');
      expect(result.results[0].coverUrl).toMatch(/^https:/);
    });

    it('performs ISBN search with isbn: prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchGoogleBooks('9780261102217');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=isbn%3A9780261102217')
      );
    });

    it('handles ISBN with hyphens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchGoogleBooks('978-0-261-10221-7');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('isbn%3A9780261102217')
      );
    });

    it('respects limit parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchGoogleBooks('tolkien', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=10')
      );
    });

    it('caps limit at 40 (Google Books max)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await searchGoogleBooks('tolkien', 100);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('maxResults=40')
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(searchGoogleBooks('test')).rejects.toThrow(
        'Google Books API error: 403 Forbidden'
      );
    });

    it('handles empty search results (no items array)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kind: 'books#volumes',
            totalItems: 0,
          }),
      });

      const result = await searchGoogleBooks('xyznonexistent');

      expect(result.results).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('handles empty items array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kind: 'books#volumes',
            totalItems: 0,
            items: [],
          }),
      });

      const result = await searchGoogleBooks('xyznonexistent');

      expect(result.results).toHaveLength(0);
      expect(result.totalFound).toBe(0);
    });

    it('handles missing optional fields gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kind: 'books#volumes',
            totalItems: 1,
            items: [
              {
                id: 'xyz789',
                volumeInfo: {
                  title: 'Unknown Book',
                  // No authors, publishedDate, imageLinks, etc.
                },
              },
            ],
          }),
      });

      const result = await searchGoogleBooks('unknown');
      const book = result.results[0];

      expect(book.title).toBe('Unknown Book');
      expect(book.authors).toEqual([]);
      expect(book.publishedYear).toBeUndefined();
      expect(book.coverUrl).toBeUndefined();
      expect(book.isbn10).toBeUndefined();
      expect(book.isbn13).toBeUndefined();
    });

    it('extracts year from different date formats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kind: 'books#volumes',
            totalItems: 3,
            items: [
              {
                id: '1',
                volumeInfo: { title: 'Book 1', publishedDate: '2020-01-15' },
              },
              {
                id: '2',
                volumeInfo: { title: 'Book 2', publishedDate: '2020-01' },
              },
              {
                id: '3',
                volumeInfo: { title: 'Book 3', publishedDate: '2020' },
              },
            ],
          }),
      });

      const result = await searchGoogleBooks('test');

      expect(result.results[0].publishedYear).toBe(2020);
      expect(result.results[1].publishedYear).toBe(2020);
      expect(result.results[2].publishedYear).toBe(2020);
    });
  });
});
