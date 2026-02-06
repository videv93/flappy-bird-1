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

// Mock getUserSessionStats (transitive import via ReadingStats)
vi.mock('@/actions/sessions/getUserSessionStats', () => ({
  getUserSessionStats: vi.fn(),
}));

describe('ProfileView', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'john@example.com',
    emailVerified: true,
    name: 'John Doe',
    image: null,
    bio: 'I love reading books',
    avatarUrl: null,
    applePrivateRelay: false,
    favoriteGenres: ['Fiction', 'Mystery'],
    showReadingActivity: true,
    dailyGoalMinutes: null,
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

  it('renders reading stats when sessionStats are provided', () => {
    render(
      <ProfileView
        user={mockUser}
        sessionStats={{ totalSeconds: 7200, sessionCount: 10, avgSeconds: 720 }}
      />
    );

    expect(screen.getByText('Reading Statistics')).toBeInTheDocument();
    expect(screen.getByTestId('reading-stats')).toBeInTheDocument();
    expect(screen.getByTestId('reading-stats-total-time')).toHaveTextContent('2h 0m');
    expect(screen.getByTestId('reading-stats-session-count')).toHaveTextContent('10');
  });

  it('does not render reading stats when sessionStats is null', () => {
    render(<ProfileView user={mockUser} sessionStats={null} />);

    expect(screen.queryByText('Reading Statistics')).not.toBeInTheDocument();
  });

  it('does not render reading stats when sessionStats is undefined', () => {
    render(<ProfileView user={mockUser} />);

    expect(screen.queryByText('Reading Statistics')).not.toBeInTheDocument();
  });

  it('displays daily reading goal when set', () => {
    const userWithGoal = { ...mockUser, dailyGoalMinutes: 30 };
    render(<ProfileView user={userWithGoal} />);

    expect(screen.getByTestId('reading-goal-section')).toBeInTheDocument();
    expect(screen.getByText('30 minutes per day')).toBeInTheDocument();
  });

  it('displays "No goal set" when dailyGoalMinutes is null', () => {
    render(<ProfileView user={mockUser} />);

    expect(screen.getByTestId('reading-goal-section')).toBeInTheDocument();
    expect(screen.getByText('No goal set')).toBeInTheDocument();
  });
});
