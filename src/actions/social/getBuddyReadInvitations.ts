'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

export interface BuddyReadInvitationData {
  id: string;
  status: string;
  createdAt: Date;
  inviter: {
    id: string;
    name: string | null;
    image: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    isbn10: string | null;
    isbn13: string | null;
  };
}

export async function getBuddyReadInvitations(): Promise<
  ActionResult<BuddyReadInvitationData[]>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const invitations = await prisma.buddyReadInvitation.findMany({
      where: {
        inviteeId: session.user.id,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        buddyRead: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverUrl: true,
                isbn10: true,
                isbn13: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data: BuddyReadInvitationData[] = invitations.map((inv) => ({
      id: inv.id,
      status: inv.status,
      createdAt: inv.createdAt,
      inviter: inv.inviter,
      book: inv.buddyRead.book,
    }));

    return { success: true, data };
  } catch {
    return { success: false, error: 'Failed to fetch buddy read invitations' };
  }
}
