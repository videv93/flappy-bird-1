import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreakFreezePrompt } from './StreakFreezePrompt';

// Mock useStreakFreeze server action
const mockUseStreakFreeze = vi.fn();
vi.mock('@/actions/streaks/useStreakFreeze', () => ({
  useStreakFreeze: (...args: unknown[]) => mockUseStreakFreeze(...args),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from 'sonner';
const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

const defaultProps = {
  freezesAvailable: 3,
  isAtRisk: true,
  currentStreak: 5,
  onFreezeUsed: vi.fn(),
  onDecline: vi.fn(),
};

describe('StreakFreezePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStreakFreeze.mockResolvedValue({
      success: true,
      data: {
        freezeApplied: true,
        freezesRemaining: 2,
        currentStreak: 5,
        reason: 'freeze_applied',
      },
    });
  });

  it('renders when isAtRisk is true and freezesAvailable > 0', () => {
    render(<StreakFreezePrompt {...defaultProps} />);

    expect(screen.getByTestId('streak-freeze-prompt')).toBeInTheDocument();
    expect(screen.getByText(/use a freeze to protect your 5-day streak/i)).toBeInTheDocument();
  });

  it('does NOT render when freezesAvailable is 0', () => {
    render(<StreakFreezePrompt {...defaultProps} freezesAvailable={0} />);

    expect(screen.queryByTestId('streak-freeze-prompt')).not.toBeInTheDocument();
  });

  it('does NOT render when isAtRisk is false', () => {
    render(<StreakFreezePrompt {...defaultProps} isAtRisk={false} />);

    expect(screen.queryByTestId('streak-freeze-prompt')).not.toBeInTheDocument();
  });

  it('shows correct freeze count', () => {
    render(<StreakFreezePrompt {...defaultProps} freezesAvailable={2} />);

    expect(screen.getByText('2 freezes remaining')).toBeInTheDocument();
  });

  it('shows singular "freeze" when count is 1', () => {
    render(<StreakFreezePrompt {...defaultProps} freezesAvailable={1} />);

    expect(screen.getByText('1 freeze remaining')).toBeInTheDocument();
  });

  it('"Use Freeze" button calls action and onFreezeUsed callback', async () => {
    const user = userEvent.setup();
    const onFreezeUsed = vi.fn();
    render(<StreakFreezePrompt {...defaultProps} onFreezeUsed={onFreezeUsed} />);

    await user.click(screen.getByRole('button', { name: /use streak freeze/i }));

    await waitFor(() => {
      expect(mockUseStreakFreeze).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith('Streak protected with freeze!');
      expect(onFreezeUsed).toHaveBeenCalled();
    });
  });

  it('"Let It Reset" button calls onDecline callback', async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    render(<StreakFreezePrompt {...defaultProps} onDecline={onDecline} />);

    await user.click(screen.getByRole('button', { name: /let streak reset/i }));

    expect(onDecline).toHaveBeenCalled();
  });

  it('shows loading state during freeze application', async () => {
    let resolveFreeze: (value: unknown) => void;
    mockUseStreakFreeze.mockReturnValue(
      new Promise((resolve) => {
        resolveFreeze = resolve;
      })
    );

    const user = userEvent.setup();
    render(<StreakFreezePrompt {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /use streak freeze/i }));

    expect(screen.getByText('Applying...')).toBeInTheDocument();

    resolveFreeze!({
      success: true,
      data: { freezeApplied: true, freezesRemaining: 2, currentStreak: 5, reason: 'freeze_applied' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Applying...')).not.toBeInTheDocument();
    });
  });

  it('shows error toast when action fails', async () => {
    mockUseStreakFreeze.mockResolvedValue({
      success: false,
      error: 'Failed to apply streak freeze',
    });

    const user = userEvent.setup();
    render(<StreakFreezePrompt {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /use streak freeze/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to apply streak freeze');
    });
  });

  it('shows info toast when already frozen', async () => {
    mockUseStreakFreeze.mockResolvedValue({
      success: true,
      data: { freezeApplied: false, freezesRemaining: 3, currentStreak: 5, reason: 'already_frozen' },
    });

    const user = userEvent.setup();
    render(<StreakFreezePrompt {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /use streak freeze/i }));

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith('Freeze already applied for yesterday');
    });
  });

  it('has correct accessibility attributes', () => {
    render(<StreakFreezePrompt {...defaultProps} />);

    const useButton = screen.getByRole('button', { name: /use streak freeze/i });
    const resetButton = screen.getByRole('button', { name: /let streak reset/i });

    expect(useButton).toBeInTheDocument();
    expect(resetButton).toBeInTheDocument();

    // Min 44px touch targets
    expect(useButton).toHaveClass('min-h-[44px]');
    expect(resetButton).toHaveClass('min-h-[44px]');
  });
});
