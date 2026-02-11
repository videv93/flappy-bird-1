import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/actions/billing', () => ({
  createCheckout: vi.fn(),
}));

vi.mock('@/actions/books', () => ({
  getBookLimitInfo: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
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

import UpgradePage from './page';
import { createCheckout } from '@/actions/billing';
import { getBookLimitInfo } from '@/actions/books';
import { toast } from 'sonner';

const mockCreateCheckout = createCheckout as ReturnType<typeof vi.fn>;
const mockGetBookLimitInfo = getBookLimitInfo as ReturnType<typeof vi.fn>;

describe('UpgradePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBookLimitInfo.mockResolvedValue({
      success: true,
      data: { isPremium: false, currentBookCount: 3, maxBooks: 3 },
    });
    // Reset location mock
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  it('shows loading state initially', () => {
    // Use a pending promise so getBookLimitInfo never resolves during this test
    mockGetBookLimitInfo.mockReturnValue(new Promise(() => {}));

    render(<UpgradePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proceed to Payment' })
    ).not.toBeInTheDocument();
  });

  it('renders premium benefits and CTA button', async () => {
    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
    expect(screen.getByText('unlimited book tracking')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('calls createCheckout and redirects on success', async () => {
    mockCreateCheckout.mockResolvedValue({
      success: true,
      data: { checkoutUrl: 'https://checkout.polar.sh/test' },
    });
    const user = userEvent.setup();

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).not.toBeDisabled();
    });

    await user.click(
      screen.getByRole('button', { name: 'Proceed to Payment' })
    );

    await waitFor(() => {
      expect(mockCreateCheckout).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.polar.sh/test');
    });
  });

  it('shows loading state during checkout creation', async () => {
    let resolveCheckout: (value: unknown) => void;
    mockCreateCheckout.mockReturnValue(
      new Promise((resolve) => {
        resolveCheckout = resolve;
      })
    );
    const user = userEvent.setup();

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).not.toBeDisabled();
    });

    await user.click(
      screen.getByRole('button', { name: 'Proceed to Payment' })
    );

    await waitFor(() => {
      expect(screen.getByText('Creating checkout...')).toBeInTheDocument();
    });

    resolveCheckout!({
      success: true,
      data: { checkoutUrl: 'https://checkout.polar.sh/test' },
    });
  });

  it('shows error toast on failure', async () => {
    mockCreateCheckout.mockResolvedValue({
      success: false,
      error: 'Failed to create checkout session',
    });
    const user = userEvent.setup();

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).not.toBeDisabled();
    });

    await user.click(
      screen.getByRole('button', { name: 'Proceed to Payment' })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create checkout session'
      );
    });
  });

  it('shows "Already premium" state when user is premium', async () => {
    mockGetBookLimitInfo.mockResolvedValue({
      success: true,
      data: { isPremium: true, currentBookCount: 5, maxBooks: 3 },
    });

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByText("You're Already Premium!")
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Proceed to Payment' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Back to Library')).toBeInTheDocument();
  });

  it('shows "Already premium" when createCheckout returns already premium error', async () => {
    mockCreateCheckout.mockResolvedValue({
      success: false,
      error: 'Already premium',
    });
    const user = userEvent.setup();

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).not.toBeDisabled();
    });

    await user.click(
      screen.getByRole('button', { name: 'Proceed to Payment' })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "You're already a premium member!"
      );
    });
  });

  it('falls back to non-premium when getBookLimitInfo fails', async () => {
    mockGetBookLimitInfo.mockResolvedValue({
      success: false,
      error: 'Server error',
    });

    render(<UpgradePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Proceed to Payment' })
      ).not.toBeDisabled();
    });
  });
});
