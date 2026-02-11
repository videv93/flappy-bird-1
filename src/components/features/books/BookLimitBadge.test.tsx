import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookLimitBadge } from './BookLimitBadge';

describe('BookLimitBadge', () => {
  it('renders "2/3 books" for free user with 2 books', () => {
    render(<BookLimitBadge currentBookCount={2} maxBooks={3} isPremium={false} />);

    const badge = screen.getByTestId('book-limit-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2/3 books');
  });

  it('renders with warning style when at limit (3/3)', () => {
    render(<BookLimitBadge currentBookCount={3} maxBooks={3} isPremium={false} />);

    const badge = screen.getByTestId('book-limit-badge');
    expect(badge).toHaveTextContent('3/3 books');
    expect(badge.className).toContain('amber');
  });

  it('renders with muted style when under limit', () => {
    render(<BookLimitBadge currentBookCount={1} maxBooks={3} isPremium={false} />);

    const badge = screen.getByTestId('book-limit-badge');
    expect(badge).toHaveTextContent('1/3 books');
    expect(badge.className).toContain('muted');
  });

  it('renders nothing for premium user', () => {
    render(<BookLimitBadge currentBookCount={2} maxBooks={3} isPremium={true} />);

    expect(screen.queryByTestId('book-limit-badge')).not.toBeInTheDocument();
  });

  it('renders nothing for premium user regardless of book count', () => {
    render(<BookLimitBadge currentBookCount={10} maxBooks={3} isPremium={true} />);

    expect(screen.queryByTestId('book-limit-badge')).not.toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<BookLimitBadge currentBookCount={2} maxBooks={3} isPremium={false} />);

    const badge = screen.getByTestId('book-limit-badge');
    expect(badge).toHaveAttribute('aria-label', '2 of 3 books used');
  });
});
