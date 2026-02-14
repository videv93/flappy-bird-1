import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FriendPickerModal } from './FriendPickerModal';

vi.mock('@/actions/social/getFollowing', () => ({
  getFollowing: vi.fn(),
}));

import { getFollowing } from '@/actions/social/getFollowing';

const mockGetFollowing = getFollowing as unknown as ReturnType<typeof vi.fn>;

const friends = [
  { id: 'u1', name: 'Alice', image: null },
  { id: 'u2', name: 'Bob', image: null },
];

describe('FriendPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFollowing.mockResolvedValue({ success: true, data: friends });
  });

  it('does not render when closed', () => {
    render(<FriendPickerModal open={false} onClose={vi.fn()} onSelect={vi.fn()} />);

    expect(screen.queryByTestId('friend-picker-modal')).not.toBeInTheDocument();
  });

  it('shows loading state then friends', async () => {
    render(<FriendPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('filters friends by name', async () => {
    render(<FriendPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Search friends'), { target: { value: 'ali' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('calls onSelect when friend is clicked', async () => {
    const onSelect = vi.fn();
    render(<FriendPickerModal open={true} onClose={vi.fn()} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Invite Alice to buddy read'));
    expect(onSelect).toHaveBeenCalledWith({ id: 'u1', name: 'Alice', image: null });
  });

  it('shows empty state when no friends', async () => {
    mockGetFollowing.mockResolvedValue({ success: true, data: [] });
    render(<FriendPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('friend-picker-empty')).toBeInTheDocument();
    });
  });
});
