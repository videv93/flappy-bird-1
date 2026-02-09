'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export interface AdminActionEntry {
  id: string;
  actionType: string;
  targetId: string;
  targetType: string;
  details: unknown;
  createdAt: Date;
  admin: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface DashboardStats {
  pendingClaimsCount: number;
  moderationCount: number;
  userWarningCount: number;
  recentActions: AdminActionEntry[];
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!adminUser || !isAdmin(adminUser)) {
      return { success: false, error: 'Forbidden' };
    }

    const [pendingClaimsCount, moderationCount, recentActions] = await Promise.all([
      prisma.authorClaim.count({ where: { status: 'PENDING' } }),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.adminAction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        pendingClaimsCount,
        moderationCount,
        userWarningCount: 0,
        recentActions,
      },
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}
