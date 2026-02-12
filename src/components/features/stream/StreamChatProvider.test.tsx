import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConnectUser = vi.fn().mockResolvedValue(undefined);
const mockDisconnectUser = vi.fn().mockResolvedValue(undefined);

vi.mock('stream-chat', () => ({
  StreamChat: {
    getInstance: vi.fn(() => ({
      connectUser: mockConnectUser,
      disconnectUser: mockDisconnectUser,
    })),
  },
}));

vi.mock('stream-chat-react', () => ({
  Chat: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stream-chat-wrapper">{children}</div>
  ),
}));

const mockGenerateStreamToken = vi.fn();
vi.mock('@/actions/stream', () => ({
  generateStreamToken: (...args: unknown[]) => mockGenerateStreamToken(...args),
}));

const mockUseSession = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  useSession: () => mockUseSession(),
}));

import { StreamChatProvider } from './StreamChatProvider';

describe('StreamChatProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STREAM_API_KEY = 'test_api_key';
  });

  it('renders children without Chat wrapper when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null });

    render(
      <StreamChatProvider>
        <div data-testid="child">Hello</div>
      </StreamChatProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('stream-chat-wrapper')).not.toBeInTheDocument();
  });

  it('connects user and wraps children in Chat when authenticated', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user_1', name: 'Test User', image: 'https://example.com/avatar.jpg' },
      },
    });
    mockGenerateStreamToken.mockResolvedValue({
      success: true,
      data: { token: 'test_token' },
    });

    render(
      <StreamChatProvider>
        <div data-testid="child">Hello</div>
      </StreamChatProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('stream-chat-wrapper')).toBeInTheDocument();
    });

    expect(mockConnectUser).toHaveBeenCalledWith(
      { id: 'user_1', name: 'Test User', image: 'https://example.com/avatar.jpg' },
      'test_token',
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('disconnects user on unmount', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user_1', name: 'Test User', image: null },
      },
    });
    mockGenerateStreamToken.mockResolvedValue({
      success: true,
      data: { token: 'test_token' },
    });

    const { unmount } = render(
      <StreamChatProvider>
        <div>Hello</div>
      </StreamChatProvider>,
    );

    await waitFor(() => {
      expect(mockConnectUser).toHaveBeenCalled();
    });

    unmount();

    expect(mockDisconnectUser).toHaveBeenCalled();
  });

  it('renders children without Chat wrapper when token generation fails', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user_1', name: 'Test' } },
    });
    mockGenerateStreamToken.mockResolvedValue({
      success: false,
      error: 'Unauthorized',
    });

    render(
      <StreamChatProvider>
        <div data-testid="child">Hello</div>
      </StreamChatProvider>,
    );

    // Wait a tick for the async effect to settle
    await waitFor(() => {
      expect(mockGenerateStreamToken).toHaveBeenCalled();
    });

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('stream-chat-wrapper')).not.toBeInTheDocument();
  });
});
