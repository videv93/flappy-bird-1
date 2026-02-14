import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StartBuddyReadButton } from './StartBuddyReadButton';

vi.mock('@/actions/social/createBuddyRead', () => ({
  createBuddyRead: vi.fn(),
}));

vi.mock('@/actions/social/getFollowing', () => ({
  getFollowing: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { createBuddyRead } from '@/actions/social/createBuddyRead';
import { getFollowing } from '@/actions/social/getFollowing';
import { toast } from 'sonner';

const mockCreateBuddyRead = createBuddyRead as unknown as ReturnType<typeof vi.fn>;
const mockGetFollowing = getFollowing as unknown as ReturnType<typeof vi.fn>;

describe('StartBuddyReadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFollowing.mockResolvedValue({
      success: true,
      data: [
        { id: 'user-2', name: 'Alice', image: null },
        { id: 'user-3', name: 'Bob', image: null },
      ],
    });
    mockCreateBuddyRead.mockResolvedValue({
      success: true,
      data: { buddyReadId: 'br-1', invitationId: 'inv-1' },
    });
  });

  it('renders buddy read button', () => {
    render(<StartBuddyReadButton bookId="book-1" />);

    expect(screen.getByTestId('start-buddy-read-button')).toBeInTheDocument();
    expect(screen.getByText('Buddy Read')).toBeInTheDocument();
  });

  it('opens friend picker on click', async () => {
    render(<StartBuddyReadButton bookId="book-1" />);

    fireEvent.click(screen.getByTestId('start-buddy-read-button'));

    await waitFor(() => {
      expect(screen.getByTestId('friend-picker-modal')).toBeInTheDocument();
    });
  });

  it('sends invitation and shows success toast', async () => {
    render(<StartBuddyReadButton bookId="book-1" />);

    fireEvent.click(screen.getByTestId('start-buddy-read-button'));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Invite Alice to buddy read'));

    await waitFor(() => {
      expect(mockCreateBuddyRead).toHaveBeenCalledWith({
        bookId: 'book-1',
        inviteeId: 'user-2',
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Buddy read invitation sent to Alice!');
  });

  it('shows error toast on failure', async () => {
    mockCreateBuddyRead.mockResolvedValue({
      success: false,
      error: 'You can only invite users you follow',
    });

    render(<StartBuddyReadButton bookId="book-1" />);

    fireEvent.click(screen.getByTestId('start-buddy-read-button'));

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Invite Alice to buddy read'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('You can only invite users you follow');
    });
  });

  it('has proper touch target size', () => {
    render(<StartBuddyReadButton bookId="book-1" />);

    expect(screen.getByTestId('start-buddy-read-button')).toHaveClass('min-h-[44px]');
  });
});
