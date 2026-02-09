import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationItemCard } from './ModerationItemCard';
import type { ModerationQueueItem } from '@/actions/admin/getModerationQueue';

vi.mock('@/actions/admin/reviewModerationItem', () => ({
  reviewModerationItem: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('@/actions/admin/restoreContent', () => ({
  restoreContent: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('@/actions/admin/removeContent', () => ({
  removeContent: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockItem: ModerationQueueItem = {
  id: 'mod-1',
  contentType: 'PROFILE_BIO' as const,
  contentId: 'user-2',
  reason: 'Inappropriate content in their bio section',
  status: 'PENDING' as const,
  createdAt: new Date('2025-01-15T00:00:00.000Z'),
  reviewedAt: null,
  reporter: { id: 'user-3', name: 'Alice Reporter', image: null },
  reportedUser: { id: 'user-2', name: 'Bob Reported', image: null },
  contentRemoval: null,
};

describe('ModerationItemCard', () => {
  it('renders item summary', () => {
    render(<ModerationItemCard item={mockItem} />);

    expect(screen.getByText('Profile Bio')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Inappropriate content in their bio section')).toBeInTheDocument();
  });

  it('expands on click to show details', async () => {
    const user = userEvent.setup();
    render(<ModerationItemCard item={mockItem} />);

    const toggle = screen.getByRole('button', { expanded: false });
    await user.click(toggle);

    expect(screen.getByText('Alice Reporter')).toBeInTheDocument();
    expect(screen.getByText('Bob Reported')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByText('Warn')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.getByText('Suspend')).toBeInTheDocument();
  });

  it('hides action buttons for non-pending items', async () => {
    const user = userEvent.setup();
    const reviewedItem = { ...mockItem, status: 'DISMISSED' as const };
    render(<ModerationItemCard item={reviewedItem} />);

    const toggle = screen.getByRole('button');
    await user.click(toggle);

    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    expect(screen.queryByText('Suspend')).not.toBeInTheDocument();
  });

  it('calls reviewModerationItem on action click', async () => {
    const user = userEvent.setup();
    const onActionComplete = vi.fn();
    const { reviewModerationItem } = await import('@/actions/admin/reviewModerationItem');
    const mockReview = reviewModerationItem as ReturnType<typeof vi.fn>;

    render(<ModerationItemCard item={mockItem} onActionComplete={onActionComplete} />);

    const toggle = screen.getByRole('button', { expanded: false });
    await user.click(toggle);

    const dismissBtn = screen.getByText('Dismiss');
    await user.click(dismissBtn);

    expect(mockReview).toHaveBeenCalledWith({
      moderationItemId: 'mod-1',
      action: 'dismiss',
      adminNotes: undefined,
    });
  });

  it('opens RemoveContentDialog when Remove is clicked', async () => {
    const user = userEvent.setup();
    render(<ModerationItemCard item={mockItem} />);

    const toggle = screen.getByRole('button', { expanded: false });
    await user.click(toggle);

    const removeBtn = screen.getByText('Remove');
    await user.click(removeBtn);

    // The dialog should now be open
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Violation Type')).toBeInTheDocument();
  });

  it('shows Restore button for recently removed items', async () => {
    const user = userEvent.setup();
    const removedItem: ModerationQueueItem = {
      ...mockItem,
      status: 'REMOVED' as const,
      reviewedAt: new Date(), // Just now
      contentRemoval: { id: 'removal-1', removedAt: new Date() },
    };
    render(<ModerationItemCard item={removedItem} />);

    const toggle = screen.getByRole('button');
    await user.click(toggle);

    expect(screen.getByText('Restore Content')).toBeInTheDocument();
  });

  it('does not show Restore button for items removed over 24h ago', async () => {
    const user = userEvent.setup();
    const oldRemovedItem: ModerationQueueItem = {
      ...mockItem,
      status: 'REMOVED' as const,
      reviewedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      contentRemoval: { id: 'removal-1', removedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    };
    render(<ModerationItemCard item={oldRemovedItem} />);

    const toggle = screen.getByRole('button');
    await user.click(toggle);

    expect(screen.queryByText('Restore Content')).not.toBeInTheDocument();
  });
});
