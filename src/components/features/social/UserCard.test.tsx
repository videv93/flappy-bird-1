import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

vi.mock('@/actions/social/followUser', () => ({
  followUser: vi.fn().mockResolvedValue({ success: true, data: { followId: 'f1' } }),
}));

vi.mock('@/actions/social/unfollowUser', () => ({
  unfollowUser: vi.fn().mockResolvedValue({ success: true, data: { unfollowed: true } }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('UserCard', () => {
  const defaultUser = {
    id: 'user-2',
    name: 'Jane Doe',
    bio: 'Avid reader and book lover',
    bioRemovedAt: null,
    avatarUrl: null,
    image: null,
    isFollowing: false,
    followerCount: 42,
  };

  it('renders user name', () => {
    render(<UserCard user={defaultUser} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders user bio', () => {
    render(<UserCard user={defaultUser} />);
    expect(screen.getByText('Avid reader and book lover')).toBeInTheDocument();
  });

  it('renders avatar fallback with initials', () => {
    render(<UserCard user={defaultUser} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows follower count', () => {
    render(<UserCard user={defaultUser} />);
    expect(screen.getByText('42 followers')).toBeInTheDocument();
  });

  it('shows singular follower when count is 1', () => {
    render(<UserCard user={{ ...defaultUser, followerCount: 1 }} />);
    expect(screen.getByText('1 follower')).toBeInTheDocument();
  });

  it('renders FollowButton with correct state', () => {
    render(<UserCard user={defaultUser} />);
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('renders FollowButton as Following when user is followed', () => {
    render(<UserCard user={{ ...defaultUser, isFollowing: true }} />);
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('card links to user profile', () => {
    render(<UserCard user={defaultUser} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/user/user-2');
  });

  it('shows removed content placeholder when bio has been removed', () => {
    const removedBioUser = {
      ...defaultUser,
      bioRemovedAt: new Date('2025-01-15'),
    };
    render(<UserCard user={removedBioUser} />);
    expect(screen.getByText('[Content removed by moderator]')).toBeInTheDocument();
    expect(screen.queryByText('Avid reader and book lover')).not.toBeInTheDocument();
  });
});
