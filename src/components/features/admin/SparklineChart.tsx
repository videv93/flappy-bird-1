'use client';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

export function SparklineChart({
  data,
  width = 120,
  height = 32,
  positive = true,
  className,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = positive ? '#16a34a' : '#dc2626';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Trend sparkline chart"
    >
      <polyline fill="none" stroke={strokeColor} strokeWidth={1.5} points={points} />
    </svg>
  );
}
