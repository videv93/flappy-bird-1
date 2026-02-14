'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { PlacementMetrics } from '@/actions/admin/getAffiliateAnalytics';

interface AffiliatePlacementBreakdownProps {
  data: PlacementMetrics[];
}

const SOURCE_LABELS: Record<string, string> = {
  'detail-page': 'Book Detail Page',
  recommendation: 'Recommendations',
  'buddy-read': 'Buddy Read',
  direct: 'Direct',
};

export function AffiliatePlacementBreakdown({ data }: AffiliatePlacementBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">By Placement</h3>
          <p className="text-sm text-muted-foreground">No placement data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">By Placement</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 text-right font-medium">Clicks</th>
                <th className="pb-2 text-right font-medium">Conversions</th>
                <th className="pb-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.source} className="border-b last:border-0">
                  <td className="py-2 font-medium">{SOURCE_LABELS[row.source] ?? row.source}</td>
                  <td className="py-2 text-right">{row.clicks.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.conversions.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
