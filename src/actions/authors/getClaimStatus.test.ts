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
    },
  },
}));

import { getClaimStatus } from './getClaimStatus';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.authorClaim.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('getClaimStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasClaim false when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getClaimStatus('book-1');

    expect(result).toEqual({ success: true, data: { hasClaim: false } });
  });

  it('returns hasClaim false when no claim exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);

    const result = await getClaimStatus('book-1');

    expect(result).toEqual({ success: true, data: { hasClaim: false } });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        userId_bookId: { userId: 'user-1', bookId: 'book-1' },
      },
      select: { id: true, status: true },
    });
  });

  it('returns claim status when claim exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'claim-1', status: 'PENDING' });

    const result = await getClaimStatus('book-1');

    expect(result).toEqual({
      success: true,
      data: { hasClaim: true, status: 'PENDING', claimId: 'claim-1' },
    });
  });

  it('returns approved claim status', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'claim-2', status: 'APPROVED' });

    const result = await getClaimStatus('book-1');

    expect(result).toEqual({
      success: true,
      data: { hasClaim: true, status: 'APPROVED', claimId: 'claim-2' },
    });
  });

  it('returns error on database failure', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB error'));

    const result = await getClaimStatus('book-1');

    expect(result).toEqual({ success: false, error: 'Failed to get claim status' });
  });
});
