import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StreakHistoryView } from './StreakHistoryView';

const mockGetStreakHistory = vi.fn();

vi.mock('@/actions/streaks/getStreakHistory', () => ({
  getStreakHistory: (...args: unknown[]) => mockGetStreakHistory(...args),
}));

vi.mock('@/actions/streaks/getDayDetail', () => ({
  getDayDetail: vi.fn().mockResolvedValue({
    success: true,
    data: {
      date: '2026-02-01',
      minutesRead: 30,
      goalMinutes: 30,
      goalMet: true,
      freezeUsed: false,
      sessionCount: 2,
    },
  }),
}));

describe('StreakHistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays heatmap on mount', async () => {
    mockGetStreakHistory.mockResolvedValue({
      success: true,
      data: {
        history: [
          { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
        ],
        currentStreak: 5,
        longestStreak: 10,
        dailyGoalMinutes: 30,
      },
    });

    render(<StreakHistoryView />);

    await waitFor(() => {
      expect(screen.getByTestId('streak-history-view')).toBeInTheDocument();
    });
    expect(screen.getByTestId('streak-heatmap')).toBeInTheDocument();
  });

  it('shows day detail panel when day selected', async () => {
    mockGetStreakHistory.mockResolvedValue({
      success: true,
      data: {
        history: [
          { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
        ],
        currentStreak: 5,
        longestStreak: 10,
        dailyGoalMinutes: 30,
      },
    });

    render(<StreakHistoryView />);

    await waitFor(() => {
      expect(screen.getByTestId('streak-heatmap')).toBeInTheDocument();
    });

    // Click a day cell
    const cell = screen.getByLabelText(/2026-02-01/);
    fireEvent.click(cell);

    await waitFor(() => {
      expect(screen.getByTestId('day-detail-panel')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockGetStreakHistory.mockResolvedValue({
      success: false,
      error: 'Failed',
    });

    render(<StreakHistoryView />);

    await waitFor(() => {
      expect(screen.getByTestId('streak-history-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Unable to load streak history.')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockGetStreakHistory.mockReturnValue(new Promise(() => {}));
    render(<StreakHistoryView />);
    expect(screen.getByTestId('streak-history-loading')).toBeInTheDocument();
  });

  it('shows initial streak stats during loading', () => {
    mockGetStreakHistory.mockReturnValue(new Promise(() => {}));
    render(<StreakHistoryView initialCurrentStreak={5} initialLongestStreak={10} />);
    expect(screen.getByTestId('streak-history-loading')).toBeInTheDocument();
    expect(screen.getByTestId('streak-stats-preview')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows load more button when less than 365 days', async () => {
    mockGetStreakHistory.mockResolvedValue({
      success: true,
      data: {
        history: [],
        currentStreak: 0,
        longestStreak: 0,
        dailyGoalMinutes: null,
      },
    });

    render(<StreakHistoryView />);

    await waitFor(() => {
      expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
    });
  });
});
