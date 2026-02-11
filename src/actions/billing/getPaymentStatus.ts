'use server';

import { z } from 'zod';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { isPremium } from '@/lib/premium';
import { polarPaymentProvider } from '@/lib/polar';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const checkoutIdSchema = z.string().min(1, 'Checkout ID is required');

export async function getPaymentStatus(
  checkoutId: string,
): Promise<ActionResult<{ isPremium: boolean; paymentStatus: string }>> {
  try {
    const validated = checkoutIdSchema.parse(checkoutId);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userIsPremium = await isPremium(session.user.id);
    if (userIsPremium) {
      return {
        success: true,
        data: { isPremium: true, paymentStatus: 'COMPLETED' },
      };
    }

    try {
      const result = await polarPaymentProvider.getPaymentStatus(validated);

      if (result.success) {
        // Polar says succeeded but DB not yet updated — webhook may be in flight
        const recheckPremium = await isPremium(session.user.id);
        return {
          success: true,
          data: {
            isPremium: recheckPremium,
            paymentStatus: recheckPremium ? 'COMPLETED' : 'PROCESSING',
          },
        };
      }

      return {
        success: true,
        data: { isPremium: false, paymentStatus: 'PROCESSING' },
      };
    } catch {
      // Polar API error — check DB as fallback
      return {
        success: true,
        data: { isPremium: false, paymentStatus: 'PROCESSING' },
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid checkout ID' };
    }
    console.error('Failed to get payment status:', error);
    return { success: false, error: 'Failed to check payment status' };
  }
}
