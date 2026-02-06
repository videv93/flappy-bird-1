'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useTimerStore } from '@/stores/useTimerStore';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { saveReadingSession } from '@/actions/sessions';
import { formatTime } from './types';

export interface SessionSummaryProps {
  bookId: string;
  bookTitle: string;
  duration: number; // seconds
  startTime: number; // Unix ms timestamp
  onComplete: () => void;
}

export function SessionSummary({
  bookId,
  bookTitle,
  duration,
  startTime,
  onComplete,
}: SessionSummaryProps) {
  const reset = useTimerStore((s) => s.reset);
  const queueSession = useOfflineStore((s) => s.queueSession);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const startedAt = new Date(startTime).toISOString();
  const endedAt = new Date(startTime + duration * 1000).toISOString();
  const dateDisplay = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sessions under 1 minute can't be saved
  if (duration < 60) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center"
        data-testid="session-too-short"
        role="status"
      >
        <p className="text-sm text-amber-800">
          Sessions under 1 minute aren&apos;t saved. Keep reading!
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => {
            reset();
            onComplete();
          }}
          data-testid="dismiss-short-session"
        >
          Dismiss
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);

    if (!navigator.onLine) {
      queueSession({ bookId, duration, startedAt, endedAt });
      toast.info('Session saved offline. Will sync when connected.');
      reset();
      onComplete();
      setIsSaving(false);
      return;
    }

    const result = await saveReadingSession({
      bookId,
      duration,
      startedAt,
      endedAt,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success('Reading session saved!');
      reset();
      onComplete();
    } else {
      toast.error(result.error);
    }
  };

  const handleDiscard = () => {
    reset();
    onComplete();
    setShowDiscardDialog(false);
  };

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid="session-summary"
      role="region"
      aria-label="Reading session summary"
    >
      <h3 className="text-sm font-medium text-muted-foreground">Session Complete</h3>
      <div className="space-y-1">
        <p className="font-semibold" data-testid="summary-book-title">
          {bookTitle}
        </p>
        <p
          className="text-2xl font-mono font-semibold tabular-nums text-amber-700"
          data-testid="summary-duration"
        >
          {formatTime(duration)}
        </p>
        <p className="text-sm text-muted-foreground" data-testid="summary-date">
          {dateDisplay}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1 h-11 gap-2"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="save-session-button"
          aria-label="Save reading session"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Session'}
        </Button>
        <Button
          variant="ghost"
          className="h-11 gap-2 text-muted-foreground"
          onClick={() => setShowDiscardDialog(true)}
          disabled={isSaving}
          data-testid="discard-session-button"
          aria-label="Discard reading session"
        >
          <Trash2 className="h-4 w-4" />
          Discard
        </Button>
      </div>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard session?</AlertDialogTitle>
            <AlertDialogDescription>
              This {formatTime(duration)} reading session will not be saved. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="discard-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              data-testid="discard-confirm"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
