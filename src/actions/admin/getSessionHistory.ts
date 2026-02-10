'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { logAdminAction } from '@/actions/admin/logAdminAction';
import type { ActionResult } from '@/actions/books/types';

export interface SessionRecord {
  id: string;
  maskedToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: { browser: string; os: string };
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export async function parseUserAgent(ua: string | null): Promise<{ browser: string; os: string }> {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };

  let browser = 'Unknown';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser, os };
}

export async function getSessionHistory(
  userId: string,
  limit: number = 10
): Promise<ActionResult<SessionRecord[]>> {
  try {
    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'User ID is required' };
    }

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

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        token: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const now = new Date();
    const records: SessionRecord[] = await Promise.all(
      sessions.map(async (s) => ({
        id: s.id,
        maskedToken: s.token.substring(0, 8) + '...',
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        deviceInfo: await parseUserAgent(s.userAgent),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isActive: s.expiresAt > now,
      }))
    );

    await logAdminAction({
      adminId: session.user.id,
      actionType: 'VIEW_SESSION_HISTORY',
      targetId: userId,
      targetType: 'Session',
      details: { sessionCount: records.length },
    });

    return { success: true, data: records };
  } catch (error) {
    console.error('getSessionHistory error:', error);
    return { success: false, error: 'Failed to fetch session history' };
  }
}
