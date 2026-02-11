import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyWebhook = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock('@/lib/polar', () => ({
  polarPaymentProvider: {
    verifyWebhook: (...args: unknown[]) => mockVerifyWebhook(...args),
  },
  WebhookVerificationError: class WebhookVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WebhookVerificationError';
    }
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Need to import WebhookVerificationError from the mock to use instanceof
import { WebhookVerificationError } from '@/lib/polar';
import { POST } from './route';

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/polar', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'webhook-id': 'wh_123',
      'webhook-timestamp': '1234567890',
      'webhook-signature': 'v1,valid-sig',
      ...headers,
    },
  });
}

const validOrderPayload = {
  checkoutId: 'co_abc123',
  customerId: 'cust_xyz',
  totalAmount: 999,
  currency: 'USD',
  paid: true,
  metadata: { userId: 'user-1' },
};

describe('POST /api/webhooks/polar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([]);
    mockCreate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});
  });

  it('creates Payment and activates premium for valid paid order.created webhook (AC #1)', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'order.created',
      payload: validOrderPayload,
      signature: 'v1,valid-sig',
    });

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledOnce();
    // Verify Payment creation with correct data
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        polarCheckoutId: 'co_abc123',
        amount: 9.99,
        currency: 'USD',
        status: 'COMPLETED',
      },
    });
    // Verify User premium upgrade with customerId
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        premiumStatus: 'PREMIUM',
        polarCustomerId: 'cust_xyz',
      },
    });
  });

  it('returns 401 for invalid webhook signature (AC #2)', async () => {
    mockVerifyWebhook.mockRejectedValue(
      new WebhookVerificationError('Invalid signature'),
    );

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 200 without duplicates for already-processed payment (AC #3)', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'order.created',
      payload: validOrderPayload,
      signature: 'v1,valid-sig',
    });
    mockFindUnique.mockResolvedValue({ id: 'existing-payment' });

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(200);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { polarCheckoutId: 'co_abc123' },
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates PENDING payment without premium upgrade for unpaid order (AC #4)', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'order.created',
      payload: { ...validOrderPayload, paid: false },
      signature: 'v1,valid-sig',
    });

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'PENDING',
        userId: 'user-1',
        polarCheckoutId: 'co_abc123',
        amount: 9.99,
        currency: 'USD',
      }),
    });
  });

  it('returns 200 without processing for non-order events (AC #5)', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'checkout.updated',
      payload: {},
      signature: 'v1,valid-sig',
    });

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(200);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when userId is missing in metadata', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'order.created',
      payload: { ...validOrderPayload, metadata: {} },
      signature: 'v1,valid-sig',
    });

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain('userId');
  });

  it('returns 500 when database operation fails', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'order.created',
      payload: validOrderPayload,
      signature: 'v1,valid-sig',
    });
    mockTransaction.mockRejectedValue(new Error('DB connection failed'));

    const response = await POST(makeRequest('{}'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
