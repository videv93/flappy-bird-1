/**
 * Payment provider interface abstraction (NFR3).
 * Concrete implementations (e.g., Polar) will implement this interface
 * to mitigate vendor lock-in.
 */

export interface CheckoutSession {
  id: string;
  url: string;
  userId: string;
  amount: number;
  currency: string;
}

export interface WebhookEvent {
  type: string;
  payload: Record<string, unknown>;
  signature: string;
}

export interface PaymentResult {
  success: boolean;
  checkoutId: string;
  customerId?: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  /**
   * Create a checkout session for a user to complete payment.
   */
  createCheckout(userId: string, productId: string): Promise<CheckoutSession>;

  /**
   * Verify an incoming webhook signature and parse the event.
   */
  verifyWebhook(body: string, headers: Record<string, string>): Promise<WebhookEvent>;

  /**
   * Get the status/result of a payment by checkout ID.
   */
  getPaymentStatus(checkoutId: string): Promise<PaymentResult>;
}
