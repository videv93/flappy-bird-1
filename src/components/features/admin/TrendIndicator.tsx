import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  percentageChange: number;
  className?: string;
}

export function TrendIndicator({ percentageChange, className }: TrendIndicatorProps) {
  const isPositive = percentageChange > 0;
  const isNegative = percentageChange < 0;
  const isNeutral = percentageChange === 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive
          ? 'text-green-600 dark:text-green-400'
          : isNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground'
      } ${className ?? ''}`}
    >
      {isPositive && <ArrowUp className="h-3 w-3" />}
      {isNegative && <ArrowDown className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      {isNeutral ? '0%' : `${Math.abs(percentageChange)}%`}
    </span>
  );
}
