import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadingStats } from './ReadingStats';

describe('ReadingStats', () => {
  it('renders empty state when sessionCount is 0', () => {
    render(<ReadingStats totalSeconds={0} sessionCount={0} avgSeconds={0} />);

    expect(screen.getByTestId('reading-stats-empty')).toBeInTheDocument();
    expect(screen.getByText('Start reading to see your stats!')).toBeInTheDocument();
  });

  it('renders total time in hours and minutes', () => {
    render(<ReadingStats totalSeconds={7260} sessionCount={5} avgSeconds={1452} />);

    expect(screen.getByTestId('reading-stats-total-time')).toHaveTextContent('2h 1m');
  });

  it('renders total time in minutes only when under an hour', () => {
    render(<ReadingStats totalSeconds={1800} sessionCount={3} avgSeconds={600} />);

    expect(screen.getByTestId('reading-stats-total-time')).toHaveTextContent('30m');
  });

  it('renders session count', () => {
    render(<ReadingStats totalSeconds={3600} sessionCount={12} avgSeconds={300} />);

    expect(screen.getByTestId('reading-stats-session-count')).toHaveTextContent('12');
  });

  it('renders average session duration formatted as time', () => {
    // 720 seconds = 12:00
    render(<ReadingStats totalSeconds={3600} sessionCount={5} avgSeconds={720} />);

    expect(screen.getByTestId('reading-stats-avg-duration')).toHaveTextContent('12:00');
  });

  it('renders the stats grid', () => {
    render(<ReadingStats totalSeconds={3600} sessionCount={5} avgSeconds={720} />);

    expect(screen.getByTestId('reading-stats')).toBeInTheDocument();
    expect(screen.getByText('Total time')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Avg session')).toBeInTheDocument();
  });
});
