'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/features/admin/DateRangeFilter';
import { ExportMetricsButton } from '@/components/features/admin/ExportMetricsButton';
import type { MetricsBreakdown } from '@/actions/admin/getMetricsBreakdown';

type Category = 'user' | 'engagement' | 'social' | 'content';

export function MetricsBreakdownView() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Category>('user');
  const [breakdown, setBreakdown] = useState<MetricsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';

  const fetchBreakdown = useCallback(async (category: Category, start: string, end: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category });
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);

      const { getMetricsBreakdown } = await import('@/actions/admin/getMetricsBreakdown');
      const result = await getMetricsBreakdown(category, start || undefined, end || undefined);
      if (result.success) {
        setBreakdown(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakdown(activeTab, startDate, endDate);
  }, [activeTab, startDate, endDate, fetchBreakdown]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-medium">Detailed Breakdown</h3>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter />
          <ExportMetricsButton />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Category)}>
        <TabsList>
          <TabsTrigger value="user" className="min-h-[44px]">
            Users
          </TabsTrigger>
          <TabsTrigger value="engagement" className="min-h-[44px]">
            Engagement
          </TabsTrigger>
          <TabsTrigger value="social" className="min-h-[44px]">
            Social
          </TabsTrigger>
          <TabsTrigger value="content" className="min-h-[44px]">
            Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-4">
              {loading && <p className="text-sm text-muted-foreground">Loading breakdown...</p>}
              {!loading && breakdown && breakdown.entries.length === 0 && (
                <p className="text-sm text-muted-foreground">No data for the selected period.</p>
              )}
              {!loading && breakdown && breakdown.entries.length > 0 && (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">{breakdown.total}</span>
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Date</th>
                          <th className="py-2 text-right font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.entries.map((entry) => (
                          <tr key={entry.date} className="border-b border-border/50">
                            <td className="py-1.5">{entry.date}</td>
                            <td className="py-1.5 text-right">{entry.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
