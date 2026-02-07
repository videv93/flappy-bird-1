import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DayDetailPanel } from './DayDetailPanel';

const mockGetDayDetail = vi.fn();

vi.mock('@/actions/streaks/getDayDetail', () => ({
  getDayDetail: (...args: unknown[]) => mockGetDayDetail(...args),
}));

describe('DayDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockGetDayDetail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);
    expect(screen.getByTestId('day-detail-skeleton')).toBeInTheDocument();
  });

  it('displays day details after load', async () => {
    mockGetDayDetail.mockResolvedValue({
      success: true,
      data: {
        date: '2026-02-01',
        minutesRead: 45,
        goalMinutes: 30,
        goalMet: true,
        freezeUsed: false,
        sessionCount: 3,
      },
    });

    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('45 min read')).toBeInTheDocument();
    });
    expect(screen.getByText('30 min goal')).toBeInTheDocument();
    expect(screen.getByText('3 sessions')).toBeInTheDocument();
    expect(screen.getByText('Goal met')).toBeInTheDocument();
  });

  it('shows freeze indicator when applicable', async () => {
    mockGetDayDetail.mockResolvedValue({
      success: true,
      data: {
        date: '2026-02-01',
        minutesRead: 0,
        goalMinutes: 30,
        goalMet: false,
        freezeUsed: true,
        sessionCount: 0,
      },
    });

    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('freeze-indicator')).toBeInTheDocument();
    });
    expect(screen.getByText('Freeze used')).toBeInTheDocument();
  });

  it('close button works', async () => {
    const onClose = vi.fn();
    mockGetDayDetail.mockResolvedValue({
      success: true,
      data: {
        date: '2026-02-01',
        minutesRead: 0,
        goalMinutes: null,
        goalMet: false,
        freezeUsed: false,
        sessionCount: 0,
      },
    });

    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Close day details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Close day details'));
    expect(onClose).toHaveBeenCalled();
  });

  it('has aria-live region for accessibility', () => {
    mockGetDayDetail.mockReturnValue(new Promise(() => {}));
    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);
    const liveRegion = screen.getByTestId('day-detail-panel').querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('shows "No goal set" when goalMinutes is null', async () => {
    mockGetDayDetail.mockResolvedValue({
      success: true,
      data: {
        date: '2026-02-01',
        minutesRead: 10,
        goalMinutes: null,
        goalMet: false,
        freezeUsed: false,
        sessionCount: 1,
      },
    });

    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No goal set')).toBeInTheDocument();
    });
  });

  it('shows singular "session" for count of 1', async () => {
    mockGetDayDetail.mockResolvedValue({
      success: true,
      data: {
        date: '2026-02-01',
        minutesRead: 10,
        goalMinutes: 30,
        goalMet: false,
        freezeUsed: false,
        sessionCount: 1,
      },
    });

    render(<DayDetailPanel date="2026-02-01" timezone="UTC" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('1 session')).toBeInTheDocument();
    });
  });
});
