import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FreezeCountBadge } from './FreezeCountBadge';

describe('FreezeCountBadge', () => {
  it('renders correct count and max', () => {
    render(<FreezeCountBadge count={3} />);

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('renders with custom max', () => {
    render(<FreezeCountBadge count={2} max={10} />);

    expect(screen.getByText('2/10')).toBeInTheDocument();
  });

  it('applies blue accent when count > 0', () => {
    const { container } = render(<FreezeCountBadge count={3} />);

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-blue-500');
    expect(badge.className).not.toContain('text-muted-foreground');
  });

  it('applies muted styling when count is 0', () => {
    const { container } = render(<FreezeCountBadge count={0} />);

    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-muted-foreground');
    expect(badge.className).not.toContain('text-blue-500');
  });

  it('has correct accessibility aria-label for multiple freezes', () => {
    const { container } = render(<FreezeCountBadge count={3} />);

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveAttribute('aria-label', '3 streak freezes available');
  });

  it('has correct accessibility aria-label for single freeze', () => {
    const { container } = render(<FreezeCountBadge count={1} />);

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveAttribute('aria-label', '1 streak freeze available');
  });

  it('has correct accessibility aria-label for zero freezes', () => {
    const { container } = render(<FreezeCountBadge count={0} />);

    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveAttribute('aria-label', '0 streak freezes available');
  });

  it('renders count 0/5 when no freezes', () => {
    render(<FreezeCountBadge count={0} />);

    expect(screen.getByText('0/5')).toBeInTheDocument();
  });
});
