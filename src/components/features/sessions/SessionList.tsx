'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Clock, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBookSessions } from '@/actions/sessions';
import { formatTime } from './types';
import type { ReadingSession } from '@prisma/client';

export interface SessionListProps {
  bookId: string;
  initialSessions: ReadingSession[];
  initialCursor: string | null;
}

function formatSessionDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeOfDay(date: Date | string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SessionList({ bookId, initialSessions, initialCursor }: SessionListProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setIsLoading(true);

    const result = await getBookSessions({ bookId, cursor: nextCursor });

    if (result.success) {
      setSessions((prev) => [...prev, ...result.data.sessions]);
      setNextCursor(result.data.nextCursor);
    } else {
      toast.error('Failed to load more sessions');
    }

    setIsLoading(false);
  };

  if (sessions.length === 0) {
    return (
      <div
        className="py-6 text-center text-sm text-muted-foreground"
        data-testid="session-list-empty"
      >
        No reading sessions yet. Start a session to see your history here.
      </div>
    );
  }

  return (
    <div data-testid="session-list">
      <ul className="divide-y divide-border">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex items-center justify-between py-3"
            data-testid="session-list-item"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{formatSessionDate(session.startedAt)}</p>
                <p className="text-xs text-muted-foreground">{formatTimeOfDay(session.startedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatTime(session.duration)}</span>
            </div>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <div className="pt-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-h-[44px] min-w-[120px]"
            data-testid="session-list-load-more"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Loading...
              </>
            ) : (
              'Show more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
