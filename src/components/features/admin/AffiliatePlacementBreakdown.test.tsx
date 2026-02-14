import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliatePlacementBreakdown } from './AffiliatePlacementBreakdown';

describe('AffiliatePlacementBreakdown', () => {
  it('renders placement data in table', () => {
    render(
      <AffiliatePlacementBreakdown
        data={[
          { source: 'detail-page', clicks: 300, conversions: 30, conversionRate: 10, revenue: 0 },
          { source: 'recommendation', clicks: 150, conversions: 15, conversionRate: 10, revenue: 0 },
        ]}
      />
    );

    expect(screen.getByText('Book Detail Page')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<AffiliatePlacementBreakdown data={[]} />);
    expect(screen.getByText('No placement data available')).toBeInTheDocument();
  });
});
