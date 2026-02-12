import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateToken } = vi.hoisted(() => ({
  mockCreateToken: vi.fn(),
}));

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

vi.mock('@/lib/stream', () => ({
  getStreamServerClient: () => ({
    createToken: mockCreateToken,
  }),
}));

import { generateStreamToken } from './generateStreamToken';
import { auth } from '@/lib/auth';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe('generateStreamToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await generateStreamToken();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockCreateToken).not.toHaveBeenCalled();
  });

  it('returns unauthorized when session has no user id', async () => {
    mockGetSession.mockResolvedValue({ user: {} });

    const result = await generateStreamToken();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns token for authenticated user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_123', name: 'Test User' },
    });
    mockCreateToken.mockReturnValue('stream_token_abc');

    const result = await generateStreamToken();

    expect(result).toEqual({
      success: true,
      data: { token: 'stream_token_abc' },
    });
    expect(mockCreateToken).toHaveBeenCalledWith('user_123', expect.any(Number));
  });

  it('sets 1-hour token expiration', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_123' },
    });
    mockCreateToken.mockReturnValue('token');

    const before = Math.floor(Date.now() / 1000) + 3600;
    await generateStreamToken();
    const after = Math.floor(Date.now() / 1000) + 3600;

    const expiration = mockCreateToken.mock.calls[0][1];
    expect(expiration).toBeGreaterThanOrEqual(before);
    expect(expiration).toBeLessThanOrEqual(after);
  });

  it('returns error when createToken throws', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_123' },
    });
    mockCreateToken.mockImplementation(() => {
      throw new Error('Stream API error');
    });

    const result = await generateStreamToken();

    expect(result).toEqual({
      success: false,
      error: 'Failed to generate Stream token',
    });
  });
});
