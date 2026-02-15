import { describe, it, expect, vi, beforeEach } from 'vitest';
import { joinRoom } from './joinRoom';

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

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockClaimFindFirst = vi.fn();

const mockPusherTrigger = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/pusher-server', () => ({
  getPusher: () => ({ trigger: mockPusherTrigger }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        roomPresence: {
          findFirst: mockFindFirst,
          create: mockCreate,
          update: mockUpdate,
        },
        authorClaim: {
          findFirst: mockClaimFindFirst,
        },
      })
    ),
  },
}));

import { auth } from '@/lib/auth';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe('joinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', name: 'Test User' } });
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await joinRoom('book-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Unauthorized');
  });

  it('creates new presence when user not in room', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockClaimFindFirst.mockResolvedValue(null);
    const mockPresence = {
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      leftAt: null,
      isAuthor: false,
    };
    mockCreate.mockResolvedValue(mockPresence);

    const result = await joinRoom('book-1');

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe('presence-1');
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', bookId: 'book-1', isAuthor: false },
    });
  });

  it('updates lastActiveAt when user already in room', async () => {
    const existing = {
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      joinedAt: new Date(),
      lastActiveAt: new Date('2026-01-01'),
      leftAt: null,
      isAuthor: false,
    };
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue({ ...existing, lastActiveAt: new Date() });

    const result = await joinRoom('book-1');

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'presence-1' },
      data: { lastActiveAt: expect.any(Date) },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns error for empty bookId', async () => {
    const result = await joinRoom('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Invalid book ID');
  });

  it('queries for active presence (leftAt null)', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockClaimFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'p1' });

    await joinRoom('book-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', bookId: 'book-1', leftAt: null },
    });
  });

  // --- Author join notification (Story 5.7) ---

  it('triggers room:author-joined Pusher event when verified author joins', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
    mockCreate.mockResolvedValue({
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      isAuthor: true,
    });

    await joinRoom('book-1');

    expect(mockPusherTrigger).toHaveBeenCalledWith(
      'presence-room-book-1',
      'room:author-joined',
      { authorId: 'user-1', authorName: 'Test User' }
    );
  });

  it('does NOT trigger room:author-joined when non-author joins', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockClaimFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      isAuthor: false,
    });

    await joinRoom('book-1');

    expect(mockPusherTrigger).not.toHaveBeenCalled();
  });

  it('does NOT trigger room:author-joined on author reconnect (existing presence)', async () => {
    const existingAuthorPresence = {
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      joinedAt: new Date(),
      lastActiveAt: new Date('2026-01-01'),
      leftAt: null,
      isAuthor: true,
    };
    mockFindFirst.mockResolvedValue(existingAuthorPresence);
    mockUpdate.mockResolvedValue({ ...existingAuthorPresence, lastActiveAt: new Date() });

    await joinRoom('book-1');

    expect(mockPusherTrigger).not.toHaveBeenCalled();
  });

  it('does not fail join when Pusher trigger fails (fire-and-forget)', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
    mockCreate.mockResolvedValue({
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      isAuthor: true,
    });
    mockPusherTrigger.mockRejectedValue(new Error('Pusher unavailable'));

    const result = await joinRoom('book-1');

    expect(result.success).toBe(true);
  });
});
