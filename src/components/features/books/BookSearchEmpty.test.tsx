import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookSearchEmpty } from './BookSearchEmpty';

describe('BookSearchEmpty', () => {
  it('renders empty state container', () => {
    render(<BookSearchEmpty query="test" />);

    expect(screen.getByTestId('book-search-empty')).toBeInTheDocument();
  });

  it('displays search icon', () => {
    render(<BookSearchEmpty query="test" />);

    expect(screen.getByTestId('empty-search-icon')).toBeInTheDocument();
  });

  it('displays message with query', () => {
    render(<BookSearchEmpty query="hobbit" />);

    expect(screen.getByText(/No books found for "hobbit"/)).toBeInTheDocument();
  });

  it('displays suggestions text', () => {
    render(<BookSearchEmpty query="test" />);

    expect(
      screen.getByText(
        /Try searching with different keywords, or check the spelling/
      )
    ).toBeInTheDocument();
  });

  it('is centered vertically and horizontally', () => {
    render(<BookSearchEmpty query="test" />);

    const container = screen.getByTestId('book-search-empty');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('justify-center');
  });

  it('has proper padding', () => {
    render(<BookSearchEmpty query="test" />);

    const container = screen.getByTestId('book-search-empty');
    expect(container.className).toContain('py-12');
    expect(container.className).toContain('px-4');
  });

  it('escapes special characters in query display', () => {
    render(<BookSearchEmpty query="<script>alert('xss')</script>" />);

    // Should not render as HTML
    expect(
      screen.getByText(/No books found for "<script>alert\('xss'\)<\/script>"/)
    ).toBeInTheDocument();
  });
});
