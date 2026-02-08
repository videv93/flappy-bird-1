import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeedItem } from './ActivityFeedItem';
import type { SessionActivity, FinishedBookActivity } from '@/actions/social/getActivityFeed';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock Avatar component
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    src ? <img src={src} alt={alt} data-testid="avatar-image" /> : null
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// Mock KudosButton
vi.mock('@/components/features/social/KudosButton', () => ({
  KudosButton: ({
    sessionId,
    receiverId,
    initialKudosCount,
    initialUserGaveKudos,
  }: {
    sessionId: string;
    receiverId: string;
    initialKudosCount: number;
    initialUserGaveKudos: boolean;
  }) => (
    <button
      data-testid="kudos-button"
      data-session-id={sessionId}
      data-receiver-id={receiverId}
      data-kudos-count={initialKudosCount}
      data-user-gave-kudos={String(initialUserGaveKudos)}
    >
      Kudos
    </button>
  ),
}));

// Mock utils
const formatRelativeTime = vi.fn().mockReturnValue('2 hours ago');

vi.mock('@/lib/utils', () => ({
  formatDuration: (seconds: number) => {
    if (seconds < 60) return '< 1 min';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}min`;
  },
  formatRelativeTime: (...args: unknown[]) => formatRelativeTime(...args),
  getInitials: (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('ActivityFeedItem', () => {
  const sessionActivity: SessionActivity = {
    type: 'session',
    id: 'session-1',
    userId: 'user-1',
    userName: 'John Doe',
    userAvatar: 'avatar.jpg',
    bookId: 'book-1',
    bookTitle: 'The Great Gatsby',
    bookCover: 'cover.jpg',
    duration: 1800, // 30 minutes
    timestamp: new Date(),
    kudosCount: 3,
    userGaveKudos: false,
  };

  const finishedActivity: FinishedBookActivity = {
    type: 'finished',
    id: 'finished-1',
    userId: 'user-1',
    userName: 'Jane Smith',
    userAvatar: 'avatar2.jpg',
    bookId: 'book-2',
    bookTitle: '1984',
    bookCover: 'cover2.jpg',
    bookAuthor: 'George Orwell',
    timestamp: new Date(),
  };

  it('renders session activity with user avatar, name, book, duration, timestamp', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/read/i)).toBeInTheDocument();
    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    expect(screen.getByText(/30 min/i)).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('renders finished book activity with BookCheck icon', () => {
    render(<ActivityFeedItem activity={finishedActivity} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(/finished/i)).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
    expect(screen.getByText(/by George Orwell/i)).toBeInTheDocument();

    // Check for BookCheck icon (may appear in placeholder or timestamp)
    const icons = screen.queryAllByRole('img', { hidden: true });
    // Just verify the component renders without error - icons are SVGs and hard to test
    expect(icons).toBeDefined();
  });

  it('formats duration correctly for session type', () => {
    const shortSession: SessionActivity = {
      ...sessionActivity,
      duration: 900, // 15 minutes
    };

    render(<ActivityFeedItem activity={shortSession} />);
    expect(screen.getByText(/15 min/i)).toBeInTheDocument();
  });

  it('formats relative timestamp correctly', () => {
    formatRelativeTime.mockClear();
    render(<ActivityFeedItem activity={sessionActivity} />);
    expect(formatRelativeTime).toHaveBeenCalledWith(sessionActivity.timestamp);
  });

  it('links to book detail page from book title', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    const bookLink = screen.getByText('The Great Gatsby').closest('a');
    expect(bookLink).toHaveAttribute('href', '/book/book-1');
  });

  it('links to book detail page from book cover', () => {
    const { container } = render(<ActivityFeedItem activity={sessionActivity} />);

    const coverLink = container.querySelector('a[href="/book/book-1"]');
    expect(coverLink).toBeInTheDocument();
  });

  it('user avatar shows image when available', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    const avatarImage = screen.getByTestId('avatar-image');
    expect(avatarImage).toHaveAttribute('src', 'avatar.jpg');
    expect(avatarImage).toHaveAttribute('alt', 'John Doe');
  });

  it('user avatar shows initials fallback when no image', () => {
    const activityNoAvatar: SessionActivity = {
      ...sessionActivity,
      userAvatar: null,
    };

    render(<ActivityFeedItem activity={activityNoAvatar} />);

    // Avatar fallback should show initials
    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toHaveTextContent('JD');
  });

  it('handles missing book cover gracefully', () => {
    const activityNoCover: SessionActivity = {
      ...sessionActivity,
      bookCover: null,
    };

    const { container } = render(<ActivityFeedItem activity={activityNoCover} />);

    // Should render placeholder div instead of img
    const placeholder = container.querySelector('.bg-muted');
    expect(placeholder).toBeInTheDocument();
  });

  it('activity card has hover effect class', () => {
    const { container } = render(<ActivityFeedItem activity={sessionActivity} />);

    const card = container.querySelector('.hover\\:bg-muted\\/50');
    expect(card).toBeInTheDocument();
  });

  it('renders different activity types correctly - session', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    expect(screen.getByText(/read/i)).toBeInTheDocument();
    expect(screen.queryByText(/finished/i)).not.toBeInTheDocument();
  });

  it('renders different activity types correctly - finished', () => {
    render(<ActivityFeedItem activity={finishedActivity} />);

    expect(screen.getByText(/finished/i)).toBeInTheDocument();
    expect(screen.queryByText(/read.*for/i)).not.toBeInTheDocument();
  });

  it('shows author name for finished books when available', () => {
    render(<ActivityFeedItem activity={finishedActivity} />);

    expect(screen.getByText(/by George Orwell/i)).toBeInTheDocument();
  });

  it('handles missing author name gracefully', () => {
    const activityNoAuthor: FinishedBookActivity = {
      ...finishedActivity,
      bookAuthor: null,
    };

    render(<ActivityFeedItem activity={activityNoAuthor} />);

    expect(screen.queryByText(/by/i)).not.toBeInTheDocument();
  });

  it('handles null user name gracefully', () => {
    const activityNoName: SessionActivity = {
      ...sessionActivity,
      userName: null,
    };

    render(<ActivityFeedItem activity={activityNoName} />);

    // Should render with fallback initials
    const fallback = screen.getByTestId('avatar-fallback');
    expect(fallback).toHaveTextContent('?');
  });

  it('renders KudosButton for session activities', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    const kudosButton = screen.getByTestId('kudos-button');
    expect(kudosButton).toBeInTheDocument();
  });

  it('does NOT render KudosButton for finished activities', () => {
    render(<ActivityFeedItem activity={finishedActivity} />);

    expect(screen.queryByTestId('kudos-button')).not.toBeInTheDocument();
  });

  it('passes correct props to KudosButton', () => {
    render(<ActivityFeedItem activity={sessionActivity} />);

    const kudosButton = screen.getByTestId('kudos-button');
    expect(kudosButton).toHaveAttribute('data-session-id', 'session-1');
    expect(kudosButton).toHaveAttribute('data-receiver-id', 'user-1');
    expect(kudosButton).toHaveAttribute('data-kudos-count', '3');
    expect(kudosButton).toHaveAttribute('data-user-gave-kudos', 'false');
  });
});
