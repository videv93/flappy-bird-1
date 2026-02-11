import { Polar } from '@polar-sh/sdk';
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import type {
  PaymentProvider,
  CheckoutSession,
  WebhookEvent,
  PaymentResult,
} from '@/lib/billing/types';

export { WebhookVerificationError };

function getPolarServer(): 'sandbox' | 'production' {
  const server = process.env.POLAR_SERVER;
  if (server === 'sandbox') return 'sandbox';
  return 'production';
}

/**
 * Configured Polar SDK client instance.
 * Uses POLAR_ACCESS_TOKEN for authentication.
 * Fails fast if the access token is not configured.
 */
if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error(
    'POLAR_ACCESS_TOKEN environment variable is required. ' +
      'Get your token from https://polar.sh/settings'
  );
}

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: getPolarServer(),
});

/**
 * Polar implementation of the PaymentProvider interface (NFR3).
 * Abstracts Polar SDK behind a vendor-agnostic interface.
 */
export class PolarPaymentProvider implements PaymentProvider {
  private client: Polar;

  constructor(client: Polar) {
    this.client = client;
  }

  async createCheckout(
    userId: string,
    productId: string,
    options?: { customerEmail?: string },
  ): Promise<CheckoutSession> {
    const checkout = await this.client.checkouts.create({
      products: [productId],
      metadata: { userId },
      successUrl: `${process.env.BETTER_AUTH_URL}/upgrade/success?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${process.env.BETTER_AUTH_URL}/upgrade?cancelled=true`,
      ...(options?.customerEmail && { customerEmail: options.customerEmail }),
    });

    return {
      id: checkout.id,
      url: checkout.url,
      userId,
      amount: checkout.amount,
      currency: checkout.currency,
    };
  }

  async verifyWebhook(
    body: string,
    headers: Record<string, string>,
  ): Promise<WebhookEvent> {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('POLAR_WEBHOOK_SECRET environment variable is required');
    }

    const event = validateEvent(body, headers, secret);

    return {
      type: event.type,
      payload: event.data as unknown as Record<string, unknown>,
      signature: headers['webhook-signature'] ?? '',
    };
  }

  async getPaymentStatus(checkoutId: string): Promise<PaymentResult> {
    const checkout = await this.client.checkouts.get({ id: checkoutId });

    return {
      success: checkout.status === 'succeeded',
      checkoutId: checkout.id,
      customerId: checkout.customerId ?? undefined,
      amount: checkout.amount,
      currency: checkout.currency,
    };
  }
}

export const polarPaymentProvider = new PolarPaymentProvider(polar);
