import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryEmptyState } from './LibraryEmptyState';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('LibraryEmptyState', () => {
  it('renders heading "Start your reading journey"', () => {
    render(<LibraryEmptyState />);

    expect(
      screen.getByRole('heading', { name: /start your reading journey/i })
    ).toBeInTheDocument();
  });

  it('renders "Find a Book" button', () => {
    render(<LibraryEmptyState />);

    expect(screen.getByRole('link', { name: /find a book/i })).toBeInTheDocument();
  });

  it('button links to /search', () => {
    render(<LibraryEmptyState />);

    const link = screen.getByRole('link', { name: /find a book/i });
    expect(link).toHaveAttribute('href', '/search');
  });

  it('renders description text', () => {
    render(<LibraryEmptyState />);

    expect(screen.getByText(/add books to your library/i)).toBeInTheDocument();
  });

  it('has data-testid for testing', () => {
    render(<LibraryEmptyState />);

    expect(screen.getByTestId('library-empty-state')).toBeInTheDocument();
  });
});
