import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mockSearchBooks is available when vi.mock runs
const { mockSearchBooks } = vi.hoisted(() => ({
  mockSearchBooks: vi.fn(),
}));

vi.mock('@/services/books', () => ({
  searchBooks: mockSearchBooks,
}));

import { GET } from './route';

// Helper to create a mock request
function createRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/books/search');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString());
}

describe('GET /api/books/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('rejects query shorter than 3 characters', async () => {
      const request = createRequest({ q: 'ab' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid search query');
      expect(mockSearchBooks).not.toHaveBeenCalled();
    });

    it('rejects missing query parameter', async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects query longer than 200 characters', async () => {
      const longQuery = 'a'.repeat(201);
      const request = createRequest({ q: longQuery });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects limit less than 1', async () => {
      const request = createRequest({ q: 'hobbit', limit: '0' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects limit greater than 40', async () => {
      const request = createRequest({ q: 'hobbit', limit: '50' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('successful searches', () => {
    const mockResponse = {
      results: [
        {
          id: '/works/OL123W',
          source: 'openlibrary' as const,
          title: 'The Hobbit',
          authors: ['J.R.R. Tolkien'],
          isbn13: '9780261102217',
        },
      ],
      totalFound: 1,
      source: 'openlibrary' as const,
    };

    it('returns search results for valid query', async () => {
      mockSearchBooks.mockResolvedValueOnce(mockResponse);

      const request = createRequest({ q: 'hobbit' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe('The Hobbit');
      expect(mockSearchBooks).toHaveBeenCalledWith('hobbit', 20);
    });

    it('passes custom limit parameter to search service', async () => {
      mockSearchBooks.mockResolvedValueOnce(mockResponse);

      const request = createRequest({ q: 'hobbit', limit: '10' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchBooks).toHaveBeenCalledWith('hobbit', 10);
    });

    it('uses default limit of 20 when not specified', async () => {
      mockSearchBooks.mockResolvedValueOnce(mockResponse);

      const request = createRequest({ q: 'tolkien' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchBooks).toHaveBeenCalledWith('tolkien', 20);
    });
  });

  describe('error handling', () => {
    it('returns 500 on service error', async () => {
      mockSearchBooks.mockRejectedValueOnce(new Error('Service unavailable'));

      const request = createRequest({ q: 'test query' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('Failed to search books. Please try again.');
    });
  });
});
