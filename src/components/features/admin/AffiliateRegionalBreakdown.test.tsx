import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateRegionalBreakdown } from './AffiliateRegionalBreakdown';

describe('AffiliateRegionalBreakdown', () => {
  it('renders regional data', () => {
    render(
      <AffiliateRegionalBreakdown
        data={[
          { countryCode: 'US', clicks: 250, conversions: 25, conversionRate: 10 },
          { countryCode: 'GB', clicks: 100, conversions: 10, conversionRate: 10 },
        ]}
      />
    );

    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('GB')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<AffiliateRegionalBreakdown data={[]} />);
    expect(screen.getByText('No regional data available')).toBeInTheDocument();
  });
});
