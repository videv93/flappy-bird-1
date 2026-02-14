import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock dependencies
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    affiliateClick: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/affiliate/affiliate-manager', () => ({
  generateAffiliateLink: vi.fn(
    (isbn: string, provider: string) =>
      `https://mock.example.com/${provider}/${isbn}`
  ),
}));

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/affiliate');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/affiliate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when isbn is missing', async () => {
    const res = await GET(makeRequest({ provider: 'amazon' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('ISBN');
  });

  it('returns 400 when isbn is invalid', async () => {
    const res = await GET(makeRequest({ isbn: 'abc', provider: 'amazon' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is missing', async () => {
    const res = await GET(makeRequest({ isbn: '1234567890' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('provider');
  });

  it('returns 400 when provider is invalid', async () => {
    const res = await GET(
      makeRequest({ isbn: '1234567890', provider: 'ebay' })
    );
    expect(res.status).toBe(400);
  });

  it('redirects to affiliate URL for valid amazon request', async () => {
    const res = await GET(
      makeRequest({ isbn: '1234567890', provider: 'amazon' })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://mock.example.com/amazon/1234567890'
    );
  });

  it('redirects to affiliate URL for valid bookshop request', async () => {
    const res = await GET(
      makeRequest({ isbn: '1234567890', provider: 'bookshop' })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://mock.example.com/bookshop/1234567890'
    );
  });

  it('accepts ISBN-13', async () => {
    const res = await GET(
      makeRequest({ isbn: '9781234567890', provider: 'amazon' })
    );
    expect(res.status).toBe(307);
  });

  it('accepts ISBN-10 with X check digit', async () => {
    const res = await GET(
      makeRequest({ isbn: '123456789X', provider: 'amazon' })
    );
    expect(res.status).toBe(307);
  });

  it('rejects ISBN with 11 digits (invalid length)', async () => {
    const res = await GET(
      makeRequest({ isbn: '12345678901', provider: 'amazon' })
    );
    expect(res.status).toBe(400);
  });

  it('tracks click when user is authenticated with bookId', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1' },
      session: {},
    } as never);

    await GET(
      makeRequest({ isbn: '1234567890', provider: 'amazon', bookId: 'book-1' })
    );

    expect(prisma.affiliateClick.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-1',
        provider: 'amazon',
      },
    });
  });

  it('includes source in click tracking when provided', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1' },
      session: {},
    } as never);

    await GET(
      makeRequest({ isbn: '1234567890', provider: 'amazon', bookId: 'book-1', source: 'recommendation' })
    );

    expect(prisma.affiliateClick.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-1',
        provider: 'amazon',
        source: 'recommendation',
      },
    });
  });

  it('includes buddy-read source in click tracking', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1' },
      session: {},
    } as never);

    await GET(
      makeRequest({ isbn: '1234567890', provider: 'amazon', bookId: 'book-1', source: 'buddy-read' })
    );

    expect(prisma.affiliateClick.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-1',
        provider: 'amazon',
        source: 'buddy-read',
      },
    });
  });

  it('does not track click when user is unauthenticated', async () => {
    const { prisma } = await import('@/lib/prisma');

    await GET(
      makeRequest({ isbn: '1234567890', provider: 'amazon', bookId: 'book-1' })
    );

    expect(prisma.affiliateClick.create).not.toHaveBeenCalled();
  });
});
