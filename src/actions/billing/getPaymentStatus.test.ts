import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPaymentStatus } = vi.hoisted(() => ({
  mockGetPaymentStatus: vi.fn(),
}));

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

vi.mock('@/lib/premium', () => ({
  isPremium: vi.fn(),
}));

vi.mock('@/lib/polar', () => ({
  polarPaymentProvider: {
    getPaymentStatus: mockGetPaymentStatus,
  },
}));

import { getPaymentStatus } from './getPaymentStatus';
import { auth } from '@/lib/auth';
import { isPremium } from '@/lib/premium';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockIsPremium = isPremium as ReturnType<typeof vi.fn>;

describe('getPaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
  });

  it('returns error for empty checkoutId', async () => {
    const result = await getPaymentStatus('');

    expect(result).toEqual({ success: false, error: 'Invalid checkout ID' });
  });

  it('returns isPremium: true immediately if user is already premium', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(true);

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      data: { isPremium: true, paymentStatus: 'COMPLETED' },
    });
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
  });

  it('returns COMPLETED when Polar succeeded and DB confirms premium', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    // First call: not premium yet, second call: premium (webhook arrived)
    mockIsPremium.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      checkoutId: 'co_123',
      customerId: 'cust_1',
      amount: 999,
      currency: 'usd',
    });

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      data: { isPremium: true, paymentStatus: 'COMPLETED' },
    });
  });

  it('returns PROCESSING when Polar succeeded but DB not yet updated', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockGetPaymentStatus.mockResolvedValue({
      success: true,
      checkoutId: 'co_123',
      customerId: 'cust_1',
      amount: 999,
      currency: 'usd',
    });

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      data: { isPremium: false, paymentStatus: 'PROCESSING' },
    });
  });

  it('returns PROCESSING when Polar checkout not yet succeeded', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockGetPaymentStatus.mockResolvedValue({
      success: false,
      checkoutId: 'co_123',
      amount: 999,
      currency: 'usd',
    });

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      data: { isPremium: false, paymentStatus: 'PROCESSING' },
    });
  });

  it('returns PROCESSING when Polar API throws (graceful fallback)', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockGetPaymentStatus.mockRejectedValue(new Error('Polar API error'));

    const result = await getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      data: { isPremium: false, paymentStatus: 'PROCESSING' },
    });
  });
});
