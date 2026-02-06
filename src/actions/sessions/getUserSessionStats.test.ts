import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserSessionStats } from './getUserSessionStats';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    readingSession: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const mockAuth = vi.mocked(auth.api.getSession);
const mockAggregate = vi.mocked(prisma.readingSession.aggregate);

describe('getUserSessionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com', emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'session-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
    });
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getUserSessionStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('You must be logged in to view stats');
    }
  });

  it('returns aggregated stats', async () => {
    mockAggregate.mockResolvedValue({
      _sum: { duration: 3600 },
      _count: { id: 5 },
      _avg: { duration: 720 },
      _min: { duration: null },
      _max: { duration: null },
    } as never);

    const result = await getUserSessionStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalSeconds).toBe(3600);
      expect(result.data.sessionCount).toBe(5);
      expect(result.data.avgSeconds).toBe(720);
    }

    expect(mockAggregate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      _sum: { duration: true },
      _count: { id: true },
      _avg: { duration: true },
    });
  });

  it('returns zeros when no sessions exist', async () => {
    mockAggregate.mockResolvedValue({
      _sum: { duration: null },
      _count: { id: 0 },
      _avg: { duration: null },
      _min: { duration: null },
      _max: { duration: null },
    } as never);

    const result = await getUserSessionStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalSeconds).toBe(0);
      expect(result.data.sessionCount).toBe(0);
      expect(result.data.avgSeconds).toBe(0);
    }
  });

  it('rounds average seconds', async () => {
    mockAggregate.mockResolvedValue({
      _sum: { duration: 1000 },
      _count: { id: 3 },
      _avg: { duration: 333.33 },
      _min: { duration: null },
      _max: { duration: null },
    } as never);

    const result = await getUserSessionStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avgSeconds).toBe(333);
    }
  });

  it('handles database error gracefully', async () => {
    mockAggregate.mockRejectedValue(new Error('DB connection failed'));

    const result = await getUserSessionStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to fetch reading stats');
    }
  });
});
