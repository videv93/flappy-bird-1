import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlagContentButton } from './FlagContentButton';

vi.mock('@/actions/moderation/flagContent', () => ({
  flagContent: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('FlagContentButton', () => {
  it('renders report button with accessible label', () => {
    render(<FlagContentButton contentType="PROFILE_BIO" contentId="user-1" />);

    const button = screen.getByRole('button', { name: /report content/i });
    expect(button).toBeInTheDocument();
  });

  it('opens dialog when clicked', async () => {
    const user = userEvent.setup();
    render(<FlagContentButton contentType="PROFILE_BIO" contentId="user-1" />);

    await user.click(screen.getByRole('button', { name: /report content/i }));

    expect(screen.getByText('Report Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('has minimum 44px touch target', () => {
    render(<FlagContentButton contentType="PROFILE_BIO" contentId="user-1" />);

    const button = screen.getByRole('button', { name: /report content/i });
    expect(button.className).toContain('min-h-[44px]');
  });
});
