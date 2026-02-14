import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateUserSegments } from './AffiliateUserSegments';

describe('AffiliateUserSegments', () => {
  it('renders segment data', () => {
    render(
      <AffiliateUserSegments
        data={[
          { segment: 'FREE', clicks: 300, uniqueUsers: 200, conversions: 20, conversionRate: 6.7 },
          { segment: 'PREMIUM', clicks: 200, uniqueUsers: 80, conversions: 30, conversionRate: 15 },
        ]}
      />
    );

    expect(screen.getByText('Free Users')).toBeInTheDocument();
    expect(screen.getByText('Premium Users')).toBeInTheDocument();
    expect(screen.getByText('6.7%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<AffiliateUserSegments data={[]} />);
    expect(screen.getByText('No segment data available')).toBeInTheDocument();
  });
});
