import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetInstance = vi.fn().mockReturnValue({ type: 'server-client' });

vi.mock('stream-chat', () => ({
  StreamChat: {
    getInstance: mockGetInstance,
  },
}));

describe('getStreamServerClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockGetInstance.mockClear();
    process.env.STREAM_API_KEY = 'test_key';
    process.env.STREAM_API_SECRET = 'test_secret';
  });

  afterEach(() => {
    process.env.STREAM_API_KEY = originalEnv.STREAM_API_KEY;
    process.env.STREAM_API_SECRET = originalEnv.STREAM_API_SECRET;
  });

  it('returns a server client instance created with key and secret', async () => {
    const { getStreamServerClient } = await import('./stream');
    const client = getStreamServerClient();

    expect(mockGetInstance).toHaveBeenCalledWith('test_key', 'test_secret');
    expect(client).toEqual({ type: 'server-client' });
  });

  it('throws when STREAM_API_KEY is missing', async () => {
    delete process.env.STREAM_API_KEY;
    const { getStreamServerClient } = await import('./stream');

    expect(() => getStreamServerClient()).toThrow(
      'Missing Stream environment variables',
    );
  });

  it('throws when STREAM_API_SECRET is missing', async () => {
    delete process.env.STREAM_API_SECRET;
    const { getStreamServerClient } = await import('./stream');

    expect(() => getStreamServerClient()).toThrow(
      'Missing Stream environment variables',
    );
  });

  it('does not throw on import when env vars are missing', async () => {
    delete process.env.STREAM_API_KEY;
    delete process.env.STREAM_API_SECRET;

    // Import should succeed — no module-level throw
    const mod = await import('./stream');
    expect(mod.getStreamServerClient).toBeDefined();
  });
});
