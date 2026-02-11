import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetPaymentStatus = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock('@/actions/billing', () => ({
  getPaymentStatus: mockGetPaymentStatus,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import UpgradeSuccessPage from './page';

describe('UpgradeSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGet.mockReturnValue('co_test_123');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    mockGetPaymentStatus.mockReturnValue(new Promise(() => {}));

    render(<UpgradeSuccessPage />);

    expect(screen.getByText('Verifying Your Payment...')).toBeInTheDocument();
  });

  it('shows success state when premium is confirmed', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      data: { isPremium: true, paymentStatus: 'COMPLETED' },
    });

    render(<UpgradeSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Premium!')).toBeInTheDocument();
    });
    expect(screen.getByText('Start Adding Books')).toBeInTheDocument();
    expect(screen.getByText('Go to Library')).toBeInTheDocument();
  });

  it('shows processing state when payment not yet confirmed', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      data: { isPremium: false, paymentStatus: 'PROCESSING' },
    });

    render(<UpgradeSuccessPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Verifying Your Payment...'),
      ).toBeInTheDocument();
    });
  });

  it('shows error state when getPaymentStatus fails', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      success: false,
      error: 'Unauthorized',
    });

    render(<UpgradeSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows error when checkout_id is missing', () => {
    mockGet.mockReturnValue(null);

    render(<UpgradeSuccessPage />);

    expect(
      screen.getByText('Missing Checkout Information'),
    ).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('polls for status when payment is processing', async () => {
    // First call: processing, second call: success
    mockGetPaymentStatus
      .mockResolvedValueOnce({
        success: true,
        data: { isPremium: false, paymentStatus: 'PROCESSING' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { isPremium: true, paymentStatus: 'COMPLETED' },
      });

    render(<UpgradeSuccessPage />);

    // Initial call → processing
    await waitFor(() => {
      expect(mockGetPaymentStatus).toHaveBeenCalledTimes(1);
    });

    // Advance timer to trigger poll
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockGetPaymentStatus).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome to Premium!')).toBeInTheDocument();
    });
  });

  it('shows slow state after max polling attempts', async () => {
    // All calls return processing
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      data: { isPremium: false, paymentStatus: 'PROCESSING' },
    });

    render(<UpgradeSuccessPage />);

    // Exhaust all 5 polling attempts (1 initial + 4 retries)
    for (let i = 0; i < 5; i++) {
      await waitFor(() => {
        expect(mockGetPaymentStatus).toHaveBeenCalledTimes(i + 1);
      });
      if (i < 4) {
        vi.advanceTimersByTime(3000);
      }
    }

    await waitFor(() => {
      expect(
        screen.getByText('Taking Longer Than Expected'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Check Again')).toBeInTheDocument();
  });

  it('has 44px minimum touch targets on CTA buttons', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      data: { isPremium: true, paymentStatus: 'COMPLETED' },
    });

    render(<UpgradeSuccessPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome to Premium!')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Adding Books').closest('a');
    expect(startButton?.className).toContain('min-h-[44px]');
  });
});
