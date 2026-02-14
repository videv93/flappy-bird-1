import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateProviderComparison } from './AffiliateProviderComparison';

describe('AffiliateProviderComparison', () => {
  it('renders provider cards', () => {
    render(
      <AffiliateProviderComparison
        data={[
          { provider: 'amazon', clicks: 350, conversions: 35, conversionRate: 10, revenue: 900 },
          { provider: 'bookshop', clicks: 150, conversions: 15, conversionRate: 10, revenue: 350.5 },
        ]}
      />
    );

    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Bookshop.org')).toBeInTheDocument();
    expect(screen.getByText('$900.00')).toBeInTheDocument();
    expect(screen.getByText('$350.50')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<AffiliateProviderComparison data={[]} />);
    expect(screen.getByText('No provider data available')).toBeInTheDocument();
  });
});
