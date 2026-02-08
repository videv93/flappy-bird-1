'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/actions/books/types';

const getRoomMembersSchema = z.string().min(1);

export interface RoomMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: Date;
  isAuthor: boolean;
}

export async function getRoomMembers(bookId: string): Promise<ActionResult<RoomMember[]>> {
  try {
    const validated = getRoomMembersSchema.parse(bookId);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const presences = await prisma.roomPresence.findMany({
      where: {
        bookId: validated,
        leftAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    const members: RoomMember[] = presences.map((p) => ({
      id: p.user.id,
      name: p.user.name || 'Anonymous',
      avatarUrl: p.user.avatarUrl || p.user.image || null,
      joinedAt: p.joinedAt,
      isAuthor: p.isAuthor,
    }));

    return { success: true, data: members };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid book ID' };
    }
    return { success: false, error: 'Failed to get room members' };
  }
}
