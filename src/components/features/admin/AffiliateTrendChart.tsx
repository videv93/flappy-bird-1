'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { TrendDataPoint } from '@/actions/admin/getMetricsTrends';

interface AffiliateTrendChartProps {
  clicks: TrendDataPoint[];
  conversions: TrendDataPoint[];
}

function LargeSparkline({
  data,
  color,
  label,
}: {
  data: number[];
  color: string;
  label: string;
}) {
  const width = 400;
  const height = 80;
  const padding = 4;

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} trend chart`}
      >
        <polyline fill="none" stroke={color} strokeWidth={2} points={points} />
      </svg>
    </div>
  );
}

export function AffiliateTrendChart({ clicks, conversions }: AffiliateTrendChartProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Trends (Daily)</h3>
        <div className="space-y-4">
          <LargeSparkline
            data={clicks.map((p) => p.value)}
            color="#16a34a"
            label="Clicks"
          />
          <LargeSparkline
            data={conversions.map((p) => p.value)}
            color="#2563eb"
            label="Conversions"
          />
        </div>
      </CardContent>
    </Card>
  );
}
