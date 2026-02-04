import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OAuthButtons } from './OAuthButtons';

// Mock the auth client
vi.mock('@/lib/auth-client', () => ({
  signIn: {
    social: vi.fn(),
  },
}));

import { signIn } from '@/lib/auth-client';

describe('OAuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Google sign-in button', () => {
    render(<OAuthButtons />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('shows loading state when signing in', async () => {
    // Make signIn hang to test loading state
    vi.mocked(signIn.social).mockImplementation(() => new Promise(() => {}));

    render(<OAuthButtons />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
    expect(button).toBeDisabled();
  });

  it('calls signIn.social with google provider when clicked', async () => {
    vi.mocked(signIn.social).mockResolvedValueOnce(undefined);

    render(<OAuthButtons />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/home',
      });
    });
  });

  it('uses provided callbackUrl', async () => {
    vi.mocked(signIn.social).mockResolvedValueOnce(undefined);

    render(<OAuthButtons callbackUrl="/library" />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/library',
      });
    });
  });

  it('shows error message when sign-in fails', async () => {
    vi.mocked(signIn.social).mockRejectedValueOnce(new Error('OAuth failed'));

    render(<OAuthButtons />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to sign in with google/i);
    });
  });
});
