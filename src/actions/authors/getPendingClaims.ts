'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export interface PendingClaimData {
  id: string;
  verificationMethod: string;
  verificationUrl: string | null;
  verificationText: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
}

export async function getPendingClaims(): Promise<
  ActionResult<PendingClaimData[]>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!isAdmin(session.user.id)) {
      return { success: false, error: 'Forbidden' };
    }

    const claims = await prisma.authorClaim.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverUrl: true,
          },
        },
      },
    });

    return { success: true, data: claims };
  } catch (error) {
    console.error('getPendingClaims error:', error);
    return { success: false, error: 'Failed to fetch pending claims' };
  }
}
