import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RemoveContentDialog } from './RemoveContentDialog';

vi.mock('@/actions/admin/removeContent', () => ({
  removeContent: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('RemoveContentDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    moderationItemId: 'mod-1',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog content when open', () => {
    render(<RemoveContentDialog {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Violation Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Harassment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spoilers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inappropriate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables submit when no violation type selected', () => {
    render(<RemoveContentDialog {...defaultProps} />);

    // Find the destructive "Remove Content" button (the action button)
    const buttons = screen.getAllByRole('button', { name: /Remove Content/i });
    const submitBtn = buttons.find(
      (btn) => btn.textContent === 'Remove Content' && btn.closest('[role="alertdialog"]')
    );
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when violation type is selected', async () => {
    const user = userEvent.setup();
    render(<RemoveContentDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Spam' }));

    const buttons = screen.getAllByRole('button', { name: /Remove Content/i });
    const submitBtn = buttons.find(
      (btn) => btn.textContent === 'Remove Content' && btn.closest('[role="alertdialog"]')
    );
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls removeContent on submit with selected violation type', async () => {
    const user = userEvent.setup();
    const { removeContent } = await import('@/actions/admin/removeContent');
    const mockRemove = removeContent as ReturnType<typeof vi.fn>;

    render(<RemoveContentDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Harassment' }));

    const buttons = screen.getAllByRole('button', { name: /Remove Content/i });
    const submitBtn = buttons.find(
      (btn) => btn.textContent === 'Remove Content' && btn.closest('[role="alertdialog"]')
    );
    await user.click(submitBtn!);

    expect(mockRemove).toHaveBeenCalledWith({
      moderationItemId: 'mod-1',
      violationType: 'HARASSMENT',
      adminNotes: undefined,
    });
  });

  it('shows success toast and calls onSuccess on successful submit', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');

    render(<RemoveContentDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Spam' }));

    const buttons = screen.getAllByRole('button', { name: /Remove Content/i });
    const submitBtn = buttons.find(
      (btn) => btn.textContent === 'Remove Content' && btn.closest('[role="alertdialog"]')
    );
    await user.click(submitBtn!);

    expect(toast.success).toHaveBeenCalledWith('Content removed successfully');
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('shows error message on failed submit', async () => {
    const user = userEvent.setup();
    const { removeContent } = await import('@/actions/admin/removeContent');
    const mockRemove = removeContent as ReturnType<typeof vi.fn>;
    mockRemove.mockResolvedValueOnce({ success: false, error: 'Moderation item not found' });

    render(<RemoveContentDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Spam' }));

    const buttons = screen.getAllByRole('button', { name: /Remove Content/i });
    const submitBtn = buttons.find(
      (btn) => btn.textContent === 'Remove Content' && btn.closest('[role="alertdialog"]')
    );
    await user.click(submitBtn!);

    expect(screen.getByText('Moderation item not found')).toBeInTheDocument();
  });

  it('shows character count for notes', () => {
    render(<RemoveContentDialog {...defaultProps} />);

    expect(screen.getByText('0/1000 characters')).toBeInTheDocument();
  });
});
