'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export interface TrendDataPoint {
  date: string; // ISO date string YYYY-MM-DD
  value: number;
}

export interface MetricTrend {
  dataPoints: TrendDataPoint[];
  percentageChange: number;
  isAnomaly: boolean;
}

export interface MetricsTrends {
  newUsers: MetricTrend;
  activeSessions: MetricTrend;
  kudosGiven: MetricTrend;
  newBooks: MetricTrend;
}

interface RawDateCount {
  date: Date;
  count: bigint;
}

function fillMissingDays(raw: RawDateCount[], startDate: Date, days: number): TrendDataPoint[] {
  const dateMap = new Map<string, number>();
  for (const row of raw) {
    const key = new Date(row.date).toISOString().split('T')[0];
    dateMap.set(key, Number(row.count));
  }

  const result: TrendDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().split('T')[0];
    result.push({ date: key, value: dateMap.get(key) ?? 0 });
  }
  return result;
}

function calculatePercentageChange(current: TrendDataPoint[], previous: TrendDataPoint[]): number {
  const currentTotal = current.reduce((sum, p) => sum + p.value, 0);
  const previousTotal = previous.reduce((sum, p) => sum + p.value, 0);
  if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10;
}

function detectAnomaly(dataPoints: TrendDataPoint[]): boolean {
  if (dataPoints.length < 7) return false;
  const values = dataPoints.map((p) => p.value);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return false;
  const latest = values[values.length - 1];
  return Math.abs(latest - mean) > 2 * stdDev;
}

export async function getMetricsTrends(): Promise<ActionResult<MetricsTrends>> {
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

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);
    sixtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const [
      rawNewUsersCurrent,
      rawNewUsersPrevious,
      rawSessionsCurrent,
      rawSessionsPrevious,
      rawKudosCurrent,
      rawKudosPrevious,
      rawBooksCurrent,
      rawBooksPrevious,
    ] = await Promise.all([
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', started_at) as date, COUNT(*) as count
        FROM reading_sessions WHERE started_at >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', started_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', started_at) as date, COUNT(*) as count
        FROM reading_sessions WHERE started_at >= ${sixtyDaysAgo} AND started_at < ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', started_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM kudos WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM kudos WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM books WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM books WHERE created_at >= ${sixtyDaysAgo} AND created_at < ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
    ]);

    const newUsersCurrent = fillMissingDays(rawNewUsersCurrent, thirtyDaysAgo, 30);
    const newUsersPrevious = fillMissingDays(rawNewUsersPrevious, sixtyDaysAgo, 30);
    const sessionsCurrent = fillMissingDays(rawSessionsCurrent, thirtyDaysAgo, 30);
    const sessionsPrevious = fillMissingDays(rawSessionsPrevious, sixtyDaysAgo, 30);
    const kudosCurrent = fillMissingDays(rawKudosCurrent, thirtyDaysAgo, 30);
    const kudosPrevious = fillMissingDays(rawKudosPrevious, sixtyDaysAgo, 30);
    const booksCurrent = fillMissingDays(rawBooksCurrent, thirtyDaysAgo, 30);
    const booksPrevious = fillMissingDays(rawBooksPrevious, sixtyDaysAgo, 30);

    return {
      success: true,
      data: {
        newUsers: {
          dataPoints: newUsersCurrent,
          percentageChange: calculatePercentageChange(newUsersCurrent, newUsersPrevious),
          isAnomaly: detectAnomaly(newUsersCurrent),
        },
        activeSessions: {
          dataPoints: sessionsCurrent,
          percentageChange: calculatePercentageChange(sessionsCurrent, sessionsPrevious),
          isAnomaly: detectAnomaly(sessionsCurrent),
        },
        kudosGiven: {
          dataPoints: kudosCurrent,
          percentageChange: calculatePercentageChange(kudosCurrent, kudosPrevious),
          isAnomaly: detectAnomaly(kudosCurrent),
        },
        newBooks: {
          dataPoints: booksCurrent,
          percentageChange: calculatePercentageChange(booksCurrent, booksPrevious),
          isAnomaly: detectAnomaly(booksCurrent),
        },
      },
    };
  } catch (error) {
    console.error('getMetricsTrends error:', error);
    return { success: false, error: 'Failed to fetch metrics trends' };
  }
}

// Exported for testing
export { fillMissingDays, calculatePercentageChange, detectAnomaly };
