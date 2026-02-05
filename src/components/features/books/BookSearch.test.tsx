import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BookSearch } from './BookSearch';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock matchMedia for useMediaQuery hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the hooks module to skip debouncing in tests
vi.mock('@/hooks', () => ({
  useDebounce: vi.fn((value: string) => value),
  useMediaQuery: vi.fn(() => false),
}));

const mockSearchResults = {
  results: [
    {
      id: '/works/OL123W',
      source: 'openlibrary',
      title: 'The Hobbit',
      authors: ['J.R.R. Tolkien'],
      publishedYear: 1937,
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
    },
    {
      id: '/works/OL456W',
      source: 'openlibrary',
      title: 'The Lord of the Rings',
      authors: ['J.R.R. Tolkien'],
      publishedYear: 1954,
    },
  ],
  totalFound: 2,
  source: 'openlibrary',
};

const mockEmptyResults = {
  results: [],
  totalFound: 0,
  source: 'openlibrary',
};

describe('BookSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<BookSearch />);

    expect(
      screen.getByPlaceholderText('Search by title, author, or ISBN')
    ).toBeInTheDocument();
  });

  it('shows initial idle state with no results', () => {
    render(<BookSearch />);

    expect(screen.queryByTestId('book-search-results')).not.toBeInTheDocument();
    expect(screen.queryByTestId('book-search-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('book-search-error')).not.toBeInTheDocument();
  });

  it('shows loading state during search', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValueOnce(pendingPromise);

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'hobbit' } });
    });

    // Should be loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getAllByTestId('book-search-result-skeleton').length).toBeGreaterThan(0);

    // Clean up
    resolvePromise!({ ok: true, json: async () => mockSearchResults });
  });

  it('displays search results on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResults,
    });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'tolkien' } });
    });

    await waitFor(() => {
      expect(screen.getByText('The Hobbit')).toBeInTheDocument();
    });

    expect(screen.getByText('The Lord of the Rings')).toBeInTheDocument();
  });

  it('displays empty state when no results found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyResults,
    });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistentbook123' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('book-search-empty')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No books found for "nonexistentbook123"/)
    ).toBeInTheDocument();
  });

  it('displays error state on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('book-search-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('retries search when retry button is clicked', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
      });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('book-search-error')).toBeInTheDocument();
    });

    // Click retry
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('The Hobbit')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('limits results to 20', async () => {
    const manyResults = {
      results: Array.from({ length: 25 }, (_, i) => ({
        id: `/works/OL${i}W`,
        source: 'openlibrary',
        title: `Book ${i}`,
        authors: ['Author'],
      })),
      totalFound: 25,
      source: 'openlibrary',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => manyResults,
    });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'books' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Book 0')).toBeInTheDocument();
    });

    // Should show max 20 results
    const results = screen.getAllByTestId('book-search-result');
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('makes API call with correct query parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResults,
    });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'the hobbit' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/books/search?q=the%20hobbit'),
        expect.any(Object)
      );
    });
  });

  it('handles 400 validation error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search query',
        },
      }),
    });

    render(<BookSearch />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'abc' } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('book-search-error')).toBeInTheDocument();
    });
  });

  it('calls onBookSelect when a book is clicked', async () => {
    const mockOnBookSelect = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResults,
    });

    render(<BookSearch onBookSelect={mockOnBookSelect} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'tolkien' } });
    });

    await waitFor(() => {
      expect(screen.getByText('The Hobbit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTestId('book-search-result')[0]);

    expect(mockOnBookSelect).toHaveBeenCalledWith(mockSearchResults.results[0]);
  });
});
