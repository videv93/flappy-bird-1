'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StreakHeatmap } from './StreakHeatmap';
import { DayDetailPanel } from './DayDetailPanel';
import { getStreakHistory } from '@/actions/streaks/getStreakHistory';
import type { StreakHistoryData } from '@/actions/streaks/getStreakHistory';

export interface StreakHistoryViewProps {
  initialCurrentStreak?: number;
  initialLongestStreak?: number;
}

export function StreakHistoryView({
  initialCurrentStreak,
  initialLongestStreak,
}: StreakHistoryViewProps) {
  const [data, setData] = useState<StreakHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [days, setDays] = useState(90);
  const [fetchKey, setFetchKey] = useState(0);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getStreakHistory({ timezone, days }).then((result) => {
      if (!cancelled) {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [timezone, days, fetchKey]);

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDay((prev) => (prev === date ? null : date));
  }, []);

  const handleLoadMore = useCallback(() => {
    setDays((prev) => Math.min(prev + 90, 365));
  }, []);

  const handleRetry = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-3" data-testid="streak-history-loading">
        {(initialCurrentStreak !== undefined || initialLongestStreak !== undefined) && (
          <div className="flex items-center justify-between text-sm" data-testid="streak-stats-preview">
            <span>Current streak: <strong>{initialCurrentStreak ?? 0}</strong> days</span>
            <span className="text-muted-foreground">Best: <strong>{initialLongestStreak ?? 0}</strong> days</span>
          </div>
        )}
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-2 text-center py-4" data-testid="streak-history-error">
        <p className="text-sm text-muted-foreground">Unable to load streak history.</p>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs">
          Try again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="streak-history-empty">
        Start reading to build your streak!
      </p>
    );
  }

  return (
    <div data-testid="streak-history-view">
      <StreakHeatmap
        history={data.history}
        currentStreak={data.currentStreak}
        longestStreak={data.longestStreak}
        dailyGoalMinutes={data.dailyGoalMinutes}
        onDaySelect={handleDaySelect}
      />

      {selectedDay && (
        <DayDetailPanel
          date={selectedDay}
          timezone={timezone}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {days < 365 && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            className="text-xs text-muted-foreground"
            data-testid="load-more-button"
          >
            Load more history
          </Button>
        </div>
      )}
    </div>
  );
}
