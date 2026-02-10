'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SparklineChart } from '@/components/features/admin/SparklineChart';
import { TrendIndicator } from '@/components/features/admin/TrendIndicator';
import { AnomalyBadge } from '@/components/features/admin/AnomalyBadge';
import type { MetricTrend } from '@/actions/admin/getMetricsTrends';

export interface MetricRow {
  label: string;
  value: string | number;
  trend?: MetricTrend;
}

interface MetricsCategoryCardProps {
  title: string;
  icon: LucideIcon;
  metrics: MetricRow[];
  className?: string;
}

export function MetricsCategoryCard({
  title,
  icon: Icon,
  metrics,
  className,
}: MetricsCategoryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
            <Icon className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-lg font-bold">{metric.value}</p>
              </div>
              {metric.trend && (
                <div className="flex items-center gap-2">
                  <SparklineChart
                    data={metric.trend.dataPoints.map((p) => p.value)}
                    positive={metric.trend.percentageChange >= 0}
                  />
                  <TrendIndicator percentageChange={metric.trend.percentageChange} />
                  <AnomalyBadge isAnomaly={metric.trend.isAnomaly} />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
