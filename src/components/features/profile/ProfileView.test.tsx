import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileView } from './ProfileView';
import type { User } from '@prisma/client';

// Mock the updateProfile action
const mockUpdateProfile = vi.fn();
vi.mock('@/actions/profile', () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('ProfileView', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'john@example.com',
    emailVerified: true,
    name: 'John Doe',
    bio: 'I love reading books',
    avatarUrl: null,
    applePrivateRelay: false,
    favoriteGenres: ['Fiction', 'Mystery'],
    showReadingActivity: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user profile in read-only mode initially', () => {
    render(<ProfileView user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('I love reading books')).toBeInTheDocument();
    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Mystery')).toBeInTheDocument();
  });

  it('shows edit mode when Edit Profile button is clicked', async () => {
    render(<ProfileView user={mockUser} />);

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /bio/i })).toBeInTheDocument();
  });

  it('returns to read-only mode when cancel is clicked', async () => {
    render(<ProfileView user={mockUser} />);

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByRole('textbox', { name: /display name/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('textbox', { name: /display name/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('updates profile and shows success toast on successful save', async () => {
    const updatedUser = { ...mockUser, name: 'Jane Doe' };
    mockUpdateProfile.mockResolvedValue({ success: true, data: updatedUser });

    render(<ProfileView user={mockUser} />);

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/display name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jane Doe');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('shows error toast on failed save', async () => {
    mockUpdateProfile.mockResolvedValue({ success: false, error: 'Update failed' });

    render(<ProfileView user={mockUser} />);

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/display name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jane Doe');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Update failed');
    });
  });

  it('displays "No genres selected" when user has no favorite genres', () => {
    const userWithoutGenres = { ...mockUser, favoriteGenres: [] };
    render(<ProfileView user={userWithoutGenres} />);

    expect(screen.getByText('No genres selected')).toBeInTheDocument();
  });

  it('displays correct privacy setting message when activity is hidden', () => {
    const userWithHiddenActivity = { ...mockUser, showReadingActivity: false };
    render(<ProfileView user={userWithHiddenActivity} />);

    expect(
      screen.getByText('Your reading activity is hidden from followers')
    ).toBeInTheDocument();
  });

  it('displays correct privacy setting message when activity is visible', () => {
    render(<ProfileView user={mockUser} />);

    expect(
      screen.getByText('Your reading activity is visible to followers')
    ).toBeInTheDocument();
  });
});
