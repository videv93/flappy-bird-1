import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpgradePromptDialog } from './UpgradePromptDialog';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('UpgradePromptDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentBookCount: 3,
    maxBooks: 3,
  };

  it('renders celebratory title when open', () => {
    render(<UpgradePromptDialog {...defaultProps} />);

    expect(screen.getByText("You're a power reader!")).toBeInTheDocument();
  });

  it('displays book count in description', () => {
    render(<UpgradePromptDialog {...defaultProps} currentBookCount={3} maxBooks={3} />);

    expect(screen.getByText('3/3 books')).toBeInTheDocument();
  });

  it('displays different book count correctly', () => {
    render(<UpgradePromptDialog {...defaultProps} currentBookCount={2} maxBooks={3} />);

    expect(screen.getByText('2/3 books')).toBeInTheDocument();
  });

  it('renders Upgrade to Premium CTA button with link to /upgrade', () => {
    render(<UpgradePromptDialog {...defaultProps} />);

    const upgradeLink = screen.getByRole('link', { name: /upgrade to premium/i });
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink).toHaveAttribute('href', '/upgrade');
  });

  it('renders Maybe Later cancel button', () => {
    render(<UpgradePromptDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: /maybe later/i })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Maybe Later is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<UpgradePromptDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: /maybe later/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render dialog content when open is false', () => {
    render(<UpgradePromptDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("You're a power reader!")).not.toBeInTheDocument();
  });

  it('displays premium benefits text', () => {
    render(<UpgradePromptDialog {...defaultProps} />);

    expect(screen.getByText(/unlimited book tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/\$9\.99/)).toBeInTheDocument();
  });
});
