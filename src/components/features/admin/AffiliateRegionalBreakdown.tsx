'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { RegionalMetrics } from '@/actions/admin/getAffiliateAnalytics';

interface AffiliateRegionalBreakdownProps {
  data: RegionalMetrics[];
}

export function AffiliateRegionalBreakdown({ data }: AffiliateRegionalBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Regional Performance</h3>
          <p className="text-sm text-muted-foreground">No regional data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Regional Performance (Top 20)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Country</th>
                <th className="pb-2 text-right font-medium">Clicks</th>
                <th className="pb-2 text-right font-medium">Conversions</th>
                <th className="pb-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.countryCode} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.countryCode}</td>
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
