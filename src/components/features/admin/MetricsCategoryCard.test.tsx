import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsCategoryCard } from './MetricsCategoryCard';
import { Users } from 'lucide-react';

describe('MetricsCategoryCard', () => {
  it('renders category title', () => {
    render(
      <MetricsCategoryCard
        title="Users"
        icon={Users}
        metrics={[{ label: 'Total Users', value: 1000 }]}
      />,
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders all metric rows', () => {
    render(
      <MetricsCategoryCard
        title="Users"
        icon={Users}
        metrics={[
          { label: 'Total Users', value: 1000 },
          { label: 'New Today', value: 5 },
          { label: 'DAU', value: 50 },
        ]}
      />,
    );
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('New Today')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('DAU')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders string metric values', () => {
    render(
      <MetricsCategoryCard
        title="Engagement"
        icon={Users}
        metrics={[{ label: 'Reading Time', value: '100.5h' }]}
      />,
    );
    expect(screen.getByText('100.5h')).toBeInTheDocument();
  });

  it('renders trend indicator when trend data is provided', () => {
    render(
      <MetricsCategoryCard
        title="Users"
        icon={Users}
        metrics={[
          {
            label: 'Total Users',
            value: 1000,
            trend: {
              dataPoints: [
                { date: '2026-01-01', value: 1 },
                { date: '2026-01-02', value: 2 },
              ],
              percentageChange: 25,
              isAnomaly: false,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders anomaly badge when trend has anomaly', () => {
    render(
      <MetricsCategoryCard
        title="Users"
        icon={Users}
        metrics={[
          {
            label: 'Total Users',
            value: 1000,
            trend: {
              dataPoints: [
                { date: '2026-01-01', value: 1 },
                { date: '2026-01-02', value: 2 },
              ],
              percentageChange: 200,
              isAnomaly: true,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText('Anomaly')).toBeInTheDocument();
  });
});
