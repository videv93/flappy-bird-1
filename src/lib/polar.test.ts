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

vi.mock('@polar-sh/sdk', () => ({
  Polar: class MockPolar {
    checkouts = { create: vi.fn() };
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
