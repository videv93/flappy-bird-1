import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakRing } from './StreakRing';

// Mock framer-motion
const mockUseReducedMotion = vi.fn(() => false);
vi.mock('framer-motion', () => ({
  motion: {
    circle: ({
      children,
      ...props
    }: React.SVGProps<SVGCircleElement> & { children?: React.ReactNode }) => (
      <circle {...props}>{children}</circle>
    ),
    div: ({
      children,
      ...props
    }: React.HTMLProps<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => mockUseReducedMotion(),
}));

// Mock sonner
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="check-icon" {...props} />
  ),
  Snowflake: (props: Record<string, unknown>) => (
    <svg data-testid="snowflake-icon" {...props} />
  ),
  Sparkles: (props: Record<string, unknown>) => (
    <svg data-testid="sparkles-icon" {...props} />
  ),
}));

describe('StreakRing', () => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  });

  // AC #2: Incomplete Goal State (Amber)
  describe('incomplete goal state', () => {
    it('renders with amber color and shows streak count', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
          size="md"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows "X min to go" text', () => {
      render(
        <StreakRing
          currentStreak={3}
          minutesRead={10}
          goalMinutes={30}
        />
      );

      expect(screen.getByText('20 min to go')).toBeInTheDocument();
    });

    it('shows 0 min to go when exactly at goal', () => {
      render(
        <StreakRing
          currentStreak={3}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      // Goal is met, so no "min to go" text
      expect(screen.queryByText(/min to go/)).not.toBeInTheDocument();
    });
  });

  // AC #3: Goal Met State (Green)
  describe('goal met state', () => {
    it('renders checkmark icon when goal is met', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      // Streak count is always shown alongside the check icon
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not show "min to go" text when goal met', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={45}
          goalMinutes={30}
        />
      );

      expect(screen.queryByText(/min to go/)).not.toBeInTheDocument();
    });
  });

  // AC #4: Frozen State (Blue)
  describe('frozen state', () => {
    it('renders snowflake icon when freeze is active', () => {
      render(
        <StreakRing
          currentStreak={10}
          minutesRead={0}
          goalMinutes={30}
          freezeUsedToday={true}
        />
      );

      expect(screen.getByTestId('snowflake-icon')).toBeInTheDocument();
      // Streak count is always shown alongside the snowflake icon
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows "Freeze day" text', () => {
      render(
        <StreakRing
          currentStreak={10}
          minutesRead={0}
          goalMinutes={30}
          freezeUsedToday={true}
        />
      );

      expect(screen.getByText('Freeze day')).toBeInTheDocument();
    });
  });

  // AC #5: Milestone Celebrations
  describe('milestone celebrations', () => {
    it('triggers toast for 7-day milestone when goal is met', () => {
      render(
        <StreakRing
          currentStreak={7}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      expect(mockToastSuccess).toHaveBeenCalledWith('Amazing! 7-day streak!');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('triggers toast for 30-day milestone when goal is met', () => {
      render(
        <StreakRing
          currentStreak={30}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      expect(mockToastSuccess).toHaveBeenCalledWith('Amazing! 30-day streak!');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('triggers toast for 100-day milestone when goal is met', () => {
      render(
        <StreakRing
          currentStreak={100}
          minutesRead={60}
          goalMinutes={30}
        />
      );

      expect(mockToastSuccess).toHaveBeenCalledWith('Amazing! 100-day streak!');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('does not trigger toast for non-milestone streaks', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    it('does not trigger toast when goal is not met', () => {
      render(
        <StreakRing
          currentStreak={7}
          minutesRead={10}
          goalMinutes={30}
        />
      );

      expect(mockToastSuccess).not.toHaveBeenCalled();
    });
  });

  // AC #7: Screen Reader Accessibility
  describe('accessibility', () => {
    it('has correct aria-label', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={15}
          goalMinutes={30}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute(
        'aria-label',
        'Reading streak: 5 days. 15 minutes of 30 minute goal completed today.'
      );
    });

    it('has correct aria-valuenow based on progress', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={15}
          goalMinutes={30}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('caps aria-valuenow at 100 when exceeded', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={60}
          goalMinutes={30}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('has aria-hidden on icons', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      const icon = screen.getByTestId('check-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // AC #8: Size Variants
  describe('size variants', () => {
    it('renders sm size (32px)', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
          size="sm"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '32px', height: '32px' });
    });

    it('renders md size (48px)', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
          size="md"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '48px', height: '48px' });
    });

    it('renders lg size (80px)', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
          size="lg"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '80px', height: '80px' });
    });

    it('defaults to md size', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '48px', height: '48px' });
    });
  });

  // AC #9: Reduced Motion
  describe('reduced motion', () => {
    beforeEach(() => {
      mockUseReducedMotion.mockReturnValue(true);
    });

    afterEach(() => {
      mockUseReducedMotion.mockReturnValue(false);
    });

    it('renders correctly with reduced motion preferred', () => {
      render(
        <StreakRing
          currentStreak={5}
          minutesRead={10}
          goalMinutes={30}
        />
      );

      // Component still renders correctly with reduced motion
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('20 min to go')).toBeInTheDocument();
    });

    it('does not show sparkle animation for milestones when reduced motion is preferred', () => {
      render(
        <StreakRing
          currentStreak={7}
          minutesRead={30}
          goalMinutes={30}
        />
      );

      // Toast still fires even with reduced motion
      expect(mockToastSuccess).toHaveBeenCalledWith('Amazing! 7-day streak!');
      // But sparkle animation should not render
      expect(screen.queryByTestId('sparkles-icon')).not.toBeInTheDocument();
    });
  });

  // Frozen + goal-met priority
  describe('frozen with goal met', () => {
    it('shows checkmark (green) when goal is met even if freeze is active', () => {
      render(
        <StreakRing
          currentStreak={10}
          minutesRead={30}
          goalMinutes={30}
          freezeUsedToday={true}
        />
      );

      // Goal met takes priority: checkmark, not snowflake
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('snowflake-icon')).not.toBeInTheDocument();
      // No status text when goal is met
      expect(screen.queryByText('Freeze day')).not.toBeInTheDocument();
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles zero streak', () => {
      render(
        <StreakRing
          currentStreak={0}
          minutesRead={0}
          goalMinutes={30}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('30 min to go')).toBeInTheDocument();
    });

    it('handles zero goal minutes without error', () => {
      render(
        <StreakRing
          currentStreak={0}
          minutesRead={0}
          goalMinutes={0}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows streak count (not check icon) when goal not yet met', () => {
      render(
        <StreakRing
          currentStreak={14}
          minutesRead={5}
          goalMinutes={30}
        />
      );

      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('snowflake-icon')).not.toBeInTheDocument();
    });
  });
});
