'use client';

import { Snowflake } from 'lucide-react';
import { MAX_STREAK_FREEZES } from '@/lib/config/constants';

export interface FreezeCountBadgeProps {
  count: number;
  max?: number;
}

export function FreezeCountBadge({ count, max = MAX_STREAK_FREEZES }: FreezeCountBadgeProps) {
  const hasFreeze = count > 0;

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        hasFreeze ? 'text-blue-500' : 'text-muted-foreground'
      }`}
      aria-label={`${count} streak freeze${count !== 1 ? 's' : ''} available`}
    >
      <Snowflake className="h-3.5 w-3.5" />
      <span>
        {count}/{max}
      </span>
    </div>
  );
}
