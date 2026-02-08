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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        roomPresence: {
          findFirst: mockFindFirst,
          create: mockCreate,
          update: mockUpdate,
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
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await joinRoom('book-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Unauthorized');
  });

  it('creates new presence when user not in room', async () => {
    mockFindFirst.mockResolvedValue(null);
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
      data: { userId: 'user-1', bookId: 'book-1' },
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
    mockCreate.mockResolvedValue({ id: 'p1' });

    await joinRoom('book-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', bookId: 'book-1', leftAt: null },
    });
  });
});
