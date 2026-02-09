import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationQueue } from './ModerationQueue';
import type { ModerationQueueItem } from '@/actions/admin/getModerationQueue';

vi.mock('@/actions/admin/getModerationQueue', () => ({
  getModerationQueue: vi.fn().mockResolvedValue({
    success: true,
    data: { items: [], totalCount: 0, page: 1, pageSize: 20 },
  }),
}));

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

const mockItems: ModerationQueueItem[] = [
  {
    id: 'mod-1',
    contentType: 'PROFILE_BIO' as const,
    contentId: 'user-2',
    reason: 'Inappropriate content flagged by reporter',
    status: 'PENDING' as const,
    createdAt: new Date('2025-01-15T00:00:00.000Z'),
    reporter: { id: 'user-3', name: 'Alice', image: null },
    reportedUser: { id: 'user-2', name: 'Bob', image: null },
    reviewedAt: null,
    contentRemoval: null,
  },
  {
    id: 'mod-2',
    contentType: 'READING_ROOM_DESCRIPTION' as const,
    contentId: 'book-1',
    reason: 'Spoilers in the reading room description',
    status: 'PENDING' as const,
    createdAt: new Date('2025-01-16T00:00:00.000Z'),
    reporter: { id: 'user-4', name: 'Charlie', image: null },
    reportedUser: { id: 'user-5', name: 'Dave', image: null },
    reviewedAt: null,
    contentRemoval: null,
  },
];

describe('ModerationQueue', () => {
  it('renders list of moderation items', () => {
    render(
      <ModerationQueue
        initialData={{ items: mockItems, totalCount: 2, page: 1, pageSize: 20 }}
      />
    );

    expect(screen.getByText('Inappropriate content flagged by reporter')).toBeInTheDocument();
    expect(screen.getByText('Spoilers in the reading room description')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(
      <ModerationQueue
        initialData={{ items: [], totalCount: 0, page: 1, pageSize: 20 }}
      />
    );

    expect(screen.getByText('No pending items')).toBeInTheDocument();
    expect(screen.getByText('Great work!')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    render(
      <ModerationQueue
        initialData={{ items: mockItems, totalCount: 2, page: 1, pageSize: 20 }}
      />
    );

    expect(screen.getByRole('button', { name: 'All Types' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile Bio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Room Description' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismissed' })).toBeInTheDocument();
  });

  it('renders pagination when needed', () => {
    render(
      <ModerationQueue
        initialData={{ items: mockItems, totalCount: 25, page: 1, pageSize: 20 }}
      />
    );

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('does not render pagination for single page', () => {
    render(
      <ModerationQueue
        initialData={{ items: mockItems, totalCount: 2, page: 1, pageSize: 20 }}
      />
    );

    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('calls getModerationQueue when filter is clicked', async () => {
    const user = userEvent.setup();
    const { getModerationQueue } = await import('@/actions/admin/getModerationQueue');
    const mockGetQueue = getModerationQueue as ReturnType<typeof vi.fn>;

    render(
      <ModerationQueue
        initialData={{ items: mockItems, totalCount: 2, page: 1, pageSize: 20 }}
      />
    );

    // Get the "Profile Bio" button specifically from the content type filter group
    const profileBioBtn = screen.getByRole('button', { name: 'Profile Bio' });
    await user.click(profileBioBtn);

    expect(mockGetQueue).toHaveBeenCalled();
  });
});
