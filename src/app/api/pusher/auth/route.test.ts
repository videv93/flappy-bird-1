import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/pusher-server', () => ({
  getPusher: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { getPusher } from '@/lib/pusher-server';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockGetPusher = getPusher as unknown as ReturnType<typeof vi.fn>;

function createRequest(socketId: string, channelName: string): NextRequest {
  const formData = new FormData();
  formData.set('socket_id', socketId);
  formData.set('channel_name', channelName);
  return new NextRequest('http://localhost:3000/api/pusher/auth', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/pusher/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const request = createRequest('socket-1', 'private-user-user-1');

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when session has no user', async () => {
    mockGetSession.mockResolvedValue({ user: null });
    const request = createRequest('socket-1', 'private-user-user-1');

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns 403 when private channel does not match user ID', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', image: null },
    });
    const request = createRequest('socket-1', 'private-user-user-2');

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 for unrecognized channel prefixes', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', image: null },
    });
    const request = createRequest('socket-1', 'public-channel');

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns 503 when Pusher is not configured for private channel', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', image: null },
    });
    mockGetPusher.mockReturnValue(null);
    const request = createRequest('socket-1', 'private-user-user-1');

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('Pusher not configured');
  });

  it('authorizes valid private channel subscription', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', image: null },
    });
    const mockAuthResponse = { auth: 'mock-auth-token' };
    const mockPusher = {
      authorizeChannel: vi.fn().mockReturnValue(mockAuthResponse),
    };
    mockGetPusher.mockReturnValue(mockPusher);

    const request = createRequest('socket-1', 'private-user-user-1');
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockAuthResponse);
    expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
      'socket-1',
      'private-user-user-1',
      { user_id: 'user-1' }
    );
  });

  it('passes correct user_id to authorizeChannel for private channel', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'abc-123', name: 'Test', image: null },
    });
    const mockPusher = {
      authorizeChannel: vi.fn().mockReturnValue({ auth: 'token' }),
    };
    mockGetPusher.mockReturnValue(mockPusher);

    const request = createRequest('socket-99', 'private-user-abc-123');
    await POST(request);

    expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
      'socket-99',
      'private-user-abc-123',
      { user_id: 'abc-123' }
    );
  });

  it('prevents user from subscribing to another users private channel', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', image: null },
    });
    const request = createRequest('socket-1', 'private-user-attacker-id');

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  // Presence channel tests
  describe('presence channels', () => {
    it('authorizes presence-room channel for authenticated user', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', name: 'Test User', image: 'https://example.com/avatar.jpg' },
      });
      const mockAuthResponse = { auth: 'mock-presence-auth', channel_data: '{}' };
      const mockPusher = {
        authorizeChannel: vi.fn().mockReturnValue(mockAuthResponse),
      };
      mockGetPusher.mockReturnValue(mockPusher);

      const request = createRequest('socket-1', 'presence-room-book-123');
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockAuthResponse);
      expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
        'socket-1',
        'presence-room-book-123',
        {
          user_id: 'user-1',
          user_info: {
            name: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        }
      );
    });

    it('includes null avatarUrl when user has no image', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', name: 'Test User', image: null },
      });
      const mockPusher = {
        authorizeChannel: vi.fn().mockReturnValue({ auth: 'token' }),
      };
      mockGetPusher.mockReturnValue(mockPusher);

      const request = createRequest('socket-1', 'presence-room-book-456');
      await POST(request);

      expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
        'socket-1',
        'presence-room-book-456',
        {
          user_id: 'user-1',
          user_info: {
            name: 'Test User',
            avatarUrl: null,
          },
        }
      );
    });

    it('returns 503 when Pusher is not configured for presence channel', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', name: 'Test', image: null },
      });
      mockGetPusher.mockReturnValue(null);
      const request = createRequest('socket-1', 'presence-room-book-123');

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error).toBe('Pusher not configured');
    });

    it('returns 403 for presence channels with wrong prefix', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', name: 'Test', image: null },
      });
      const request = createRequest('socket-1', 'presence-other-channel');

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('handles user with no name gracefully', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', name: null, image: null },
      });
      const mockPusher = {
        authorizeChannel: vi.fn().mockReturnValue({ auth: 'token' }),
      };
      mockGetPusher.mockReturnValue(mockPusher);

      const request = createRequest('socket-1', 'presence-room-book-789');
      await POST(request);

      expect(mockPusher.authorizeChannel).toHaveBeenCalledWith(
        'socket-1',
        'presence-room-book-789',
        {
          user_id: 'user-1',
          user_info: {
            name: 'Anonymous',
            avatarUrl: null,
          },
        }
      );
    });
  });
});
