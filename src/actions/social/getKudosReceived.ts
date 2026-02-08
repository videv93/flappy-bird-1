'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const schema = z.object({
  limit: z.number().int().positive().max(50).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type GetKudosReceivedInput = z.infer<typeof schema>;

export type KudosWithDetails = {
  id: string;
  createdAt: Date;
  giver: { id: string; name: string | null; image: string | null };
  session: {
    id: string;
    book: { id: string; title: string; coverUrl: string | null };
  };
};

export type GetKudosReceivedData = {
  kudos: KudosWithDetails[];
  total: number;
  hasMore: boolean;
};

export async function getKudosReceived(
  input?: GetKudosReceivedInput
): Promise<ActionResult<GetKudosReceivedData>> {
  try {
    const { limit, offset } = schema.parse(input || {});

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const [kudos, total] = await Promise.all([
      prisma.kudos.findMany({
        where: { receiverId: session.user.id },
        include: {
          giver: { select: { id: true, name: true, image: true } },
          session: {
            select: {
              id: true,
              book: { select: { id: true, title: true, coverUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.kudos.count({ where: { receiverId: session.user.id } }),
    ]);

    return {
      success: true,
      data: {
        kudos,
        total,
        hasMore: offset + kudos.length < total,
      },
    };
  } catch (error) {
    console.error('getKudosReceived error:', error);
    return { success: false, error: 'Failed to load kudos' };
  }
}
