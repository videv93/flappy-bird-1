import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreateCheckout } = vi.hoisted(() => ({
  mockCreateCheckout: vi.fn(),
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
    createCheckout: mockCreateCheckout,
  },
}));

import { createCheckout } from './createCheckout';
import { auth } from '@/lib/auth';
import { isPremium } from '@/lib/premium';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockIsPremium = isPremium as ReturnType<typeof vi.fn>;

describe('createCheckout', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POLAR_PRODUCT_PREMIUM_ID = 'prod_test_123';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env.POLAR_PRODUCT_PREMIUM_ID = originalEnv.POLAR_PRODUCT_PREMIUM_ID;
    process.env.BETTER_AUTH_URL = originalEnv.BETTER_AUTH_URL;
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await createCheckout();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('returns "Already premium" error for premium user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(true);

    const result = await createCheckout();

    expect(result).toEqual({ success: false, error: 'Already premium' });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('creates checkout and returns checkoutUrl for free user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockCreateCheckout.mockResolvedValue({
      id: 'checkout_abc',
      url: 'https://checkout.polar.sh/checkout_abc',
      userId: 'user_1',
      amount: 999,
      currency: 'usd',
    });

    const result = await createCheckout();

    expect(result).toEqual({
      success: true,
      data: { checkoutUrl: 'https://checkout.polar.sh/checkout_abc' },
    });
  });

  it('passes userId, productId, and customerEmail to provider', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_42', email: 'reader@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockCreateCheckout.mockResolvedValue({
      id: 'checkout_xyz',
      url: 'https://checkout.polar.sh/checkout_xyz',
      userId: 'user_42',
      amount: 999,
      currency: 'usd',
    });

    await createCheckout();

    expect(mockCreateCheckout).toHaveBeenCalledWith(
      'user_42',
      'prod_test_123',
      { customerEmail: 'reader@example.com' },
    );
  });

  it('returns generic error when provider throws', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);
    mockCreateCheckout.mockRejectedValue(new Error('Polar API error'));

    const result = await createCheckout();

    expect(result).toEqual({
      success: false,
      error: 'Failed to create checkout session',
    });
  });

  it('returns error when POLAR_PRODUCT_PREMIUM_ID is not set', async () => {
    delete process.env.POLAR_PRODUCT_PREMIUM_ID;
    mockGetSession.mockResolvedValue({
      user: { id: 'user_1', email: 'test@example.com' },
    });
    mockIsPremium.mockResolvedValue(false);

    const result = await createCheckout();

    expect(result).toEqual({
      success: false,
      error: 'Payment configuration error',
    });
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });
});
