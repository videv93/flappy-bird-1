import { Suspense } from 'react';
import { getAffiliateAnalytics } from '@/actions/admin/getAffiliateAnalytics';
import { getAbTestResults } from '@/actions/admin/getAbTestResults';
import { AffiliateOverviewCards } from '@/components/features/admin/AffiliateOverviewCards';
import { AffiliatePlacementBreakdown } from '@/components/features/admin/AffiliatePlacementBreakdown';
import { AffiliateProviderComparison } from '@/components/features/admin/AffiliateProviderComparison';
import { AffiliateUserSegments } from '@/components/features/admin/AffiliateUserSegments';
import { AffiliateTrendChart } from '@/components/features/admin/AffiliateTrendChart';
import { AffiliateRegionalBreakdown } from '@/components/features/admin/AffiliateRegionalBreakdown';
import { AffiliateAbTestPanel } from '@/components/features/admin/AffiliateAbTestPanel';
import { DateRangeFilter } from '@/components/features/admin/DateRangeFilter';
import { ExportAffiliateButton } from '@/components/features/admin/ExportAffiliateButton';

export const dynamic = 'force-dynamic';

interface AffiliatePageProps {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

export default async function AffiliatePage({ searchParams }: AffiliatePageProps) {
  const params = await searchParams;
  const startDate = params.startDate;
  const endDate = params.endDate;

  const [analyticsResult, abTestResult] = await Promise.all([
    getAffiliateAnalytics(startDate, endDate),
    getAbTestResults(startDate, endDate),
  ]);

  if (!analyticsResult.success) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <p className="text-destructive">{analyticsResult.error}</p>
      </div>
    );
  }

  const data = analyticsResult.data;
  const abData = abTestResult.success ? abTestResult.data : null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Affiliate Analytics</h2>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <DateRangeFilter />
          </Suspense>
          <ExportAffiliateButton />
        </div>
      </div>

      <div className="space-y-6">
        <AffiliateOverviewCards
          totalClicks={data.totalClicks}
          totalConversions={data.totalConversions}
          totalRevenue={data.totalRevenue}
          overallConversionRate={data.overallConversionRate}
          trends={data.trends}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AffiliatePlacementBreakdown data={data.byPlacement} />
          <AffiliateProviderComparison data={data.byProvider} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AffiliateUserSegments data={data.byUserSegment} />
          <AffiliateRegionalBreakdown data={data.byRegion} />
        </div>

        <AffiliateTrendChart
          clicks={data.trends.clicks}
          conversions={data.trends.conversions}
        />

        <AffiliateAbTestPanel data={abData} />
      </div>
    </div>
  );
}
