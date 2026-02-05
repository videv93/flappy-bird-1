import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookSearchError } from './BookSearchError';

describe('BookSearchError', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error state container', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(screen.getByTestId('book-search-error')).toBeInTheDocument();
  });

  it('displays error icon', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('displays error heading', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays friendly error message', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(
      screen.getByText(/We couldn't search for books right now/)
    ).toBeInTheDocument();
  });

  it('displays retry button', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(
      screen.getByRole('button', { name: /Try again/i })
    ).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('is centered vertically and horizontally', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    const container = screen.getByTestId('book-search-error');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('justify-center');
  });

  it('has proper padding', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    const container = screen.getByTestId('book-search-error');
    expect(container.className).toContain('py-12');
    expect(container.className).toContain('px-4');
  });

  it('retry button has refresh icon', () => {
    render(<BookSearchError onRetry={mockOnRetry} />);

    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
  });

  it('displays custom error message when provided', () => {
    render(
      <BookSearchError
        onRetry={mockOnRetry}
        message="Custom error message"
      />
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});

import { beforeEach } from 'vitest';
