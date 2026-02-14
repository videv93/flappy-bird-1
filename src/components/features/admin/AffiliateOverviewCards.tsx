'use client';

import { MousePointerClick, ArrowRightLeft, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SparklineChart } from '@/components/features/admin/SparklineChart';
import { TrendIndicator } from '@/components/features/admin/TrendIndicator';
import type { AffiliateTrends } from '@/actions/admin/getAffiliateAnalytics';

interface AffiliateOverviewCardsProps {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  overallConversionRate: number;
  trends: AffiliateTrends;
}

export function AffiliateOverviewCards({
  totalClicks,
  totalConversions,
  totalRevenue,
  overallConversionRate,
  trends,
}: AffiliateOverviewCardsProps) {
  const cards = [
    {
      label: 'Total Clicks',
      value: totalClicks.toLocaleString(),
      icon: MousePointerClick,
      sparkline: trends.clicks.map((p) => p.value),
      change: trends.clicksPercentageChange,
    },
    {
      label: 'Conversions',
      value: totalConversions.toLocaleString(),
      icon: ArrowRightLeft,
      sparkline: trends.conversions.map((p) => p.value),
      change: trends.conversionsPercentageChange,
    },
    {
      label: 'Revenue (All-Time)',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      label: 'Conversion Rate',
      value: `${overallConversionRate}%`,
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="transition-colors hover:bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
                  <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </div>
              {card.sparkline && card.change !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <SparklineChart
                    data={card.sparkline}
                    positive={card.change >= 0}
                    width={80}
                    height={24}
                  />
                  <TrendIndicator percentageChange={card.change} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
