import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userBook: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/premium', () => ({
  isPremium: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { getBookLimitInfo } from './getBookLimitInfo';
import { prisma } from '@/lib/prisma';
import { isPremium } from '@/lib/premium';
import { auth } from '@/lib/auth';

const mockIsPremium = isPremium as unknown as ReturnType<typeof vi.fn>;
const mockCount = prisma.userBook.count as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe('getBookLimitInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct count and isPremium=false for free user', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockIsPremium.mockResolvedValue(false);
    mockCount.mockResolvedValue(2);

    const result = await getBookLimitInfo();

    expect(result).toEqual({
      success: true,
      data: {
        isPremium: false,
        currentBookCount: 2,
        maxBooks: 3,
      },
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', deletedAt: null },
    });
  });

  it('returns isPremium=true for premium user', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-2' } });
    mockIsPremium.mockResolvedValue(true);
    mockCount.mockResolvedValue(5);

    const result = await getBookLimitInfo();

    expect(result).toEqual({
      success: true,
      data: {
        isPremium: true,
        currentBookCount: 5,
        maxBooks: 3,
      },
    });
  });

  it('returns unauthorized error when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getBookLimitInfo();

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(mockIsPremium).not.toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('returns error when session has no user', async () => {
    mockGetSession.mockResolvedValue({ user: null });

    const result = await getBookLimitInfo();

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns error when database query throws', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockCount.mockRejectedValue(new Error('DB connection failed'));

    const result = await getBookLimitInfo();

    expect(result).toEqual({
      success: false,
      error: 'Failed to load book limit info',
    });
  });
});
