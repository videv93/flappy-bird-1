'use client';

import { useState, useEffect } from 'react';
import { X, Snowflake, BookOpen, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getDayDetail } from '@/actions/streaks/getDayDetail';
import type { DayDetailData } from '@/actions/streaks/getDayDetail';

export interface DayDetailPanelProps {
  date: string;
  timezone: string;
  onClose: () => void;
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DayDetailPanel({ date, timezone, onClose }: DayDetailPanelProps) {
  const [detail, setDetail] = useState<DayDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getDayDetail({ date, timezone }).then((result) => {
      if (!cancelled) {
        if (result.success) {
          setDetail(result.data);
        }
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [date, timezone]);

  return (
    <Card className="mt-3" data-testid="day-detail-panel">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">{formatDisplayDate(date)}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close day details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <div className="space-y-2" data-testid="day-detail-skeleton">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-28 bg-muted animate-pulse rounded" />
            </div>
          ) : detail ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>{detail.minutesRead} min read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span title={detail.goalMinutes ? 'Your current daily reading goal' : undefined}>
                  {detail.goalMinutes ? `${detail.goalMinutes} min goal` : 'No goal set'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>
                  {detail.sessionCount} {detail.sessionCount === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {detail.goalMet ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full bg-green-500" aria-hidden="true" />
                    <span className="text-green-600 dark:text-green-400">Goal met</span>
                  </>
                ) : detail.freezeUsed ? (
                  <>
                    <Snowflake className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                    <span className="text-blue-600 dark:text-blue-400" data-testid="freeze-indicator">
                      Freeze used
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full bg-gray-300" aria-hidden="true" />
                    <span className="text-muted-foreground">Missed</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data for this day</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
