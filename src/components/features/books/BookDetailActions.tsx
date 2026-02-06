'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, CheckCircle, BookMarked, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { updateReadingStatus, removeFromLibrary, restoreToLibrary } from '@/actions/books';
import { SessionTimer } from '@/components/features/sessions';
import { AddToLibraryButton } from './AddToLibraryButton';
import { ReadingStatusSelector } from './ReadingStatusSelector';
import { getReadingStatusLabel } from './types';
import type { BookSearchResult } from '@/services/books/types';
import type { ReadingStatus } from '@prisma/client';

interface BookDetailActionsProps {
  book: BookSearchResult;
  isInLibrary: boolean;
  currentStatus?: ReadingStatus;
  progress?: number;
  userBookId?: string;
  onStatusChange?: (status: ReadingStatus) => void;
  onRemove?: () => void;
  onRestore?: (status: ReadingStatus, progress: number) => void;
  className?: string;
}

function StatusIconComponent({ status }: { status: ReadingStatus }) {
  switch (status) {
    case 'CURRENTLY_READING':
      return <BookOpen className="h-5 w-5 text-amber-600" />;
    case 'FINISHED':
      return <CheckCircle className="h-5 w-5 text-amber-600" />;
    case 'WANT_TO_READ':
      return <BookMarked className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
}

export function BookDetailActions({
  book,
  isInLibrary,
  currentStatus,
  progress = 0,
  userBookId,
  onStatusChange,
  onRemove,
  onRestore,
  className,
}: BookDetailActionsProps) {
  // Optimistic overlay: when set, overrides props. Cleared after server response.
  const [optimistic, setOptimistic] = useState<{
    status: ReadingStatus;
    progress: number;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Display values: optimistic overlay takes priority, then falls through to props
  const displayStatus = optimistic?.status ?? currentStatus;
  const displayProgress = optimistic?.progress ?? progress;

  // Clear optimistic overlay once props catch up
  useEffect(() => {
    if (optimistic && currentStatus === optimistic.status) {
      setOptimistic(null);
    }
  }, [currentStatus, optimistic]);

  if (!isInLibrary) {
    return (
      <div className={cn('px-4 py-4', className)} data-testid="add-to-library-section">
        <AddToLibraryButton
          book={book}
          isInLibrary={false}
          onStatusChange={onStatusChange}
          className="w-full h-12 text-base"
        />
      </div>
    );
  }

  const statusLabel = displayStatus ? getReadingStatusLabel(displayStatus) : '';

  const handleStatusUpdate = async (newStatus: ReadingStatus) => {
    if (newStatus === displayStatus || isUpdating) return;
    if (!userBookId) {
      toast.error('Unable to update status. Please try refreshing the page.');
      setPopoverOpen(false);
      return;
    }

    // Compute optimistic progress
    let newProgress = displayProgress;
    if (newStatus === 'FINISHED') {
      newProgress = 100;
    } else if (newStatus === 'WANT_TO_READ') {
      newProgress = 0;
    }

    // Set optimistic overlay (immediately visible)
    setOptimistic({ status: newStatus, progress: newProgress });
    setPopoverOpen(false);

    setIsUpdating(true);
    const result = await updateReadingStatus({
      userBookId,
      status: newStatus,
    });
    setIsUpdating(false);

    if (result.success) {
      toast.success(`Status updated to ${getReadingStatusLabel(newStatus)}`);
      onStatusChange?.(newStatus);
      // Keep optimistic overlay until parent props catch up
    } else {
      // Clear optimistic overlay - falls back to original prop values
      setOptimistic(null);
      toast.error(result.error);
    }
  };

  const handleRemove = async () => {
    if (!userBookId || isRemoving) return;

    // Store previous state for undo
    const previousStatus = displayStatus;
    const previousProgress = displayProgress;

    // Optimistic removal
    setIsRemoving(true);
    onRemove?.();

    const result = await removeFromLibrary({ userBookId });

    if (result.success) {
      toast('Book removed from library', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const restoreResult = await restoreToLibrary({ userBookId });
            if (restoreResult.success) {
              if (previousStatus) {
                onRestore?.(previousStatus, previousProgress);
              }
              toast.success('Book restored to library');
            } else {
              toast.error('Failed to restore book');
            }
          },
        },
        duration: 5000,
      });
    } else {
      // Rollback
      if (previousStatus) {
        onRestore?.(previousStatus, previousProgress);
      }
      toast.error(result.error);
    }
    setIsRemoving(false);
  };

  return (
    <div
      className={cn('px-4 py-4 space-y-4', className)}
      data-testid="library-status-section"
    >
      {/* Current status display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {displayStatus && <StatusIconComponent status={displayStatus} />}
          <span className="font-medium" data-testid="current-status">
            {statusLabel}
          </span>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="change-status-button"
              disabled={isUpdating || isRemoving}
            >
              Change status <ArrowRight className="h-3 w-3" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <ReadingStatusSelector
              value={displayStatus}
              onSelect={handleStatusUpdate}
              disabled={isUpdating}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Progress bar for currently reading */}
      {displayStatus === 'CURRENTLY_READING' && (
        <div className="space-y-1" data-testid="progress-section">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span data-testid="progress-value">{displayProgress}%</span>
          </div>
          <Progress value={displayProgress} className="h-2" />
        </div>
      )}

      {/* Session timer and quick actions */}
      {displayStatus === 'CURRENTLY_READING' && (
        <SessionTimer
          bookId={book.isbn13 || book.isbn10 || book.id}
          bookTitle={book.title}
          bookStatus={displayStatus}
        />
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled
          data-testid="update-progress-button"
        >
          Update Progress
        </Button>
      </div>

      {/* Remove from library */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            data-testid="remove-from-library-button"
            disabled={isRemoving || isUpdating}
          >
            <Trash2 className="h-4 w-4" />
            Remove from Library
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="remove-dialog-title">
              Remove &ldquo;{book.title}&rdquo; from your library?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="remove-dialog-description">
              This will remove your reading history for this book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="remove-dialog-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="remove-dialog-confirm"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
