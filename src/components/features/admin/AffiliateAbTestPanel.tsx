'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { AbTestResults } from '@/actions/admin/getAbTestResults';

interface AffiliateAbTestPanelProps {
  data: AbTestResults | null;
}

const SIGNIFICANCE_COLORS: Record<string, string> = {
  'Not significant': 'text-muted-foreground',
  'Marginally significant (p < 0.1)': 'text-yellow-600 dark:text-yellow-400',
  'Significant (p < 0.05)': 'text-green-600 dark:text-green-400',
  'Highly significant (p < 0.01)': 'text-green-700 dark:text-green-300 font-semibold',
};

export function AffiliateAbTestPanel({ data }: AffiliateAbTestPanelProps) {
  if (!data || data.variants.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">A/B Test Results</h3>
          <p className="text-sm text-muted-foreground">
            No active A/B tests. Add <code>variant</code> parameter to affiliate links to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">A/B Test Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Variant</th>
                <th className="pb-2 text-right font-medium">Clicks</th>
                <th className="pb-2 text-right font-medium">Conversions</th>
                <th className="pb-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.variants.map((v) => (
                <tr key={v.variant} className="border-b last:border-0">
                  <td className="py-2 font-medium">{v.variant}</td>
                  <td className="py-2 text-right">{v.clicks.toLocaleString()}</td>
                  <td className="py-2 text-right">{v.conversions.toLocaleString()}</td>
                  <td className="py-2 text-right">{v.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
          <span className="text-muted-foreground">
            χ² = {data.chiSquared}
          </span>
          <span className={SIGNIFICANCE_COLORS[data.significance] ?? 'text-muted-foreground'}>
            {data.significance}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
