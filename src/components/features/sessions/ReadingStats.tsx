import { BookOpen, Clock, BarChart3 } from 'lucide-react';
import { formatTime } from './types';

export interface ReadingStatsProps {
  totalSeconds: number;
  sessionCount: number;
  avgSeconds: number;
}

function formatTotalTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function ReadingStats({ totalSeconds, sessionCount, avgSeconds }: ReadingStatsProps) {
  if (sessionCount === 0) {
    return (
      <div
        className="py-4 text-center text-sm text-muted-foreground"
        data-testid="reading-stats-empty"
      >
        Start reading to see your stats!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4" data-testid="reading-stats">
      <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-lg font-semibold" data-testid="reading-stats-total-time">
          {formatTotalTime(totalSeconds)}
        </span>
        <span className="text-xs text-muted-foreground">Total time</span>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
        <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-lg font-semibold" data-testid="reading-stats-session-count">
          {sessionCount}
        </span>
        <span className="text-xs text-muted-foreground">Sessions</span>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
        <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-lg font-semibold" data-testid="reading-stats-avg-duration">
          {formatTime(avgSeconds)}
        </span>
        <span className="text-xs text-muted-foreground">Avg session</span>
      </div>
    </div>
  );
}
