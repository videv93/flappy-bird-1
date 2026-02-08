import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresenceChannel } from './usePresenceChannel';
import { usePresenceStore } from '@/stores/usePresenceStore';

// Mock getPusherClient
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
let mockPusherClient: { subscribe: typeof mockSubscribe; unsubscribe: typeof mockUnsubscribe } | null = null;

vi.mock('@/lib/pusher-client', () => ({
  getPusherClient: () => mockPusherClient,
}));

// Mock getRoomMembers
const mockGetRoomMembers = vi.fn();
vi.mock('@/actions/presence/getRoomMembers', () => ({
  getRoomMembers: (...args: unknown[]) => mockGetRoomMembers(...args),
}));

function createMockChannel() {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  return {
    bind: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
    unbind_all: vi.fn(),
    trigger: (event: string, data: unknown) => {
      if (handlers[event]) handlers[event](data);
    },
    handlers,
  };
}

describe('usePresenceChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    usePresenceStore.getState().reset();
    mockPusherClient = { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe };
    mockGetRoomMembers.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when channelId is null', () => {
    renderHook(() => usePresenceChannel({ channelId: null }));
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(usePresenceStore.getState().currentChannel).toBeNull();
  });

  it('does nothing when enabled is false', () => {
    renderHook(() => usePresenceChannel({ channelId: 'book-1', enabled: false }));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('subscribes to presence channel with correct name', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    expect(mockSubscribe).toHaveBeenCalledWith('presence-room-book-1');
  });

  it('sets channel name via joinChannel on subscribe', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    expect(usePresenceStore.getState().currentChannel).toBe('presence-room-book-1');
  });

  it('sets connectionMode to realtime only after subscription_succeeded', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    // Before subscription_succeeded, mode should NOT be realtime
    expect(usePresenceStore.getState().connectionMode).not.toBe('realtime');

    // Simulate subscription success
    act(() => {
      mockChannel.trigger('pusher:subscription_succeeded', { members: {} });
    });

    expect(usePresenceStore.getState().connectionMode).toBe('realtime');
  });

  it('populates members on subscription_succeeded', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    act(() => {
      mockChannel.trigger('pusher:subscription_succeeded', {
        members: {
          'user-1': { name: 'Alice', avatarUrl: null },
          'user-2': { name: 'Bob', avatarUrl: 'bob.jpg' },
        },
      });
    });

    const { members } = usePresenceStore.getState();
    expect(members.size).toBe(2);
    expect(members.get('user-1')?.name).toBe('Alice');
    expect(members.get('user-2')?.avatarUrl).toBe('bob.jpg');
  });

  it('adds member on member_added event', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    act(() => {
      mockChannel.trigger('pusher:member_added', {
        id: 'user-3',
        info: { name: 'Charlie', avatarUrl: null },
      });
    });

    expect(usePresenceStore.getState().members.get('user-3')?.name).toBe('Charlie');
  });

  it('removes member on member_removed event', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    act(() => {
      mockChannel.trigger('pusher:subscription_succeeded', {
        members: { 'user-1': { name: 'Alice', avatarUrl: null } },
      });
    });
    expect(usePresenceStore.getState().members.size).toBe(1);

    act(() => {
      mockChannel.trigger('pusher:member_removed', { id: 'user-1' });
    });
    expect(usePresenceStore.getState().members.size).toBe(0);
  });

  it('falls back to polling on subscription_error', async () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    await act(async () => {
      mockChannel.trigger('pusher:subscription_error', {});
    });

    expect(usePresenceStore.getState().connectionMode).toBe('polling');
    expect(mockGetRoomMembers).toHaveBeenCalledWith('book-1');
  });

  it('falls back to polling when Pusher client is null', async () => {
    mockPusherClient = null;

    await act(async () => {
      renderHook(() => usePresenceChannel({ channelId: 'book-1' }));
    });

    expect(usePresenceStore.getState().connectionMode).toBe('polling');
    expect(mockGetRoomMembers).toHaveBeenCalledWith('book-1');
  });

  it('calls onEvent callback for Pusher events', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);
    const onEvent = vi.fn();

    renderHook(() => usePresenceChannel({ channelId: 'book-1', onEvent }));

    act(() => {
      mockChannel.trigger('pusher:subscription_succeeded', { members: {} });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_succeeded' })
    );
  });

  it('calls onEvent for member_added', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);
    const onEvent = vi.fn();

    renderHook(() => usePresenceChannel({ channelId: 'book-1', onEvent }));

    act(() => {
      mockChannel.trigger('pusher:member_added', {
        id: 'user-1',
        info: { name: 'Alice', avatarUrl: null },
      });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'member_added', memberId: 'user-1' })
    );
  });

  it('cleans up subscription on unmount', () => {
    const mockChannel = createMockChannel();
    mockSubscribe.mockReturnValue(mockChannel);

    const { unmount } = renderHook(() => usePresenceChannel({ channelId: 'book-1' }));

    unmount();

    expect(mockChannel.unbind_all).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith('presence-room-book-1');
    expect(usePresenceStore.getState().currentChannel).toBeNull();
  });

  it('cleans up polling interval on unmount', async () => {
    mockPusherClient = null;
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    let unmountFn: () => void;
    await act(async () => {
      const { unmount } = renderHook(() => usePresenceChannel({ channelId: 'book-1' }));
      unmountFn = unmount;
    });

    act(() => {
      unmountFn!();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('polls at configured interval', async () => {
    mockPusherClient = null;

    await act(async () => {
      renderHook(() =>
        usePresenceChannel({ channelId: 'book-1', pollingIntervalMs: 5000 })
      );
    });

    // Initial poll
    expect(mockGetRoomMembers).toHaveBeenCalledTimes(1);

    // Advance past one interval
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockGetRoomMembers).toHaveBeenCalledTimes(2);
  });
});
