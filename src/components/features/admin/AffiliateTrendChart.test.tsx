import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateTrendChart } from './AffiliateTrendChart';

describe('AffiliateTrendChart', () => {
  it('renders trend charts', () => {
    render(
      <AffiliateTrendChart
        clicks={[
          { date: '2026-01-01', value: 10 },
          { date: '2026-01-02', value: 15 },
          { date: '2026-01-03', value: 12 },
        ]}
        conversions={[
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-02', value: 2 },
          { date: '2026-01-03', value: 1 },
        ]}
      />
    );

    expect(screen.getByText('Trends (Daily)')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
    expect(screen.getByText('Conversions')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('handles insufficient data', () => {
    render(
      <AffiliateTrendChart
        clicks={[{ date: '2026-01-01', value: 10 }]}
        conversions={[{ date: '2026-01-01', value: 1 }]}
      />
    );

    expect(screen.getByText('Trends (Daily)')).toBeInTheDocument();
    // Only labels rendered, no SVGs
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
