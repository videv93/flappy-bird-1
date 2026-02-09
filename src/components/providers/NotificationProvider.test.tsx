import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationProvider } from './NotificationProvider';
import { useNotificationStore } from '@/stores/useNotificationStore';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock auth provider
const mockUseAuth = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Pusher client
const mockBind = vi.fn();
const mockUnbind = vi.fn();
const mockSubscribe = vi.fn(() => ({
  bind: mockBind,
  unbind: mockUnbind,
}));
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/pusher-client', () => ({
  getPusherClient: vi.fn(),
}));

import { getPusherClient } from '@/lib/pusher-client';
const mockGetPusherClient = getPusherClient as ReturnType<typeof vi.fn>;

// Mock getUnreadKudosCount
vi.mock('@/actions/social/getUnreadKudosCount', () => ({
  getUnreadKudosCount: vi.fn(),
}));

import { getUnreadKudosCount } from '@/actions/social/getUnreadKudosCount';
const mockGetUnreadKudosCount = getUnreadKudosCount as ReturnType<typeof vi.fn>;

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('NotificationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      unreadCount: 0,
      pendingToasts: [],
      batchTimerId: null,
    });
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1', email: 'test@test.com', name: 'Test', image: null } },
      isAuthenticated: true,
      isLoading: false,
    });
    mockGetPusherClient.mockReturnValue({
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });
    mockGetUnreadKudosCount.mockResolvedValue({
      success: true,
      data: { count: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children', () => {
    const { getByText } = render(
      <NotificationProvider>
        <div>Test Child</div>
      </NotificationProvider>
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('subscribes to Pusher channel when authenticated', async () => {
    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('private-user-user-1');
    });
  });

  it('binds kudos:received event handler', async () => {
    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockBind).toHaveBeenCalledWith('kudos:received', expect.any(Function));
    });
  });

  it('does not subscribe when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('does not subscribe when Pusher client is null', () => {
    mockGetPusherClient.mockReturnValue(null);

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('fetches initial unread count on mount', async () => {
    mockGetUnreadKudosCount.mockResolvedValue({
      success: true,
      data: { count: 5 },
    });

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockGetUnreadKudosCount).toHaveBeenCalled();
      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });
  });

  it('handles Pusher connection errors silently', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPusherClient.mockReturnValue({
      subscribe: vi.fn(() => {
        throw new Error('Connection failed');
      }),
      unsubscribe: vi.fn(),
    });

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Pusher subscription error:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('binds moderation:content-removed event handler', async () => {
    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockBind).toHaveBeenCalledWith('moderation:content-removed', expect.any(Function));
    });
  });

  it('binds moderation:content-restored event handler', async () => {
    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockBind).toHaveBeenCalledWith('moderation:content-restored', expect.any(Function));
    });
  });

  it('shows toast with correct message for content removal', async () => {
    const { toast } = await import('sonner');
    const mockToast = toast as unknown as ReturnType<typeof vi.fn>;

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockBind).toHaveBeenCalledWith('moderation:content-removed', expect.any(Function));
    });

    // Find the handler and call it
    const contentRemovedCall = mockBind.mock.calls.find(
      (call: unknown[]) => call[0] === 'moderation:content-removed'
    )!;
    const handler = contentRemovedCall[1];
    handler({ contentType: 'PROFILE_BIO', violationType: 'SPAM' });

    expect(mockToast).toHaveBeenCalledWith(
      'Your bio was removed for violating our spam policy.',
      { duration: 6000 }
    );
  });

  it('shows toast for content restoration', async () => {
    const { toast } = await import('sonner');
    const mockToast = toast as unknown as ReturnType<typeof vi.fn>;

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockBind).toHaveBeenCalledWith('moderation:content-restored', expect.any(Function));
    });

    const contentRestoredCall = mockBind.mock.calls.find(
      (call: unknown[]) => call[0] === 'moderation:content-restored'
    )!;
    const handler = contentRestoredCall[1];
    handler({ contentType: 'PROFILE_BIO' });

    expect(mockToast).toHaveBeenCalledWith(
      'Your content has been restored.',
      { duration: 6000 }
    );
  });

  it('handles failed unread count fetch gracefully', async () => {
    mockGetUnreadKudosCount.mockResolvedValue({
      success: false,
      error: 'Failed',
    });

    render(
      <NotificationProvider>
        <div>Test</div>
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(mockGetUnreadKudosCount).toHaveBeenCalled();
    });

    // Should not crash, unread count stays at 0
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
