import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyGoalProgress } from './DailyGoalProgress';

describe('DailyGoalProgress', () => {
  it('displays progress text when goal is not met', () => {
    render(<DailyGoalProgress minutesRead={10} goalMinutes={30} />);

    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent('10 of 30 min today');
  });

  it('displays "Goal met!" when goal is achieved', () => {
    render(<DailyGoalProgress minutesRead={30} goalMinutes={30} />);

    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent('Goal met!');
  });

  it('displays "Goal met!" when minutes exceed goal', () => {
    render(<DailyGoalProgress minutesRead={45} goalMinutes={30} />);

    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent('Goal met!');
  });

  it('displays empty state when no minutes read', () => {
    render(<DailyGoalProgress minutesRead={0} goalMinutes={30} />);

    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent(
      '0 of 30 min today — start reading!'
    );
  });

  it('renders progress bar with correct aria attributes', () => {
    render(<DailyGoalProgress minutesRead={15} goalMinutes={30} />);

    const progressBar = screen.getByTestId('goal-progress-bar');
    expect(progressBar).toHaveAttribute('role', 'progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '15');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '30');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      '15 minutes of 30 minute daily goal completed today'
    );
  });

  it('uses green color when goal is met', () => {
    render(<DailyGoalProgress minutesRead={30} goalMinutes={30} />);

    const fill = screen.getByTestId('goal-progress-fill');
    expect(fill.className).toContain('bg-green-500');
  });

  it('uses amber color when goal is not met', () => {
    render(<DailyGoalProgress minutesRead={10} goalMinutes={30} />);

    const fill = screen.getByTestId('goal-progress-fill');
    expect(fill.className).toContain('bg-amber-500');
  });

  it('caps progress bar at 100%', () => {
    render(<DailyGoalProgress minutesRead={60} goalMinutes={30} />);

    const fill = screen.getByTestId('goal-progress-fill');
    expect(fill.style.width).toBe('100%');
  });

  it('shows correct percentage width for partial progress', () => {
    render(<DailyGoalProgress minutesRead={15} goalMinutes={30} />);

    const fill = screen.getByTestId('goal-progress-fill');
    expect(fill.style.width).toBe('50%');
  });

  it('has motion-reduce class for reduced motion preference', () => {
    render(<DailyGoalProgress minutesRead={15} goalMinutes={30} />);

    const fill = screen.getByTestId('goal-progress-fill');
    expect(fill.className).toContain('motion-reduce:transition-none');
  });

  it('announces goal met status in aria-label', () => {
    render(<DailyGoalProgress minutesRead={30} goalMinutes={30} />);

    const progressBar = screen.getByTestId('goal-progress-bar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      'Daily reading goal met! 30 minutes of 30 minute goal completed today'
    );
  });
});
