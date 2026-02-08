'use client';

import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useTimerStore } from '@/stores/useTimerStore';
import { useTimerInterval } from '@/hooks/useTimerInterval';
import { joinRoom } from '@/actions/presence';
import { getRoomMembers } from '@/actions/presence';
import { SessionSummary } from './SessionSummary';
import { formatTime, type SessionTimerProps } from './types';

export function SessionTimer({ bookId, bookTitle, bookStatus, userId = '', timezone = 'UTC' }: SessionTimerProps) {
  const isRunning = useTimerStore((s) => s.isRunning);
  const currentBookId = useTimerStore((s) => s.currentBookId);
  const currentBookTitle = useTimerStore((s) => s.currentBookTitle);
  const startTime = useTimerStore((s) => s.startTime);
  const hasHydrated = useTimerStore((s) => s._hasHydrated);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const reset = useTimerStore((s) => s.reset);
  const elapsed = useTimerInterval();

  const [showConflict, setShowConflict] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [stoppedDuration, setStoppedDuration] = useState(0);
  const [stoppedStartTime, setStoppedStartTime] = useState(0);

  // Only show for CURRENTLY_READING books
  if (bookStatus !== 'CURRENTLY_READING') {
    return null;
  }

  // Hydration skeleton
  if (!hasHydrated) {
    return (
      <div data-testid="session-timer-skeleton">
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const isActiveForThisBook = isRunning && currentBookId === bookId;
  const isActiveForOtherBook = isRunning && currentBookId !== null && currentBookId !== bookId;

  const autoJoinRoom = async () => {
    try {
      const joinResult = await joinRoom(bookId);
      if (joinResult.success) {
        const membersResult = await getRoomMembers(bookId);
        if (membersResult.success) {
          const count = membersResult.data.length;
          if (count <= 1) {
            toast("You're the first reader here!", { duration: 3000 });
          } else {
            toast(`You're reading with ${count - 1} other${count - 1 === 1 ? '' : 's'}`, { duration: 3000 });
          }
        }
      }
    } catch (error) {
      console.error('Failed to auto-join reading room:', error);
    }
  };

  const handleStart = () => {
    if (isActiveForOtherBook) {
      setShowConflict(true);
      return;
    }
    start(bookId, bookTitle);
    autoJoinRoom();
  };

  const handleStop = () => {
    const duration = elapsed;
    const currentStartTime = startTime ?? Date.now();
    stop();
    setStoppedDuration(duration);
    setStoppedStartTime(currentStartTime);
    setShowSummary(true);
  };

  const handleSummaryComplete = () => {
    setShowSummary(false);
    setStoppedDuration(0);
    setStoppedStartTime(0);
  };

  const handleConflictEnd = () => {
    reset();
    start(bookId, bookTitle);
    setShowConflict(false);
    autoJoinRoom();
  };

  const handleConflictCancel = () => {
    setShowConflict(false);
  };

  // Show session summary after stopping
  if (showSummary && !isRunning && currentBookId === bookId) {
    return (
      <SessionSummary
        bookId={bookId}
        bookTitle={bookTitle}
        duration={stoppedDuration}
        startTime={stoppedStartTime}
        userId={userId}
        timezone={timezone}
        onComplete={handleSummaryComplete}
      />
    );
  }

  return (
    <div data-testid="session-timer">
      {isActiveForThisBook ? (
        <div className="flex items-center gap-3">
          <div
            className="font-mono text-2xl font-semibold tabular-nums text-amber-700"
            data-testid="timer-display"
          >
            {formatTime(elapsed)}
          </div>
          <span className="sr-only" aria-live="polite">
            {`${Math.floor(elapsed / 60)} minute${Math.floor(elapsed / 60) !== 1 ? 's' : ''} elapsed`}
          </span>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2 border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleStop}
            data-testid="stop-reading-button"
            aria-label={`Stop reading session, elapsed time: ${formatTime(elapsed)}`}
          >
            <Square className="h-4 w-4" />
            Stop Reading
          </Button>
        </div>
      ) : (
        <Button
          className="w-full h-11 gap-2"
          onClick={handleStart}
          data-testid="start-reading-button"
          aria-label="Start reading session"
        >
          <Play className="h-4 w-4" />
          Start Reading
        </Button>
      )}

      <AlertDialog open={showConflict} onOpenChange={setShowConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="conflict-dialog-title">
              Active reading session
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="conflict-dialog-description">
              You have an active session for &ldquo;{currentBookTitle}&rdquo;. End it first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleConflictCancel}
              data-testid="conflict-dialog-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictEnd}
              data-testid="conflict-dialog-end"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
