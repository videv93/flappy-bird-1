import { describe, it, expect } from 'vitest';
import type {
  PaymentProvider,
  CheckoutSession,
  WebhookEvent,
  PaymentResult,
} from './types';

describe('billing types', () => {
  it('PaymentProvider interface can be implemented', () => {
    // Verify that a mock implementation satisfies the interface contract
    const mockProvider: PaymentProvider = {
      createCheckout: async (): Promise<CheckoutSession> => ({
        id: 'checkout-1',
        url: 'https://checkout.example.com/session-1',
        userId: 'user-1',
        amount: 999,
        currency: 'USD',
      }),
      verifyWebhook: async (): Promise<WebhookEvent> => ({
        type: 'checkout.completed',
        payload: { checkoutId: 'checkout-1' },
        signature: 'valid-sig',
      }),
      getPaymentStatus: async (): Promise<PaymentResult> => ({
        success: true,
        checkoutId: 'checkout-1',
        customerId: 'cust-1',
        amount: 999,
        currency: 'USD',
      }),
    };

    expect(mockProvider.createCheckout).toBeDefined();
    expect(mockProvider.verifyWebhook).toBeDefined();
    expect(mockProvider.getPaymentStatus).toBeDefined();
  });

  it('CheckoutSession has required fields', async () => {
    const session: CheckoutSession = {
      id: 'checkout-1',
      url: 'https://checkout.example.com',
      userId: 'user-1',
      amount: 999,
      currency: 'USD',
    };

    expect(session.id).toBe('checkout-1');
    expect(session.url).toBe('https://checkout.example.com');
    expect(session.userId).toBe('user-1');
    expect(session.amount).toBe(999);
    expect(session.currency).toBe('USD');
  });

  it('WebhookEvent has required fields', () => {
    const event: WebhookEvent = {
      type: 'checkout.completed',
      payload: { checkoutId: 'checkout-1', userId: 'user-1' },
      signature: 'sig-abc123',
    };

    expect(event.type).toBe('checkout.completed');
    expect(event.payload).toHaveProperty('checkoutId');
    expect(event.signature).toBe('sig-abc123');
  });

  it('PaymentResult has required and optional fields', () => {
    const resultWithCustomer: PaymentResult = {
      success: true,
      checkoutId: 'checkout-1',
      customerId: 'cust-1',
      amount: 999,
      currency: 'USD',
    };

    const resultWithoutCustomer: PaymentResult = {
      success: false,
      checkoutId: 'checkout-2',
      amount: 999,
      currency: 'USD',
    };

    expect(resultWithCustomer.customerId).toBe('cust-1');
    expect(resultWithoutCustomer.customerId).toBeUndefined();
  });

  it('PaymentProvider methods return correct types', async () => {
    const mockProvider: PaymentProvider = {
      createCheckout: async () => ({
        id: 'co-1',
        url: 'https://pay.example.com',
        userId: 'u-1',
        amount: 999,
        currency: 'USD',
      }),
      verifyWebhook: async () => ({
        type: 'checkout.completed',
        payload: {},
        signature: 'sig',
      }),
      getPaymentStatus: async () => ({
        success: true,
        checkoutId: 'co-1',
        amount: 999,
        currency: 'USD',
      }),
    };

    const checkout = await mockProvider.createCheckout('user-1', 'premium');
    expect(checkout).toHaveProperty('id');
    expect(checkout).toHaveProperty('url');

    const webhook = await mockProvider.verifyWebhook('body', { 'webhook-signature': 'sig' });
    expect(webhook).toHaveProperty('type');

    const status = await mockProvider.getPaymentStatus('co-1');
    expect(status).toHaveProperty('success');
  });
});
