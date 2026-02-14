import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuddyReadInvitationCard } from './BuddyReadInvitationCard';
import type { BuddyReadInvitationData } from '@/actions/social/getBuddyReadInvitations';

vi.mock('@/actions/social/respondToBuddyReadInvitation', () => ({
  respondToBuddyReadInvitation: vi.fn(),
}));

import { respondToBuddyReadInvitation } from '@/actions/social/respondToBuddyReadInvitation';

const mockRespond = respondToBuddyReadInvitation as unknown as ReturnType<typeof vi.fn>;

const baseInvitation: BuddyReadInvitationData = {
  id: 'inv-1',
  status: 'PENDING',
  createdAt: new Date('2026-02-14'),
  inviter: { id: 'user-2', name: 'Alice', image: null },
  book: {
    id: 'book-1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: null,
    isbn10: '1234567890',
    isbn13: null,
  },
};

describe('BuddyReadInvitationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespond.mockResolvedValue({ success: true, data: { status: 'ACCEPTED' } });
  });

  it('renders invitation with book info and inviter', () => {
    render(<BuddyReadInvitationCard invitation={baseInvitation} />);

    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    expect(screen.getByText('F. Scott Fitzgerald')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('wants to read with you')).toBeInTheDocument();
  });

  it('shows purchase options when ISBN is available', () => {
    render(<BuddyReadInvitationCard invitation={baseInvitation} />);

    expect(screen.getByLabelText('Read free on OpenLibrary')).toBeInTheDocument();
    expect(screen.getByLabelText('Buy on Amazon (supports app)')).toBeInTheDocument();
    expect(screen.getByLabelText('Buy on Bookshop.org (supports app)')).toBeInTheDocument();
    expect(screen.getByLabelText('Find at library')).toBeInTheDocument();
  });

  it('hides purchase options when no ISBN', () => {
    const noIsbn = {
      ...baseInvitation,
      book: { ...baseInvitation.book, isbn10: null, isbn13: null },
    };
    render(<BuddyReadInvitationCard invitation={noIsbn} />);

    expect(screen.queryByText('Get this book')).not.toBeInTheDocument();
  });

  it('builds affiliate URLs with buddy-read source', () => {
    render(<BuddyReadInvitationCard invitation={baseInvitation} />);

    const amazonLink = screen.getByLabelText('Buy on Amazon (supports app)');
    expect(amazonLink).toHaveAttribute(
      'href',
      expect.stringContaining('source=buddy-read')
    );
    expect(amazonLink).toHaveAttribute(
      'href',
      expect.stringContaining('provider=amazon')
    );
  });

  it('shows WorldCat library finder link', () => {
    render(<BuddyReadInvitationCard invitation={baseInvitation} />);

    const libraryLink = screen.getByLabelText('Find at library');
    expect(libraryLink).toHaveAttribute(
      'href',
      'https://www.worldcat.org/isbn/1234567890'
    );
  });

  it('handles accept action', async () => {
    const onRespond = vi.fn();
    render(<BuddyReadInvitationCard invitation={baseInvitation} onRespond={onRespond} />);

    fireEvent.click(screen.getByLabelText('Accept buddy read invitation'));

    await waitFor(() => {
      expect(screen.getByTestId('invitation-responded')).toBeInTheDocument();
    });
    expect(mockRespond).toHaveBeenCalledWith({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });
    expect(onRespond).toHaveBeenCalledWith('inv-1', 'ACCEPTED');
  });

  it('handles decline action', async () => {
    mockRespond.mockResolvedValue({ success: true, data: { status: 'DECLINED' } });
    const onRespond = vi.fn();
    render(<BuddyReadInvitationCard invitation={baseInvitation} onRespond={onRespond} />);

    fireEvent.click(screen.getByLabelText('Decline buddy read invitation'));

    await waitFor(() => {
      expect(screen.getByTestId('invitation-responded')).toBeInTheDocument();
    });
    expect(onRespond).toHaveBeenCalledWith('inv-1', 'DECLINED');
  });

  it('shows accept/decline buttons with proper touch targets', () => {
    render(<BuddyReadInvitationCard invitation={baseInvitation} />);

    const accept = screen.getByLabelText('Accept buddy read invitation');
    const decline = screen.getByLabelText('Decline buddy read invitation');
    expect(accept).toHaveClass('min-h-[44px]');
    expect(decline).toHaveClass('min-h-[44px]');
  });

  it('uses isbn13 preferentially over isbn10', () => {
    const withIsbn13 = {
      ...baseInvitation,
      book: { ...baseInvitation.book, isbn13: '9781234567890' },
    };
    render(<BuddyReadInvitationCard invitation={withIsbn13} />);

    const openLibraryLink = screen.getByLabelText('Read free on OpenLibrary');
    expect(openLibraryLink).toHaveAttribute(
      'href',
      'https://openlibrary.org/isbn/9781234567890'
    );
  });
});
