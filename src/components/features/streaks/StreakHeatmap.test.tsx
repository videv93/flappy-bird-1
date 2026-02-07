import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreakHeatmap } from './StreakHeatmap';
import type { StreakHistoryDay } from '@/actions/streaks/getStreakHistory';

function makeHistory(days: number): StreakHistoryDay[] {
  const history: StreakHistoryDay[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    history.push({
      date: dateStr,
      minutesRead: i % 3 === 0 ? 30 : i % 3 === 1 ? 0 : 10,
      goalMet: i % 3 === 0,
      freezeUsed: i % 5 === 0 && i % 3 !== 0,
    });
  }
  return history;
}

describe('StreakHeatmap', () => {
  const defaultProps = {
    history: makeHistory(90),
    currentStreak: 7,
    longestStreak: 30,
    dailyGoalMinutes: 30,
    onDaySelect: vi.fn(),
  };

  it('renders the heatmap container', () => {
    render(<StreakHeatmap {...defaultProps} />);
    expect(screen.getByTestId('streak-heatmap')).toBeInTheDocument();
  });

  it('renders day cells for history', () => {
    render(<StreakHeatmap {...defaultProps} />);
    // Should have many grid cells (buttons for days with dates)
    const buttons = screen.getAllByRole('gridcell');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('colors cells correctly — green for goalMet', () => {
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01.*Goal met/);
    expect(cell).toBeInTheDocument();
    expect(cell.className).toContain('bg-green-500');
  });

  it('colors cells correctly — blue for freezeUsed', () => {
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 0, goalMet: false, freezeUsed: true },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01.*Freeze used/);
    expect(cell).toBeInTheDocument();
    expect(cell.className).toContain('bg-blue-500');
  });

  it('colors cells correctly — gray for missed', () => {
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 5, goalMet: false, freezeUsed: false },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01.*Missed/);
    expect(cell).toBeInTheDocument();
    expect(cell.className).toContain('bg-gray-300');
  });

  it('displays current and longest streak', () => {
    render(<StreakHeatmap {...defaultProps} />);
    const stats = screen.getByTestId('streak-stats');
    expect(stats).toHaveTextContent('Current streak:');
    expect(stats).toHaveTextContent('7');
    expect(stats).toHaveTextContent('Best:');
    expect(stats).toHaveTextContent('30');
  });

  it('fires onDaySelect callback on cell click', () => {
    const onDaySelect = vi.fn();
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
        onDaySelect={onDaySelect}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01/);
    fireEvent.click(cell);
    expect(onDaySelect).toHaveBeenCalledWith('2026-02-01');
  });

  it('shows month labels', () => {
    render(<StreakHeatmap {...defaultProps} />);
    // At minimum, the current month should appear
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();
  });

  it('shows day-of-week labels', () => {
    render(<StreakHeatmap {...defaultProps} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('shows color legend', () => {
    render(<StreakHeatmap {...defaultProps} />);
    const legend = screen.getByTestId('heatmap-legend');
    expect(legend).toHaveTextContent('Goal Met');
    expect(legend).toHaveTextContent('Freeze Used');
    expect(legend).toHaveTextContent('Missed');
  });

  it('cells have aria-labels for accessibility', () => {
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01: Goal met, 30 minutes read/);
    expect(cell).toBeInTheDocument();
  });

  it('supports keyboard navigation with Enter key', () => {
    const onDaySelect = vi.fn();
    const history: StreakHistoryDay[] = [
      { date: '2026-02-01', minutesRead: 30, goalMet: true, freezeUsed: false },
    ];
    render(
      <StreakHeatmap
        {...defaultProps}
        history={history}
        onDaySelect={onDaySelect}
      />
    );
    const cell = screen.getByLabelText(/2026-02-01/);
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(onDaySelect).toHaveBeenCalledWith('2026-02-01');
  });

  it('uses singular "day" for streak of 1', () => {
    render(
      <StreakHeatmap
        {...defaultProps}
        currentStreak={1}
        longestStreak={1}
      />
    );
    const stats = screen.getByTestId('streak-stats');
    expect(stats).toHaveTextContent('1 day');
  });
});
