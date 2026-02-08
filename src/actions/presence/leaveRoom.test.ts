import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaveRoom } from './leaveRoom';

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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    roomPresence: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.roomPresence.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.roomPresence.update as unknown as ReturnType<typeof vi.fn>;

describe('leaveRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await leaveRoom('book-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Unauthorized');
  });

  it('returns error when user not in room', async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await leaveRoom('book-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Not in this room');
  });

  it('sets leftAt on existing presence record', async () => {
    const existing = {
      id: 'presence-1',
      userId: 'user-1',
      bookId: 'book-1',
      leftAt: null,
    };
    mockFindFirst.mockResolvedValue(existing);
    mockUpdate.mockResolvedValue({ ...existing, leftAt: new Date() });

    const result = await leaveRoom('book-1');

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.leftAt).toBeInstanceOf(Date);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'presence-1' },
      data: { leftAt: expect.any(Date) },
    });
  });

  it('returns error for empty bookId', async () => {
    const result = await leaveRoom('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Invalid book ID');
  });
});
