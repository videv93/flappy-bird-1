import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockValidateEvent = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.POLAR_ACCESS_TOKEN = 'polar_pat_test';
  process.env.POLAR_WEBHOOK_SECRET = 'whsec_test_secret';
});

vi.mock('@polar-sh/sdk/webhooks', () => ({
  validateEvent: mockValidateEvent,
  WebhookVerificationError: class WebhookVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WebhookVerificationError';
    }
  },
}));

const mockCheckoutsGet = vi.hoisted(() => vi.fn());

vi.mock('@polar-sh/sdk', () => ({
  Polar: class MockPolar {
    checkouts = { create: vi.fn(), get: mockCheckoutsGet };
  },
}));

import { PolarPaymentProvider } from './polar';
import { Polar } from '@polar-sh/sdk';

describe('PolarPaymentProvider.verifyWebhook', () => {
  let provider: PolarPaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POLAR_WEBHOOK_SECRET = 'whsec_test_secret';
    provider = new PolarPaymentProvider(new Polar({ accessToken: 'test' }));
  });

  it('returns parsed WebhookEvent for valid signature', async () => {
    mockValidateEvent.mockReturnValue({
      type: 'order.created',
      data: { id: 'order-1', checkoutId: 'co_123' },
    });

    const result = await provider.verifyWebhook('raw-body', {
      'webhook-id': 'wh_1',
      'webhook-timestamp': '123',
      'webhook-signature': 'v1,sig',
    });

    expect(result.type).toBe('order.created');
    expect(result.payload).toEqual({ id: 'order-1', checkoutId: 'co_123' });
    expect(mockValidateEvent).toHaveBeenCalledWith(
      'raw-body',
      { 'webhook-id': 'wh_1', 'webhook-timestamp': '123', 'webhook-signature': 'v1,sig' },
      'whsec_test_secret',
    );
  });

  it('throws WebhookVerificationError for invalid signature', async () => {
    const { WebhookVerificationError } = await import('@polar-sh/sdk/webhooks');
    mockValidateEvent.mockImplementation(() => {
      throw new WebhookVerificationError('Invalid signature');
    });

    await expect(
      provider.verifyWebhook('bad-body', { 'webhook-signature': 'bad' }),
    ).rejects.toThrow('Invalid signature');
  });

  it('throws when POLAR_WEBHOOK_SECRET is not set', async () => {
    delete process.env.POLAR_WEBHOOK_SECRET;

    await expect(
      provider.verifyWebhook('body', { 'webhook-signature': 'sig' }),
    ).rejects.toThrow('POLAR_WEBHOOK_SECRET');
  });
});

describe('PolarPaymentProvider.getPaymentStatus', () => {
  let provider: PolarPaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PolarPaymentProvider(new Polar({ accessToken: 'test' }));
  });

  it('returns successful PaymentResult for succeeded checkout', async () => {
    mockCheckoutsGet.mockResolvedValue({
      id: 'co_123',
      status: 'succeeded',
      amount: 999,
      currency: 'usd',
      metadata: { userId: 'user_1' },
      customerId: 'cust_456',
    });

    const result = await provider.getPaymentStatus('co_123');

    expect(result).toEqual({
      success: true,
      checkoutId: 'co_123',
      customerId: 'cust_456',
      amount: 999,
      currency: 'usd',
    });
    expect(mockCheckoutsGet).toHaveBeenCalledWith({ id: 'co_123' });
  });

  it('returns unsuccessful PaymentResult for non-succeeded checkout', async () => {
    mockCheckoutsGet.mockResolvedValue({
      id: 'co_789',
      status: 'open',
      amount: 999,
      currency: 'usd',
      metadata: {},
      customerId: null,
    });

    const result = await provider.getPaymentStatus('co_789');

    expect(result).toEqual({
      success: false,
      checkoutId: 'co_789',
      customerId: undefined,
      amount: 999,
      currency: 'usd',
    });
  });

  it('throws when checkout not found on Polar', async () => {
    mockCheckoutsGet.mockRejectedValue(new Error('Not found'));

    await expect(provider.getPaymentStatus('co_invalid')).rejects.toThrow('Not found');
  });
});
