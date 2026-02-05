import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookSearchInput } from './BookSearchInput';

// Mock useMediaQuery hook
vi.mock('@/hooks', () => ({
  useDebounce: vi.fn((value: string) => value),
  useMediaQuery: vi.fn(() => false),
}));

import { useDebounce, useMediaQuery } from '@/hooks';

const mockUseDebounce = vi.mocked(useDebounce);
const mockUseMediaQuery = vi.mocked(useMediaQuery);

describe('BookSearchInput', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: desktop viewport (not mobile)
    mockUseMediaQuery.mockReturnValue(false);
    // Default: pass through value
    mockUseDebounce.mockImplementation((value) => value);
  });

  it('renders with correct placeholder', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    expect(
      screen.getByPlaceholderText('Search by title, author, or ISBN')
    ).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <BookSearchInput onSearch={mockOnSearch} placeholder="Custom placeholder" />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('shows search icon', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<BookSearchInput onSearch={mockOnSearch} isLoading />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('does not show loading spinner when isLoading is false', () => {
    render(<BookSearchInput onSearch={mockOnSearch} isLoading={false} />);

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('calls onSearch when query has 3+ characters', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');

    // Type 3 characters - should trigger search (via debounce effect)
    fireEvent.change(input, { target: { value: 'abc' } });

    // Since useDebounce is mocked to pass through immediately, onSearch should be called
    expect(mockOnSearch).toHaveBeenCalledWith('abc');
  });

  it('does not call onSearch for query shorter than 3 characters', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    fireEvent.change(input, { target: { value: 'ab' } });

    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('triggers search on Enter key press with valid query', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    fireEvent.change(input, { target: { value: 'hobbit' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('hobbit');
  });

  it('does not trigger search on Enter with short query', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    fireEvent.change(input, { target: { value: 'ab' } });
    mockOnSearch.mockClear(); // Clear any calls from debounce
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // onSearch should not be called on Enter with short query
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('autofocuses on mobile viewport', () => {
    mockUseMediaQuery.mockReturnValue(true); // mobile viewport

    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    expect(input).toHaveFocus();
  });

  it('does not autofocus on desktop viewport', () => {
    mockUseMediaQuery.mockReturnValue(false); // desktop viewport

    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    expect(input).not.toHaveFocus();
  });

  it('has correct height for touch target (h-12 = 48px)', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    expect(input.className).toContain('h-12');
  });

  it('clears search on clear button click', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(
      'Search by title, author, or ISBN'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hobbit' } });

    expect(input.value).toBe('hobbit');

    const clearButton = screen.getByTestId('clear-button');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('does not show clear button when input is empty', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
  });

  it('shows clear button when input has value', () => {
    render(<BookSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText('Search by title, author, or ISBN');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByTestId('clear-button')).toBeInTheDocument();
  });
});
