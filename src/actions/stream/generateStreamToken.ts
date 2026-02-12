'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { getStreamServerClient } from '@/lib/stream';
import type { ActionResult } from '@/types';

export async function generateStreamToken(): Promise<
  ActionResult<{ token: string }>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
    const token = getStreamServerClient().createToken(
      session.user.id,
      expirationTime,
    );

    return { success: true, data: { token } };
  } catch (error) {
    console.error('Failed to generate Stream token:', error);
    return { success: false, error: 'Failed to generate Stream token' };
  }
}
