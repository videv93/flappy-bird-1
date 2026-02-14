'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ProviderMetrics } from '@/actions/admin/getAffiliateAnalytics';

interface AffiliateProviderComparisonProps {
  data: ProviderMetrics[];
}

const PROVIDER_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  bookshop: 'Bookshop.org',
};

export function AffiliateProviderComparison({ data }: AffiliateProviderComparisonProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Provider Comparison</h3>
          <p className="text-sm text-muted-foreground">No provider data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Provider Comparison</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((provider) => (
            <div
              key={provider.provider}
              className="rounded-lg border border-border p-3"
            >
              <p className="mb-2 font-semibold">
                {PROVIDER_LABELS[provider.provider] ?? provider.provider}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clicks</span>
                  <span className="font-medium">{provider.clicks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversions</span>
                  <span className="font-medium">{provider.conversions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium">{provider.conversionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">${provider.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
