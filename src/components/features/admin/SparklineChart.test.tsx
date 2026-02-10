import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineChart } from './SparklineChart';

describe('SparklineChart', () => {
  it('renders SVG with correct role and aria-label', () => {
    render(<SparklineChart data={[1, 2, 3, 4, 5]} />);
    const svg = screen.getByRole('img', { name: 'Trend sparkline chart' });
    expect(svg).toBeInTheDocument();
  });

  it('renders polyline element with data points', () => {
    const { container } = render(<SparklineChart data={[10, 20, 30]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  it('uses green stroke for positive trend', () => {
    const { container } = render(<SparklineChart data={[1, 2, 3]} positive={true} />);
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('stroke')).toBe('#16a34a');
  });

  it('uses red stroke for negative trend', () => {
    const { container } = render(<SparklineChart data={[3, 2, 1]} positive={false} />);
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('stroke')).toBe('#dc2626');
  });

  it('returns null for fewer than 2 data points', () => {
    const { container } = render(<SparklineChart data={[5]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    render(<SparklineChart data={[1, 2, 3]} width={200} height={50} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('50');
  });
});
