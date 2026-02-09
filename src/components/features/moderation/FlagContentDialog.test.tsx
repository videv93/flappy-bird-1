import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlagContentDialog } from './FlagContentDialog';

vi.mock('@/actions/moderation/flagContent', () => ({
  flagContent: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('FlagContentDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    contentType: 'PROFILE_BIO' as const,
    contentId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog content when open', () => {
    render(<FlagContentDialog {...defaultProps} />);

    expect(screen.getByText('Report Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables submit when reason is too short', () => {
    render(<FlagContentDialog {...defaultProps} />);

    const submitBtn = screen.getByText('Submit Report');
    expect(submitBtn.closest('button')).toBeDisabled();
  });

  it('enables submit when reason is long enough', async () => {
    const user = userEvent.setup();
    render(<FlagContentDialog {...defaultProps} />);

    const textarea = screen.getByLabelText('Reason');
    await user.type(textarea, 'This content is inappropriate and offensive');

    const submitBtn = screen.getByText('Submit Report');
    expect(submitBtn.closest('button')).not.toBeDisabled();
  });

  it('calls flagContent on submit', async () => {
    const user = userEvent.setup();
    const { flagContent } = await import('@/actions/moderation/flagContent');
    const mockFlag = flagContent as ReturnType<typeof vi.fn>;

    render(<FlagContentDialog {...defaultProps} />);

    const textarea = screen.getByLabelText('Reason');
    await user.type(textarea, 'This content is inappropriate and offensive');

    const submitBtn = screen.getByText('Submit Report');
    await user.click(submitBtn);

    expect(mockFlag).toHaveBeenCalledWith({
      contentType: 'PROFILE_BIO',
      contentId: 'user-1',
      reason: 'This content is inappropriate and offensive',
    });
  });

  it('shows success toast on successful submit', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');

    render(<FlagContentDialog {...defaultProps} />);

    const textarea = screen.getByLabelText('Reason');
    await user.type(textarea, 'This content is inappropriate and offensive');

    const submitBtn = screen.getByText('Submit Report');
    await user.click(submitBtn);

    expect(toast.success).toHaveBeenCalledWith(
      'Report submitted. Thank you for helping keep our community safe.'
    );
  });

  it('shows error message on failed submit', async () => {
    const user = userEvent.setup();
    const { flagContent } = await import('@/actions/moderation/flagContent');
    const mockFlag = flagContent as ReturnType<typeof vi.fn>;
    mockFlag.mockResolvedValueOnce({ success: false, error: 'You have already reported this content' });

    render(<FlagContentDialog {...defaultProps} />);

    const textarea = screen.getByLabelText('Reason');
    await user.type(textarea, 'This content is inappropriate and offensive');

    const submitBtn = screen.getByText('Submit Report');
    await user.click(submitBtn);

    expect(screen.getByText('You have already reported this content')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<FlagContentDialog {...defaultProps} />);

    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
  });
});
