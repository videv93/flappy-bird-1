import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateOverviewCards } from './AffiliateOverviewCards';

const defaultTrends = {
  clicks: [
    { date: '2026-01-01', value: 10 },
    { date: '2026-01-02', value: 15 },
  ],
  conversions: [
    { date: '2026-01-01', value: 1 },
    { date: '2026-01-02', value: 2 },
  ],
  clicksPercentageChange: 12.5,
  conversionsPercentageChange: -5.3,
};

describe('AffiliateOverviewCards', () => {
  it('renders all four KPI cards', () => {
    render(
      <AffiliateOverviewCards
        totalClicks={500}
        totalConversions={50}
        totalRevenue={1250.5}
        overallConversionRate={10}
        trends={defaultTrends}
      />
    );

    expect(screen.getByText('Total Clicks')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Conversions')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Revenue (All-Time)')).toBeInTheDocument();
    expect(screen.getByText('$1250.50')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('renders trend indicators', () => {
    render(
      <AffiliateOverviewCards
        totalClicks={500}
        totalConversions={50}
        totalRevenue={1250.5}
        overallConversionRate={10}
        trends={defaultTrends}
      />
    );

    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('5.3%')).toBeInTheDocument();
  });

  it('renders zero values correctly', () => {
    render(
      <AffiliateOverviewCards
        totalClicks={0}
        totalConversions={0}
        totalRevenue={0}
        overallConversionRate={0}
        trends={{
          clicks: [],
          conversions: [],
          clicksPercentageChange: 0,
          conversionsPercentageChange: 0,
        }}
      />
    );

    expect(screen.getAllByText('0')).toHaveLength(2); // clicks and conversions
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    // "0%" appears in Conversion Rate card and in TrendIndicators
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1);
  });
});
