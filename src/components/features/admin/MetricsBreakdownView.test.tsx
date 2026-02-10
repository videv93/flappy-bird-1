import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsBreakdownView } from './MetricsBreakdownView';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/actions/admin/getMetricsBreakdown', () => ({
  getMetricsBreakdown: vi.fn().mockResolvedValue({
    success: true,
    data: {
      category: 'user',
      entries: [{ date: '2026-01-15', value: 10 }],
      total: 10,
    },
  }),
}));

describe('MetricsBreakdownView', () => {
  it('renders section title', () => {
    render(<MetricsBreakdownView />);
    expect(screen.getByText('Detailed Breakdown')).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    render(<MetricsBreakdownView />);
    expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Engagement' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Social' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<MetricsBreakdownView />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('has minimum 44px touch targets on tabs', () => {
    render(<MetricsBreakdownView />);
    const usersTab = screen.getByRole('tab', { name: 'Users' });
    expect(usersTab).toHaveClass('min-h-[44px]');
  });
});
