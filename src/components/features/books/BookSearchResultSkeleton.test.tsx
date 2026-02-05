import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookSearchResultSkeleton } from './BookSearchResultSkeleton';

describe('BookSearchResultSkeleton', () => {
  it('renders skeleton container', () => {
    render(<BookSearchResultSkeleton />);

    expect(screen.getByTestId('book-search-result-skeleton')).toBeInTheDocument();
  });

  it('renders cover skeleton', () => {
    render(<BookSearchResultSkeleton />);

    expect(screen.getByTestId('skeleton-cover')).toBeInTheDocument();
  });

  it('renders title skeleton', () => {
    render(<BookSearchResultSkeleton />);

    expect(screen.getByTestId('skeleton-title')).toBeInTheDocument();
  });

  it('renders author skeleton', () => {
    render(<BookSearchResultSkeleton />);

    expect(screen.getByTestId('skeleton-author')).toBeInTheDocument();
  });

  it('renders year skeleton', () => {
    render(<BookSearchResultSkeleton />);

    expect(screen.getByTestId('skeleton-year')).toBeInTheDocument();
  });

  it('has same minimum height as BookSearchResult (72px)', () => {
    render(<BookSearchResultSkeleton />);

    const skeleton = screen.getByTestId('book-search-result-skeleton');
    expect(skeleton.className).toContain('min-h-[72px]');
  });

  it('has same gap and padding as BookSearchResult', () => {
    render(<BookSearchResultSkeleton />);

    const skeleton = screen.getByTestId('book-search-result-skeleton');
    expect(skeleton.className).toContain('gap-3');
    expect(skeleton.className).toContain('p-3');
  });

  it('cover skeleton has correct dimensions (w-12 h-16)', () => {
    render(<BookSearchResultSkeleton />);

    const cover = screen.getByTestId('skeleton-cover');
    expect(cover.className).toContain('w-12');
    expect(cover.className).toContain('h-16');
  });

  it('renders multiple skeletons when count is provided', () => {
    render(<BookSearchResultSkeleton count={3} />);

    const skeletons = screen.getAllByTestId('book-search-result-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('renders single skeleton by default', () => {
    render(<BookSearchResultSkeleton />);

    const skeletons = screen.getAllByTestId('book-search-result-skeleton');
    expect(skeletons).toHaveLength(1);
  });
});
