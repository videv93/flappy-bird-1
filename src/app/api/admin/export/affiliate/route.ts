import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!adminUser || !isAdmin(adminUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const clicks = await prisma.affiliateClick.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        createdAt: true,
        provider: true,
        source: true,
        converted: true,
        countryCode: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100_000, // Cap to prevent OOM on high-traffic periods
    });

    const revenueByProvider = await prisma.affiliateLink.groupBy({
      by: ['provider'],
      _sum: { revenue: true },
    });
    const revenueMap = new Map(
      revenueByProvider.map((r) => [r.provider, Number(r._sum.revenue ?? 0)])
    );

    const rows: string[][] = [
      ['Date', 'Provider', 'Source', 'Clicks', 'Conversions', 'Country', 'Revenue (All-Time by Provider)'],
    ];

    // Aggregate by date + provider + source + country
    const aggregated = new Map<string, { clicks: number; conversions: number }>();
    for (const click of clicks) {
      const date = click.createdAt.toISOString().split('T')[0];
      const key = `${date}|${click.provider}|${click.source ?? 'direct'}|${click.countryCode ?? 'unknown'}`;
      const existing = aggregated.get(key) ?? { clicks: 0, conversions: 0 };
      existing.clicks++;
      if (click.converted) existing.conversions++;
      aggregated.set(key, existing);
    }

    // Track which providers have had revenue added to avoid duplicating
    const revenueAddedForProvider = new Set<string>();
    for (const [key, stats] of aggregated) {
      const [date, provider, source, country] = key.split('|');
      // Include all-time provider revenue on first row for each provider
      let revenue = '';
      if (!revenueAddedForProvider.has(provider)) {
        revenue = String(revenueMap.get(provider) ?? 0);
        revenueAddedForProvider.add(provider);
      }
      rows.push([date, provider, source, String(stats.clicks), String(stats.conversions), country, revenue]);
    }

    const csv = rows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="affiliate-analytics-${now.toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export affiliate analytics error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
