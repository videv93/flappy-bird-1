import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeFilter } from './DateRangeFilter';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('DateRangeFilter', () => {
  it('renders start and end date inputs', () => {
    render(<DateRangeFilter />);
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
  });

  it('updates URL params when start date changes', () => {
    render(<DateRangeFilter />);
    const startInput = screen.getByLabelText('Start date');
    fireEvent.change(startInput, { target: { value: '2026-01-15' } });
    expect(mockPush).toHaveBeenCalledWith('?startDate=2026-01-15');
  });

  it('updates URL params when end date changes', () => {
    render(<DateRangeFilter />);
    const endInput = screen.getByLabelText('End date');
    fireEvent.change(endInput, { target: { value: '2026-02-15' } });
    expect(mockPush).toHaveBeenCalledWith('?endDate=2026-02-15');
  });

  it('has minimum 44px touch targets', () => {
    render(<DateRangeFilter />);
    const startInput = screen.getByLabelText('Start date');
    expect(startInput).toHaveClass('min-h-[44px]');
  });
});
