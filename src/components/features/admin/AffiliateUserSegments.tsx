'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { UserSegmentMetrics } from '@/actions/admin/getAffiliateAnalytics';

interface AffiliateUserSegmentsProps {
  data: UserSegmentMetrics[];
}

const SEGMENT_LABELS: Record<string, string> = {
  FREE: 'Free Users',
  PREMIUM: 'Premium Users',
  LIFETIME: 'Lifetime Users',
};

export function AffiliateUserSegments({ data }: AffiliateUserSegmentsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">User Segments</h3>
          <p className="text-sm text-muted-foreground">No segment data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">User Segments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Segment</th>
                <th className="pb-2 text-right font-medium">Users</th>
                <th className="pb-2 text-right font-medium">Clicks</th>
                <th className="pb-2 text-right font-medium">Conv.</th>
                <th className="pb-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.segment} className="border-b last:border-0">
                  <td className="py-2 font-medium">
                    {SEGMENT_LABELS[row.segment] ?? row.segment}
                  </td>
                  <td className="py-2 text-right">{row.uniqueUsers.toLocaleString()}</td>
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
