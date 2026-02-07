import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeContent } from './HomeContent';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock goals components
vi.mock('@/components/features/goals', () => ({
  DailyGoalSetter: ({ onGoalSet }: { onGoalSet?: () => void }) => (
    <div data-testid="daily-goal-setter" onClick={onGoalSet}>
      Set your daily reading goal
    </div>
  ),
  DailyGoalProgress: ({
    minutesRead,
    goalMinutes,
  }: {
    minutesRead: number;
    goalMinutes: number;
  }) => (
    <div data-testid="daily-goal-progress">
      {minutesRead} of {goalMinutes} min today
    </div>
  ),
}));

// Mock streaks components
vi.mock('@/components/features/streaks', () => ({
  StreakRing: ({
    currentStreak,
    minutesRead,
    goalMinutes,
  }: {
    currentStreak: number;
    minutesRead: number;
    goalMinutes: number;
    freezeUsedToday?: boolean;
    size?: string;
  }) => (
    <div data-testid="streak-ring">
      Streak: {currentStreak}, {minutesRead}/{goalMinutes}
    </div>
  ),
  FreezeCountBadge: ({ count }: { count: number; max?: number }) => (
    <div data-testid="freeze-count-badge">{count} freezes</div>
  ),
  StreakFreezePrompt: ({
    freezesAvailable,
    currentStreak,
    onFreezeUsed,
    onDecline,
  }: {
    freezesAvailable: number;
    isAtRisk: boolean;
    currentStreak: number;
    onFreezeUsed: () => void;
    onDecline: () => void;
  }) => (
    <div data-testid="streak-freeze-prompt">
      Freeze prompt: {freezesAvailable} freezes, {currentStreak} streak
      <button onClick={onFreezeUsed}>Use Freeze</button>
      <button onClick={onDecline}>Decline</button>
    </div>
  ),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth logout
vi.mock('@/actions/auth/logout', () => ({
  logout: vi.fn(),
}));

const defaultProps = {
  userName: 'Alice' as string | null,
  userEmail: 'alice@example.com',
  userImage: null as string | null,
  dailyGoalMinutes: null as number | null,
  minutesRead: 0,
  currentStreak: 0,
  freezeUsedToday: false,
};

describe('HomeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows DailyGoalSetter when no goal is set', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.getByTestId('daily-goal-setter')).toBeInTheDocument();
    expect(screen.getByText('Set your daily reading goal')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-goal-progress')).not.toBeInTheDocument();
  });

  it('shows DailyGoalProgress when goal is set', () => {
    render(
      <HomeContent {...defaultProps} dailyGoalMinutes={30} minutesRead={15} />
    );

    expect(screen.getByTestId('daily-goal-progress')).toBeInTheDocument();
    expect(screen.getByText('15 of 30 min today')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-goal-setter')).not.toBeInTheDocument();
  });

  it('renders welcome message with user name', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.getByText('Welcome, Alice!')).toBeInTheDocument();
  });

  it('renders welcome message without name', () => {
    render(<HomeContent {...defaultProps} userName={null} />);

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('renders goal section with data-testid', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.getByTestId('goal-section')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  // Streak integration tests
  it('renders StreakRing when goal is set', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={10}
        currentStreak={5}
      />
    );

    expect(screen.getByTestId('streak-ring')).toBeInTheDocument();
    expect(screen.getByText('Streak: 5, 10/30')).toBeInTheDocument();
  });

  it('does not render StreakRing when no goal is set', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.queryByTestId('streak-ring')).not.toBeInTheDocument();
  });

  it('renders both StreakRing and DailyGoalProgress when goal is set', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={15}
        currentStreak={3}
      />
    );

    expect(screen.getByTestId('streak-ring')).toBeInTheDocument();
    expect(screen.getByTestId('daily-goal-progress')).toBeInTheDocument();
  });

  // Streak status messaging tests (Story 3.6)
  it('shows streak at risk message when at risk with no freezes available', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={0}
        currentStreak={5}
        isStreakAtRisk={true}
        freezesAvailable={0}
      />
    );

    expect(screen.getByTestId('streak-at-risk-message')).toBeInTheDocument();
    expect(screen.getByText(/your book is waiting/i)).toBeInTheDocument();
  });

  it('does not show streak at risk message when streak is healthy', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={10}
        currentStreak={5}
        isStreakAtRisk={false}
      />
    );

    expect(screen.queryByTestId('streak-at-risk-message')).not.toBeInTheDocument();
  });

  it('does not show streak at risk message when streak is 0', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={0}
        currentStreak={0}
        isStreakAtRisk={true}
      />
    );

    expect(screen.queryByTestId('streak-at-risk-message')).not.toBeInTheDocument();
  });

  // Freeze UI tests (Story 3.7)
  it('renders FreezeCountBadge with correct count when goal is set', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={10}
        currentStreak={5}
        freezesAvailable={3}
      />
    );

    expect(screen.getByTestId('freeze-count-badge')).toBeInTheDocument();
    expect(screen.getByText('3 freezes')).toBeInTheDocument();
  });

  it('renders StreakFreezePrompt when at risk with freezes available', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={0}
        currentStreak={5}
        isStreakAtRisk={true}
        freezesAvailable={3}
      />
    );

    expect(screen.getByTestId('streak-freeze-prompt')).toBeInTheDocument();
    expect(screen.queryByTestId('streak-at-risk-message')).not.toBeInTheDocument();
  });

  it('does NOT render StreakFreezePrompt when not at risk', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={10}
        currentStreak={5}
        isStreakAtRisk={false}
        freezesAvailable={3}
      />
    );

    expect(screen.queryByTestId('streak-freeze-prompt')).not.toBeInTheDocument();
  });

  it('does NOT render StreakFreezePrompt when no freezes available', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={0}
        currentStreak={5}
        isStreakAtRisk={true}
        freezesAvailable={0}
      />
    );

    expect(screen.queryByTestId('streak-freeze-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('streak-at-risk-message')).toBeInTheDocument();
  });

  it('does NOT render FreezeCountBadge when no goal is set', () => {
    render(<HomeContent {...defaultProps} />);

    expect(screen.queryByTestId('freeze-count-badge')).not.toBeInTheDocument();
  });

  it('does NOT render FreezeCountBadge when streak is 0 and no freezes available', () => {
    render(
      <HomeContent
        {...defaultProps}
        dailyGoalMinutes={30}
        minutesRead={0}
        currentStreak={0}
        freezesAvailable={0}
      />
    );

    expect(screen.queryByTestId('freeze-count-badge')).not.toBeInTheDocument();
  });
});
