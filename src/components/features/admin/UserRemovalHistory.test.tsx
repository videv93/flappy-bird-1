import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserRemovalHistory } from './UserRemovalHistory';

const mockGetUserRemovalHistory = vi.fn();

vi.mock('@/actions/admin/getUserRemovalHistory', () => ({
  getUserRemovalHistory: (...args: unknown[]) => mockGetUserRemovalHistory(...args),
}));

describe('UserRemovalHistory', () => {
  it('shows loading state initially', () => {
    mockGetUserRemovalHistory.mockReturnValue(new Promise(() => {}));
    render(<UserRemovalHistory userId="user-1" />);

    expect(screen.getByText('Loading removal history...')).toBeInTheDocument();
  });

  it('shows empty state when no removals', async () => {
    mockGetUserRemovalHistory.mockResolvedValue({
      success: true,
      data: { items: [], totalCount: 0 },
    });

    render(<UserRemovalHistory userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('No content removals on record.')).toBeInTheDocument();
    });
  });

  it('renders removal history items', async () => {
    mockGetUserRemovalHistory.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'removal-1',
            violationType: 'SPAM',
            adminNotes: 'Spam content detected',
            removedAt: new Date('2025-01-15'),
            restoredAt: null,
            contentType: 'PROFILE_BIO',
            removedBy: { id: 'admin-1', name: 'Admin User' },
            restoredBy: null,
          },
        ],
        totalCount: 1,
      },
    });

    render(<UserRemovalHistory userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByText('Spam')).toBeInTheDocument();
      expect(screen.getByText('Profile Bio')).toBeInTheDocument();
      expect(screen.getByText('"Spam content detected"')).toBeInTheDocument();
      expect(screen.getByText('1 total')).toBeInTheDocument();
    });
  });

  it('shows restored badge for restored items', async () => {
    mockGetUserRemovalHistory.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'removal-1',
            violationType: 'HARASSMENT',
            adminNotes: null,
            removedAt: new Date('2025-01-15'),
            restoredAt: new Date('2025-01-16'),
            contentType: 'PROFILE_BIO',
            removedBy: { id: 'admin-1', name: 'Admin' },
            restoredBy: { id: 'admin-1', name: 'Admin' },
          },
        ],
        totalCount: 1,
      },
    });

    render(<UserRemovalHistory userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByText('Restored')).toBeInTheDocument();
    });
  });

  it('shows pattern warning for 3+ removals', async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      id: `removal-${i}`,
      violationType: 'SPAM',
      adminNotes: null,
      removedAt: new Date('2025-01-15'),
      restoredAt: null,
      contentType: 'PROFILE_BIO',
      removedBy: { id: 'admin-1', name: 'Admin' },
      restoredBy: null,
    }));

    mockGetUserRemovalHistory.mockResolvedValue({
      success: true,
      data: { items, totalCount: 3 },
    });

    render(<UserRemovalHistory userId="user-2" />);

    await waitFor(() => {
      expect(
        screen.getByText('Pattern detected: 3 content removals on record')
      ).toBeInTheDocument();
    });
  });

  it('shows error state on failure', async () => {
    mockGetUserRemovalHistory.mockResolvedValue({
      success: false,
      error: 'Failed to fetch removal history',
    });

    render(<UserRemovalHistory userId="user-2" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch removal history')).toBeInTheDocument();
    });
  });
});
