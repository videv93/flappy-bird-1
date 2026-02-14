'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export interface VariantResult {
  variant: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export type SignificanceLevel =
  | 'Not significant'
  | 'Marginally significant (p < 0.1)'
  | 'Significant (p < 0.05)'
  | 'Highly significant (p < 0.01)';

export interface AbTestResults {
  variants: VariantResult[];
  chiSquared: number;
  significance: SignificanceLevel;
}

function calculateChiSquared(variants: VariantResult[]): number {
  if (variants.length < 2) return 0;

  const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
  if (totalClicks === 0) return 0;

  const overallRate = totalConversions / totalClicks;

  let chiSq = 0;
  for (const v of variants) {
    const expectedConversions = v.clicks * overallRate;
    const expectedNonConversions = v.clicks * (1 - overallRate);

    if (expectedConversions > 0) {
      chiSq += (v.conversions - expectedConversions) ** 2 / expectedConversions;
    }
    const nonConversions = v.clicks - v.conversions;
    if (expectedNonConversions > 0) {
      chiSq += (nonConversions - expectedNonConversions) ** 2 / expectedNonConversions;
    }
  }

  return Math.round(chiSq * 1000) / 1000;
}

// Thresholds are for 1 degree of freedom (2 variants only).
// If 3+ variants are used, df increases and these thresholds become conservative
// (will underreport significance). This is acceptable for the current lightweight
// A/B testing use case which only compares 2 variants at a time.
function getSignificanceLevel(chiSquared: number): SignificanceLevel {
  if (chiSquared >= 6.635) return 'Highly significant (p < 0.01)';
  if (chiSquared >= 3.841) return 'Significant (p < 0.05)';
  if (chiSquared >= 2.706) return 'Marginally significant (p < 0.1)';
  return 'Not significant';
}

export async function getAbTestResults(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<AbTestResults>> {
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

    const dateFilter = { gte: start, lte: end };

    const [variantClicks, variantConversions] = await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ['variant'],
        where: {
          createdAt: dateFilter,
          variant: { not: null },
        },
        _count: { id: true },
      }),
      prisma.affiliateClick.groupBy({
        by: ['variant'],
        where: {
          createdAt: dateFilter,
          variant: { not: null },
          converted: true,
        },
        _count: { id: true },
      }),
    ]);

    const conversionMap = new Map(
      variantConversions.map((v) => [v.variant, v._count.id])
    );

    const variants: VariantResult[] = variantClicks.map((v) => {
      const clicks = v._count.id;
      const conversions = conversionMap.get(v.variant) ?? 0;
      return {
        variant: v.variant ?? 'unknown',
        clicks,
        conversions,
        conversionRate: clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0,
      };
    });

    const chiSquared = calculateChiSquared(variants);
    const significance = getSignificanceLevel(chiSquared);

    return {
      success: true,
      data: { variants, chiSquared, significance },
    };
  } catch (error) {
    console.error('getAbTestResults error:', error);
    return { success: false, error: 'Failed to fetch A/B test results' };
  }
}

// Exported for testing
export { calculateChiSquared, getSignificanceLevel };
