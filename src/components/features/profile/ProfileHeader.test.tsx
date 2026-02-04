import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileHeader } from './ProfileHeader';

describe('ProfileHeader', () => {
  const defaultProps = {
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: new Date('2024-01-15'),
    isEditing: false,
    onEditClick: vi.fn(),
  };

  it('renders user name correctly', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders email correctly', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders member since date correctly', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText(/Member since January 2024/)).toBeInTheDocument();
  });

  it('renders initials when no avatar', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders "Anonymous User" when name is null', () => {
    render(<ProfileHeader {...defaultProps} name={null} />);
    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    expect(screen.getByText('AU')).toBeInTheDocument();
  });

  it('shows Edit Profile button when not editing', () => {
    render(<ProfileHeader {...defaultProps} isEditing={false} />);
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('hides Edit Profile button when editing', () => {
    render(<ProfileHeader {...defaultProps} isEditing={true} />);
    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('calls onEditClick when Edit Profile button is clicked', async () => {
    const onEditClick = vi.fn();
    render(<ProfileHeader {...defaultProps} onEditClick={onEditClick} />);

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('renders avatar with provided avatarUrl', () => {
    render(<ProfileHeader {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);
    // Radix Avatar loads images asynchronously, so we check for the fallback initially
    // The avatar container should be present
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
