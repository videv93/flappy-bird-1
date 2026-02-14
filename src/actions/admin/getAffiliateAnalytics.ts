'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';
import type { TrendDataPoint } from './getMetricsTrends';
import { fillMissingDays, calculatePercentageChange } from './metricsTrendsUtils';

export interface PlacementMetrics {
  source: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface ProviderMetrics {
  provider: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface UserSegmentMetrics {
  segment: string;
  clicks: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
}

export interface RegionalMetrics {
  countryCode: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export interface AffiliateTrends {
  clicks: TrendDataPoint[];
  conversions: TrendDataPoint[];
  clicksPercentageChange: number;
  conversionsPercentageChange: number;
}

export interface AffiliateAnalyticsData {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  overallConversionRate: number;
  byPlacement: PlacementMetrics[];
  byProvider: ProviderMetrics[];
  byUserSegment: UserSegmentMetrics[];
  byRegion: RegionalMetrics[];
  trends: AffiliateTrends;
}

interface RawDateCount {
  date: Date;
  count: bigint;
}

export async function getAffiliateAnalytics(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<AffiliateAnalyticsData>> {
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
    const end = endDate ? new Date(endDate) : now;
    const thirtyDaysAgo = new Date(end);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate) : thirtyDaysAgo;

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Previous period for percentage change
    const previousStart = new Date(start);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);

    const dateFilter = { gte: start, lte: end };

    const [
      totalClicks,
      totalConversions,
      revenueResult,
      placementRaw,
      providerClicksRaw,
      providerRevenueRaw,
      segmentRaw,
      regionalRaw,
      rawClicksCurrent,
      rawClicksPrevious,
      rawConversionsCurrent,
      rawConversionsPrevious,
    ] = await Promise.all([
      // Total clicks
      prisma.affiliateClick.count({
        where: { createdAt: dateFilter },
      }),
      // Total conversions
      prisma.affiliateClick.count({
        where: { createdAt: dateFilter, converted: true },
      }),
      // Total revenue (all-time — AffiliateLink.revenue is a cumulative total,
      // not per-period. Date filtering is not applicable here.)
      prisma.affiliateLink.aggregate({
        _sum: { revenue: true },
      }),
      // Placement breakdown
      prisma.affiliateClick.groupBy({
        by: ['source'],
        where: { createdAt: dateFilter },
        _count: { id: true },
      }),
      // Provider clicks breakdown
      prisma.affiliateClick.groupBy({
        by: ['provider'],
        where: { createdAt: dateFilter },
        _count: { id: true },
      }),
      // Provider revenue (all-time — same as totalRevenue, cumulative on AffiliateLink)
      prisma.affiliateLink.groupBy({
        by: ['provider'],
        _sum: { revenue: true, conversions: true },
      }),
      // User segment (free vs premium)
      // NOTE: $queryRaw used here because Prisma's typed API does not support
      // groupBy with JOIN across models. Parameters use tagged template literals
      // which are auto-parameterized by Prisma, preventing SQL injection.
      prisma.$queryRaw<
        { premium_status: string; click_count: bigint; unique_users: bigint; conversion_count: bigint }[]
      >`
        SELECT u.premium_status,
               COUNT(ac.id) as click_count,
               COUNT(DISTINCT ac.user_id) as unique_users,
               COUNT(CASE WHEN ac.converted THEN 1 END) as conversion_count
        FROM affiliate_clicks ac
        JOIN users u ON ac.user_id = u.id
        WHERE ac.created_at >= ${start} AND ac.created_at <= ${end}
        GROUP BY u.premium_status
      `,
      // Regional breakdown (same $queryRaw justification as user segment above)
      prisma.$queryRaw<
        { country_code: string; click_count: bigint; conversion_count: bigint }[]
      >`
        SELECT COALESCE(country_code, 'unknown') as country_code,
               COUNT(id) as click_count,
               COUNT(CASE WHEN converted THEN 1 END) as conversion_count
        FROM affiliate_clicks
        WHERE created_at >= ${start} AND created_at <= ${end}
          AND country_code IS NOT NULL
        GROUP BY country_code
        ORDER BY click_count DESC
        LIMIT 20
      `,
      // Trend: daily clicks current period
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM affiliate_clicks
        WHERE created_at >= ${start} AND created_at <= ${end}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      // Trend: daily clicks previous period
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM affiliate_clicks
        WHERE created_at >= ${previousStart} AND created_at < ${start}
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      // Trend: daily conversions current period
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM affiliate_clicks
        WHERE created_at >= ${start} AND created_at <= ${end} AND converted = true
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
      // Trend: daily conversions previous period
      prisma.$queryRaw<RawDateCount[]>`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
        FROM affiliate_clicks
        WHERE created_at >= ${previousStart} AND created_at < ${start} AND converted = true
        GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC
      `,
    ]);

    // Get conversion counts per placement
    const placementConversions = await prisma.affiliateClick.groupBy({
      by: ['source'],
      where: { createdAt: dateFilter, converted: true },
      _count: { id: true },
    });
    const placementConvMap = new Map(placementConversions.map((p) => [p.source, p._count.id]));

    // Get conversion counts per provider
    const providerConversions = await prisma.affiliateClick.groupBy({
      by: ['provider'],
      where: { createdAt: dateFilter, converted: true },
      _count: { id: true },
    });
    const providerConvMap = new Map(providerConversions.map((p) => [p.provider, p._count.id]));

    const totalRevenue = Number(revenueResult._sum.revenue ?? 0);

    // Build provider revenue map
    const providerRevMap = new Map(
      providerRevenueRaw.map((p) => [p.provider, Number(p._sum.revenue ?? 0)])
    );

    const byPlacement: PlacementMetrics[] = placementRaw.map((p) => {
      const clicks = p._count.id;
      const conversions = placementConvMap.get(p.source) ?? 0;
      return {
        source: p.source ?? 'direct',
        clicks,
        conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
        revenue: 0, // Revenue tracked at link level, not per-click placement
      };
    });

    const byProvider: ProviderMetrics[] = providerClicksRaw.map((p) => {
      const clicks = p._count.id;
      const conversions = providerConvMap.get(p.provider) ?? 0;
      return {
        provider: p.provider,
        clicks,
        conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
        revenue: providerRevMap.get(p.provider) ?? 0,
      };
    });

    const byUserSegment: UserSegmentMetrics[] = segmentRaw.map((s) => {
      const clicks = Number(s.click_count);
      const conversions = Number(s.conversion_count);
      return {
        segment: s.premium_status,
        clicks,
        uniqueUsers: Number(s.unique_users),
        conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
      };
    });

    const byRegion: RegionalMetrics[] = regionalRaw.map((r) => {
      const clicks = Number(r.click_count);
      const conversions = Number(r.conversion_count);
      return {
        countryCode: r.country_code,
        clicks,
        conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
      };
    });

    const clicksCurrent = fillMissingDays(rawClicksCurrent, start, days);
    const clicksPrevious = fillMissingDays(rawClicksPrevious, previousStart, days);
    const conversionsCurrent = fillMissingDays(rawConversionsCurrent, start, days);
    const conversionsPrevious = fillMissingDays(rawConversionsPrevious, previousStart, days);

    return {
      success: true,
      data: {
        totalClicks,
        totalConversions,
        totalRevenue,
        overallConversionRate:
          totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0,
        byPlacement,
        byProvider,
        byUserSegment,
        byRegion,
        trends: {
          clicks: clicksCurrent,
          conversions: conversionsCurrent,
          clicksPercentageChange: calculatePercentageChange(clicksCurrent, clicksPrevious),
          conversionsPercentageChange: calculatePercentageChange(
            conversionsCurrent,
            conversionsPrevious
          ),
        },
      },
    };
  } catch (error) {
    console.error('getAffiliateAnalytics error:', error);
    return { success: false, error: 'Failed to fetch affiliate analytics' };
  }
}
