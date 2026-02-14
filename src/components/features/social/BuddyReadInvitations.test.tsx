import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BuddyReadInvitations } from './BuddyReadInvitations';

vi.mock('@/actions/social/getBuddyReadInvitations', () => ({
  getBuddyReadInvitations: vi.fn(),
}));

vi.mock('./BuddyReadInvitationCard', () => ({
  BuddyReadInvitationCard: ({ invitation }: { invitation: { book: { title: string } } }) => (
    <div data-testid="invitation-card">{invitation.book.title}</div>
  ),
}));

import { getBuddyReadInvitations } from '@/actions/social/getBuddyReadInvitations';

const mockGetInvitations = getBuddyReadInvitations as unknown as ReturnType<typeof vi.fn>;

const mockInvitations = [
  {
    id: 'inv-1',
    status: 'PENDING',
    createdAt: new Date(),
    inviter: { id: 'u2', name: 'Alice', image: null },
    book: { id: 'b1', title: 'Book One', author: 'Author', coverUrl: null, isbn10: null, isbn13: null },
  },
  {
    id: 'inv-2',
    status: 'PENDING',
    createdAt: new Date(),
    inviter: { id: 'u3', name: 'Bob', image: null },
    book: { id: 'b2', title: 'Book Two', author: 'Author 2', coverUrl: null, isbn10: null, isbn13: null },
  },
];

describe('BuddyReadInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    mockGetInvitations.mockReturnValue(new Promise(() => {})); // never resolves
    render(<BuddyReadInvitations />);

    expect(screen.getByTestId('buddy-read-loading')).toBeInTheDocument();
  });

  it('shows empty state when no invitations', async () => {
    mockGetInvitations.mockResolvedValue({ success: true, data: [] });
    render(<BuddyReadInvitations />);

    await waitFor(() => {
      expect(screen.getByTestId('buddy-read-empty')).toBeInTheDocument();
    });
  });

  it('renders invitation cards when invitations exist', async () => {
    mockGetInvitations.mockResolvedValue({ success: true, data: mockInvitations });
    render(<BuddyReadInvitations />);

    await waitFor(() => {
      expect(screen.getByTestId('buddy-read-invitations')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('invitation-card')).toHaveLength(2);
    expect(screen.getByText('Book One')).toBeInTheDocument();
    expect(screen.getByText('Book Two')).toBeInTheDocument();
  });

  it('shows empty state on fetch error', async () => {
    mockGetInvitations.mockResolvedValue({ success: false, error: 'Failed' });
    render(<BuddyReadInvitations />);

    await waitFor(() => {
      expect(screen.getByTestId('buddy-read-empty')).toBeInTheDocument();
    });
  });
});
