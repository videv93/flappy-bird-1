import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
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
    authorClaim: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/pusher-server', () => ({
  getPusher: vi.fn(() => ({
    trigger: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((id: string) => ['admin-1', 'admin-2'].includes(id)),
}));

import { reviewClaim } from './reviewClaim';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.authorClaim.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.authorClaim.update as unknown as ReturnType<typeof vi.fn>;

describe('reviewClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await reviewClaim({
      claimId: 'claim-1',
      decision: 'approve',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error when user is not admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'regular-user' } });

    const result = await reviewClaim({
      claimId: 'claim-1',
      decision: 'approve',
    });

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error when claim not found', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockFindUnique.mockResolvedValue(null);

    const result = await reviewClaim({
      claimId: 'claim-nonexistent',
      decision: 'approve',
    });

    expect(result).toEqual({ success: false, error: 'Claim not found' });
  });

  it('returns error when claim already reviewed', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'claim-1',
      status: 'APPROVED',
      userId: 'user-1',
      book: { title: 'Test Book' },
    });

    const result = await reviewClaim({
      claimId: 'claim-1',
      decision: 'reject',
    });

    expect(result).toEqual({
      success: false,
      error: 'Claim has already been reviewed',
    });
  });

  it('approves a claim successfully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'claim-1',
      status: 'PENDING',
      userId: 'user-1',
      book: { title: 'Test Book' },
    });
    const updatedClaim = {
      id: 'claim-1',
      status: 'APPROVED',
      reviewedById: 'admin-1',
    };
    mockUpdate.mockResolvedValue(updatedClaim);

    const result = await reviewClaim({
      claimId: 'claim-1',
      decision: 'approve',
    });

    expect(result).toEqual({ success: true, data: updatedClaim });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
      data: expect.objectContaining({
        status: 'APPROVED',
        reviewedById: 'admin-1',
      }),
    });
  });

  it('rejects a claim successfully', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'claim-1',
      status: 'PENDING',
      userId: 'user-1',
      book: { title: 'Test Book' },
    });
    const updatedClaim = {
      id: 'claim-1',
      status: 'REJECTED',
      reviewedById: 'admin-1',
    };
    mockUpdate.mockResolvedValue(updatedClaim);

    const result = await reviewClaim({
      claimId: 'claim-1',
      decision: 'reject',
    });

    expect(result).toEqual({ success: true, data: updatedClaim });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
      data: expect.objectContaining({
        status: 'REJECTED',
        reviewedById: 'admin-1',
      }),
    });
  });

  it('returns error for invalid input', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });

    const result = await reviewClaim({
      claimId: '',
      decision: 'invalid',
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });
});
