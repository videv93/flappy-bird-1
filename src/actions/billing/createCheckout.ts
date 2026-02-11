'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { isPremium } from '@/lib/premium';
import { polarPaymentProvider } from '@/lib/polar';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createCheckout(): Promise<
  ActionResult<{ checkoutUrl: string }>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userIsPremium = await isPremium(session.user.id);
    if (userIsPremium) {
      return { success: false, error: 'Already premium' };
    }

    const productId = process.env.POLAR_PRODUCT_PREMIUM_ID;
    if (!productId) {
      console.error('POLAR_PRODUCT_PREMIUM_ID environment variable is not set');
      return { success: false, error: 'Payment configuration error' };
    }

    const checkoutSession = await polarPaymentProvider.createCheckout(
      session.user.id,
      productId,
      { customerEmail: session.user.email },
    );

    return { success: true, data: { checkoutUrl: checkoutSession.url } };
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return { success: false, error: 'Failed to create checkout session' };
  }
}
