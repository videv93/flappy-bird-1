'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { logAdminAction } from '@/actions/admin/logAdminAction';
import { userSearchSchema } from '@/lib/validation/admin';
import type { ActionResult } from '@/actions/books/types';

export interface UserSearchResult {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  suspendedUntil: Date | null;
  warningCount: number;
  suspensionCount: number;
}

export interface SearchUsersResult {
  users: UserSearchResult[];
  total: number;
  query: string;
}

export async function searchUsers(
  input: unknown
): Promise<ActionResult<SearchUsersResult>> {
  try {
    const validated = userSearchSchema.parse(input);

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

    const where = {
      OR: [
        { email: { contains: validated.query, mode: 'insensitive' as const } },
        { name: { contains: validated.query, mode: 'insensitive' as const } },
        { id: validated.query },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          suspendedUntil: true,
          _count: { select: { warnings: true, suspensions: true } },
        },
        take: validated.limit,
        skip: validated.offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const results: UserSearchResult[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      suspendedUntil: u.suspendedUntil,
      warningCount: u._count.warnings,
      suspensionCount: u._count.suspensions,
    }));

    await logAdminAction({
      adminId: session.user.id,
      actionType: 'SEARCH_USERS',
      targetId: 'N/A',
      targetType: 'User',
      details: { query: validated.query, resultCount: results.length },
    });

    return {
      success: true,
      data: { users: results, total, query: validated.query },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('searchUsers error:', error);
    return { success: false, error: 'User search failed' };
  }
}
