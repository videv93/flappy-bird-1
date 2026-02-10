import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendIndicator } from './TrendIndicator';

describe('TrendIndicator', () => {
  it('shows positive percentage with green color', () => {
    render(<TrendIndicator percentageChange={25.5} />);
    const indicator = screen.getByText('25.5%');
    expect(indicator.closest('span')).toHaveClass('text-green-600');
  });

  it('shows negative percentage with red color', () => {
    render(<TrendIndicator percentageChange={-15} />);
    const indicator = screen.getByText('15%');
    expect(indicator.closest('span')).toHaveClass('text-red-600');
  });

  it('shows 0% for neutral change', () => {
    render(<TrendIndicator percentageChange={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays absolute value for negative changes', () => {
    render(<TrendIndicator percentageChange={-42.3} />);
    expect(screen.getByText('42.3%')).toBeInTheDocument();
  });
});
