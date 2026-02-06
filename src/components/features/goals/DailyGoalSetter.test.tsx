import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyGoalSetter } from './DailyGoalSetter';

// Mock goals actions
const mockSetDailyGoal = vi.fn();
vi.mock('@/actions/goals', () => ({
  setDailyGoal: (...args: unknown[]) => mockSetDailyGoal(...args),
}));

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('DailyGoalSetter', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preset goal buttons', () => {
    render(<DailyGoalSetter />);

    expect(screen.getByTestId('goal-preset-5')).toHaveTextContent('5 min');
    expect(screen.getByTestId('goal-preset-15')).toHaveTextContent('15 min');
    expect(screen.getByTestId('goal-preset-30')).toHaveTextContent('30 min');
    expect(screen.getByTestId('goal-preset-60')).toHaveTextContent('60 min');
    expect(screen.getByTestId('goal-preset-custom')).toHaveTextContent('Custom');
  });

  it('renders confirm button disabled initially', () => {
    render(<DailyGoalSetter />);

    expect(screen.getByTestId('goal-confirm-button')).toBeDisabled();
  });

  it('enables confirm button after selecting a preset', async () => {
    render(<DailyGoalSetter />);

    await user.click(screen.getByTestId('goal-preset-30'));
    expect(screen.getByTestId('goal-confirm-button')).not.toBeDisabled();
  });

  it('shows custom input when Custom button is clicked', async () => {
    render(<DailyGoalSetter />);

    await user.click(screen.getByTestId('goal-preset-custom'));
    expect(screen.getByTestId('goal-custom-input')).toBeInTheDocument();
  });

  it('enables confirm after entering valid custom value', async () => {
    render(<DailyGoalSetter />);

    await user.click(screen.getByTestId('goal-preset-custom'));
    await user.type(screen.getByTestId('goal-custom-input'), '45');
    expect(screen.getByTestId('goal-confirm-button')).not.toBeDisabled();
  });

  it('calls setDailyGoal and shows success toast on confirm', async () => {
    mockSetDailyGoal.mockResolvedValue({ success: true, data: { dailyGoalMinutes: 30 } });
    const onGoalSet = vi.fn();

    render(<DailyGoalSetter onGoalSet={onGoalSet} />);

    await user.click(screen.getByTestId('goal-preset-30'));
    await user.click(screen.getByTestId('goal-confirm-button'));

    expect(mockSetDailyGoal).toHaveBeenCalledWith({ dailyGoalMinutes: 30 });
    expect(mockToastSuccess).toHaveBeenCalledWith('Your daily goal is 30 minutes');
    expect(onGoalSet).toHaveBeenCalledWith(30);
  });

  it('shows error toast on failure', async () => {
    mockSetDailyGoal.mockResolvedValue({ success: false, error: 'Failed to set goal' });

    render(<DailyGoalSetter />);

    await user.click(screen.getByTestId('goal-preset-15'));
    await user.click(screen.getByTestId('goal-confirm-button'));

    expect(mockToastError).toHaveBeenCalledWith('Failed to set goal');
  });

  it('shows current goal as selected when currentGoal prop is provided', () => {
    render(<DailyGoalSetter currentGoal={30} />);

    // The confirm button should be enabled since a goal is pre-selected
    expect(screen.getByTestId('goal-confirm-button')).not.toBeDisabled();
  });

  it('has minimum 44px touch targets on buttons', () => {
    render(<DailyGoalSetter />);

    const presetButton = screen.getByTestId('goal-preset-5');
    expect(presetButton.className).toContain('min-h-[44px]');
    expect(presetButton.className).toContain('min-w-[44px]');
  });

  it('renders card with heading', () => {
    render(<DailyGoalSetter />);

    expect(screen.getByText('Set your daily reading goal')).toBeInTheDocument();
    expect(screen.getByTestId('daily-goal-setter')).toBeInTheDocument();
  });
});
