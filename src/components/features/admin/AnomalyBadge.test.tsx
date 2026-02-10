import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnomalyBadge } from './AnomalyBadge';

describe('AnomalyBadge', () => {
  it('renders anomaly badge when isAnomaly is true', () => {
    render(<AnomalyBadge isAnomaly={true} />);
    expect(screen.getByText('Anomaly')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Anomaly detected' })).toBeInTheDocument();
  });

  it('does not render when isAnomaly is false', () => {
    const { container } = render(<AnomalyBadge isAnomaly={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('has red background styling', () => {
    render(<AnomalyBadge isAnomaly={true} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-red-100');
  });
});
