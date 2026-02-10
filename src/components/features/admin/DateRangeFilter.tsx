'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface DateRangeFilterProps {
  className?: string;
}

export function DateRangeFilter({ className }: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        From
        <input
          type="date"
          value={startDate}
          onChange={(e) => updateParams('startDate', e.target.value)}
          className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Start date"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        To
        <input
          type="date"
          value={endDate}
          onChange={(e) => updateParams('endDate', e.target.value)}
          className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="End date"
        />
      </label>
    </div>
  );
}
