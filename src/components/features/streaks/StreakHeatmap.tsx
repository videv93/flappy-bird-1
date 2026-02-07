'use client';

import { useMemo, useCallback } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import type { StreakHistoryDay } from '@/actions/streaks/getStreakHistory';

export interface StreakHeatmapProps {
  history: StreakHistoryDay[];
  currentStreak: number;
  longestStreak: number;
  dailyGoalMinutes: number | null;
  onDaySelect?: (date: string) => void;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

type DayStatus = 'goalMet' | 'freezeUsed' | 'missed' | 'empty';

function getDayStatus(day: StreakHistoryDay | undefined): DayStatus {
  if (!day) return 'empty';
  if (day.goalMet) return 'goalMet';
  if (day.freezeUsed) return 'freezeUsed';
  return 'missed';
}

const STATUS_STYLES: Record<DayStatus, string> = {
  goalMet: 'bg-green-500 hover:bg-green-600',
  freezeUsed: 'bg-blue-500 hover:bg-blue-600',
  missed: 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400',
  empty: 'bg-gray-100 dark:bg-gray-800',
};

const STATUS_LABELS: Record<DayStatus, string> = {
  goalMet: 'Goal met',
  freezeUsed: 'Freeze used',
  missed: 'Missed',
  empty: 'No data',
};

interface GridDay {
  date: string;
  data?: StreakHistoryDay;
}

function buildGrid(history: StreakHistoryDay[], days: number): { weeks: GridDay[][]; monthLabels: { label: string; colIndex: number }[] } {
  const today = new Date();
  const historyMap = new Map(history.map((d) => [d.date, d]));

  // Generate all dates from (days ago) to today
  const allDates: GridDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    allDates.push({ date: dateStr, data: historyMap.get(dateStr) });
  }

  // Pad the beginning to start on Sunday
  const firstDate = new Date(allDates[0].date + 'T12:00:00');
  const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday
  const padding: GridDay[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    padding.push({ date: '' });
  }
  const paddedDates = [...padding, ...allDates];

  // Build weeks (columns of 7)
  const weeks: GridDay[][] = [];
  for (let i = 0; i < paddedDates.length; i += 7) {
    weeks.push(paddedDates.slice(i, i + 7));
  }

  // Pad last week to 7 if needed
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) {
    lastWeek.push({ date: '' });
  }

  // Build month labels
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIndex) => {
    // Find first non-empty day in this week
    const firstDay = week.find((d) => d.date);
    if (firstDay?.date) {
      const month = parseInt(firstDay.date.split('-')[1], 10) - 1;
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTH_NAMES[month], colIndex });
        lastMonth = month;
      }
    }
  });

  return { weeks, monthLabels };
}

export function StreakHeatmap({
  history,
  currentStreak,
  longestStreak,
  dailyGoalMinutes,
  onDaySelect,
}: StreakHeatmapProps) {
  const days = Math.max(history.length, 90);
  const { weeks, monthLabels } = useMemo(() => buildGrid(history, days), [history, days]);

  const handleDayClick = useCallback(
    (date: string) => {
      if (date && onDaySelect) {
        onDaySelect(date);
      }
    },
    [onDaySelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: string) => {
      if ((e.key === 'Enter' || e.key === ' ') && date) {
        e.preventDefault();
        onDaySelect?.(date);
      }
    },
    [onDaySelect]
  );

  return (
    <div className="space-y-4" data-testid="streak-heatmap">
      {/* Streak Stats Header */}
      <div className="flex items-center justify-between" data-testid="streak-stats">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <span className="text-sm font-medium">
            Current streak: <strong>{currentStreak}</strong> {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          Best: <strong>{longestStreak}</strong> {longestStreak === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto -mx-1 px-1" data-testid="heatmap-grid-container">
        <div className="inline-flex gap-0.5">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 pr-1">
            {/* Month label spacer */}
            <div className="h-4" />
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="h-[14px] w-6 flex items-center text-[10px] text-muted-foreground leading-none"
                aria-hidden="true"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div role="grid" aria-label={`Reading streak heatmap showing last ${days} days`}>
            {/* Month labels row */}
            <div className="flex gap-0.5 h-4" role="row">
              {weeks.map((_, colIndex) => {
                const monthLabel = monthLabels.find((m) => m.colIndex === colIndex);
                return (
                  <div
                    key={`month-${colIndex}`}
                    className="w-[14px] flex items-end text-[10px] text-muted-foreground leading-none"
                    role="columnheader"
                  >
                    {monthLabel?.label ?? ''}
                  </div>
                );
              })}
            </div>

            {/* Grid rows (one per day of week) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
              <div key={dayOfWeek} className="flex gap-0.5" role="row">
                {weeks.map((week, colIndex) => {
                  const gridDay = week[dayOfWeek];
                  if (!gridDay || !gridDay.date) {
                    return (
                      <div
                        key={`empty-${colIndex}-${dayOfWeek}`}
                        className="h-[14px] w-[14px] rounded-[2px] bg-transparent"
                        role="gridcell"
                      />
                    );
                  }
                  const status = getDayStatus(gridDay.data);
                  const ariaLabel = `${gridDay.date}: ${STATUS_LABELS[status]}${
                    gridDay.data ? `, ${gridDay.data.minutesRead} minutes read` : ''
                  }`;

                  return (
                    <button
                      key={gridDay.date}
                      type="button"
                      className={`h-[14px] w-[14px] rounded-[2px] ${STATUS_STYLES[status]} cursor-pointer transition-colors touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-[14px] sm:w-[14px] p-0`}
                      role="gridcell"
                      aria-label={ariaLabel}
                      onClick={() => handleDayClick(gridDay.date)}
                      onKeyDown={(e) => handleKeyDown(e, gridDay.date)}
                      tabIndex={0}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground" data-testid="heatmap-legend">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-[2px] bg-green-500" aria-hidden="true" />
          <span>Goal Met</span>
        </div>
        <div className="flex items-center gap-1">
          <Snowflake className="h-3 w-3 text-blue-500" aria-hidden="true" />
          <div className="h-3 w-3 rounded-[2px] bg-blue-500" aria-hidden="true" />
          <span>Freeze Used</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-[2px] bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
}
