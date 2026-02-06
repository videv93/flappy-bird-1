'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';
import { useTimerInterval } from '@/hooks/useTimerInterval';
import { formatTime } from './types';

export function ActiveSessionIndicator() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const currentBookId = useTimerStore((s) => s.currentBookId);
  const currentBookTitle = useTimerStore((s) => s.currentBookTitle);
  const hasHydrated = useTimerStore((s) => s._hasHydrated);
  const elapsed = useTimerInterval();

  if (!hasHydrated || !isRunning || !currentBookId) {
    return null;
  }

  const timeString = formatTime(elapsed);
  const elapsedMinutes = Math.floor(elapsed / 60);

  return (
    <Link
      href={`/book/${currentBookId}`}
      className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors"
      data-testid="active-session-indicator"
      aria-label={`Active reading session: ${currentBookTitle}, ${timeString}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping motion-reduce:animate-none" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <BookOpen className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span className="text-sm font-medium truncate" data-testid="active-session-title">
        {currentBookTitle}
      </span>
      <span
        className="ml-auto font-mono text-sm font-semibold tabular-nums text-amber-700 shrink-0"
        data-testid="active-session-time"
      >
        {timeString}
      </span>
      <span className="sr-only" aria-live="polite">
        {`${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''} elapsed`}
      </span>
    </Link>
  );
}
