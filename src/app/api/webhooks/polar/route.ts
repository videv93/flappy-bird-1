import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import {
  polarPaymentProvider,
  WebhookVerificationError,
} from '@/lib/polar';

export async function POST(request: Request) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  // Extract headers as plain object for validateEvent
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Verify webhook signature
  let event;
  try {
    event = await polarPaymentProvider.verifyWebhook(body, headers);
  } catch (error) {
    if (
      error instanceof WebhookVerificationError ||
      (error instanceof Error && error.name === 'WebhookVerificationError')
    ) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } },
        { status: 401 },
      );
    }
    throw error;
  }

  // Only process order.created events
  if (event.type !== 'order.created') {
    return NextResponse.json({ received: true });
  }

  const data = event.payload as {
    checkoutId: string | null;
    customerId: string;
    totalAmount: number;
    currency: string;
    paid: boolean;
    metadata: Record<string, unknown>;
  };

  const userId = data.metadata?.userId as string | undefined;
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing userId in metadata' } },
      { status: 400 },
    );
  }

  const polarCheckoutId = data.checkoutId;
  if (!polarCheckoutId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Missing checkoutId' } },
      { status: 400 },
    );
  }

  // Idempotency check
  const existingPayment = await prisma.payment.findUnique({
    where: { polarCheckoutId },
  });
  if (existingPayment) {
    return NextResponse.json({ received: true });
  }

  // Determine payment status and whether to activate premium
  const isPaid = data.paid === true;
  const paymentStatus = isPaid ? 'COMPLETED' : 'PENDING';
  const amountInDollars = data.totalAmount / 100;

  try {
    if (isPaid) {
      // Atomic transaction: create payment + upgrade user
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            userId,
            polarCheckoutId,
            amount: amountInDollars,
            currency: data.currency,
            status: paymentStatus,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            premiumStatus: 'PREMIUM',
            polarCustomerId: data.customerId,
          },
        }),
      ]);
    } else {
      // Just create pending payment, no premium upgrade
      await prisma.payment.create({
        data: {
          userId,
          polarCheckoutId,
          amount: amountInDollars,
          currency: data.currency,
          status: paymentStatus,
        },
      });
    }
  } catch (error) {
    console.error('Webhook payment processing failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Payment processing failed' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
