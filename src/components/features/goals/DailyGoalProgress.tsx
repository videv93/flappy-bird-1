'use client';

import { Check } from 'lucide-react';

interface DailyGoalProgressProps {
  minutesRead: number;
  goalMinutes: number;
}

export function DailyGoalProgress({ minutesRead, goalMinutes }: DailyGoalProgressProps) {
  const goalMet = minutesRead >= goalMinutes;
  const progressPercent = Math.min(Math.round((minutesRead / goalMinutes) * 100), 100);

  const ariaLabel = goalMet
    ? `Daily reading goal met! ${minutesRead} minutes of ${goalMinutes} minute goal completed today`
    : `${minutesRead} minutes of ${goalMinutes} minute daily goal completed today`;

  return (
    <div data-testid="daily-goal-progress" className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" data-testid="goal-progress-text">
          {goalMet ? (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-4 w-4" />
              Goal met!
            </span>
          ) : minutesRead === 0 ? (
            <span className="text-muted-foreground">
              0 of {goalMinutes} min today — start reading!
            </span>
          ) : (
            <span>
              {minutesRead} of {goalMinutes} min today
            </span>
          )}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={minutesRead}
        aria-valuemin={0}
        aria-valuemax={goalMinutes}
        aria-label={ariaLabel}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        data-testid="goal-progress-bar"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
            goalMet ? 'bg-green-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progressPercent}%` }}
          data-testid="goal-progress-fill"
        />
      </div>
    </div>
  );
}
