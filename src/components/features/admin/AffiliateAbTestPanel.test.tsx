import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AffiliateAbTestPanel } from './AffiliateAbTestPanel';

describe('AffiliateAbTestPanel', () => {
  it('renders variant data with significance', () => {
    render(
      <AffiliateAbTestPanel
        data={{
          variants: [
            { variant: 'button-top', clicks: 500, conversions: 60, conversionRate: 12 },
            { variant: 'button-bottom', clicks: 500, conversions: 40, conversionRate: 8 },
          ],
          chiSquared: 4.5,
          significance: 'Significant (p < 0.05)',
        }}
      />
    );

    expect(screen.getByText('button-top')).toBeInTheDocument();
    expect(screen.getByText('button-bottom')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
    expect(screen.getByText('χ² = 4.5')).toBeInTheDocument();
    expect(screen.getByText('Significant (p < 0.05)')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<AffiliateAbTestPanel data={null} />);
    expect(screen.getByText(/No active A\/B tests/)).toBeInTheDocument();
  });

  it('renders empty state when no variants', () => {
    render(
      <AffiliateAbTestPanel
        data={{ variants: [], chiSquared: 0, significance: 'Not significant' }}
      />
    );
    expect(screen.getByText(/No active A\/B tests/)).toBeInTheDocument();
  });
});
