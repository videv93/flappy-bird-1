import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
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

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
      fn({
        authorClaim: {
          findUnique: mockFindUnique,
          create: mockCreate,
          delete: mockDelete,
        },
      })
    ),
  },
}));

import { submitClaim } from './submitClaim';
import { auth } from '@/lib/auth';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe('submitClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'AMAZON',
      verificationUrl: 'https://amazon.com/author/test',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error for invalid input', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = await submitClaim({
      bookId: '',
      verificationMethod: 'INVALID',
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });

  it('returns error when pending claim already exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'claim-1',
      status: 'PENDING',
    });

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'AMAZON',
      verificationUrl: 'https://amazon.com/author/test',
    });

    expect(result).toEqual({
      success: false,
      error: 'You already have a pending claim for this book',
    });
  });

  it('returns error when approved claim already exists', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'claim-1',
      status: 'APPROVED',
    });

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'WEBSITE',
      verificationUrl: 'https://example.com',
    });

    expect(result).toEqual({
      success: false,
      error: 'You are already verified as the author of this book',
    });
  });

  it('creates claim successfully with AMAZON method', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);
    const mockClaim = {
      id: 'claim-1',
      userId: 'user-1',
      bookId: 'book-1',
      verificationMethod: 'AMAZON',
      verificationUrl: 'https://amazon.com/author/test',
      status: 'PENDING',
    };
    mockCreate.mockResolvedValue(mockClaim);

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'AMAZON',
      verificationUrl: 'https://amazon.com/author/test',
    });

    expect(result).toEqual({ success: true, data: mockClaim });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-1',
        verificationMethod: 'AMAZON',
        verificationUrl: 'https://amazon.com/author/test',
        verificationText: null,
      },
    });
  });

  it('creates claim with MANUAL method', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);
    const mockClaim = {
      id: 'claim-2',
      userId: 'user-1',
      bookId: 'book-1',
      verificationMethod: 'MANUAL',
      verificationText: 'I wrote this book and can prove it',
      status: 'PENDING',
    };
    mockCreate.mockResolvedValue(mockClaim);

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'MANUAL',
      verificationText: 'I wrote this book and can prove it',
    });

    expect(result).toEqual({ success: true, data: mockClaim });
  });

  it('allows re-submission after rejection by deleting old claim', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({
      id: 'old-claim',
      status: 'REJECTED',
    });
    mockDelete.mockResolvedValue({});
    const mockClaim = { id: 'new-claim', status: 'PENDING' };
    mockCreate.mockResolvedValue(mockClaim);

    const result = await submitClaim({
      bookId: 'book-1',
      verificationMethod: 'WEBSITE',
      verificationUrl: 'https://mysite.com',
    });

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'old-claim' },
    });
    expect(result).toEqual({ success: true, data: mockClaim });
  });
});
