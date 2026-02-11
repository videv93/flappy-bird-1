'use client';

import { useState, useTransition } from 'react';
import { Check, Plus, ChevronDown, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { addToLibrary } from '@/actions/books';
import { READING_STATUS_OPTIONS } from './types';
import { UpgradePromptDialog } from './UpgradePromptDialog';
import type { BookSearchResult } from '@/services/books/types';
import type { ReadingStatus } from '@prisma/client';

interface AddToLibraryButtonProps {
  /** Book data from search results */
  book: BookSearchResult;
  /** Whether the book is already in the user's library */
  isInLibrary?: boolean;
  /** Current reading status if book is in library */
  currentStatus?: ReadingStatus;
  /** Callback when book status changes (after successful add) */
  onStatusChange?: (status: ReadingStatus) => void;
  /** Callback when user taps on a book already in library (to navigate or view details) */
  onViewInLibrary?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component for adding books to the user's library.
 * Shows a dropdown with reading status options when clicked.
 * Displays checkmark and current status when book is already in library.
 */
export function AddToLibraryButton({
  book,
  isInLibrary = false,
  currentStatus,
  onStatusChange,
  onViewInLibrary,
  className,
}: AddToLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{
    currentBookCount: number;
    maxBooks: number;
  } | null>(null);

  const handleStatusSelect = (status: ReadingStatus) => {
    setOpen(false);

    startTransition(async () => {
      const result = await addToLibrary({
        title: book.title,
        authors: book.authors,
        isbn10: book.isbn10,
        isbn13: book.isbn13,
        coverUrl: book.coverUrl,
        pageCount: book.pageCount,
        publishedYear: book.publishedYear,
        description: book.description,
        status,
      });

      if (result.success) {
        const statusLabel = READING_STATUS_OPTIONS.find((s) => s.value === status)?.label;
        toast.success(`Added to ${statusLabel}`);
        onStatusChange?.(status);
      } else if (
        'code' in result &&
        result.code === 'BOOK_LIMIT_REACHED'
      ) {
        setLimitInfo({
          currentBookCount: result.currentBookCount,
          maxBooks: result.maxBooks,
        });
        setShowUpgradePrompt(true);
      } else {
        toast.error(result.error);
      }
    });
  };

  // Show "in library" state with checkmark and current status
  // Per AC #3: User can tap to change status or go to the book
  if (isInLibrary && currentStatus) {
    const statusInfo = READING_STATUS_OPTIONS.find((s) => s.value === currentStatus);
    const StatusIcon = statusInfo?.icon || BookOpen;

    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('gap-2', className)}
        onClick={onViewInLibrary}
        aria-label={`In library: ${statusInfo?.label}. Tap to view book.`}
      >
        <Check className="h-4 w-4 text-green-600" aria-hidden />
        <StatusIcon className="h-4 w-4" aria-hidden />
        <span className="text-xs">{statusInfo?.label}</span>
      </Button>
    );
  }

  // Show "Add to Library" button with dropdown
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className={cn('gap-2', className)}
            disabled={isPending}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            <span>Add to Library</span>
            <ChevronDown className="h-3 w-3" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="space-y-1" role="menu" aria-label="Select reading status">
            {READING_STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleStatusSelect(value as ReadingStatus)}
                role="menuitem"
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                  'hover:bg-accent transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {limitInfo && (
        <UpgradePromptDialog
          open={showUpgradePrompt}
          onOpenChange={(open) => {
            setShowUpgradePrompt(open);
            if (!open) setLimitInfo(null);
          }}
          currentBookCount={limitInfo.currentBookCount}
          maxBooks={limitInfo.maxBooks}
        />
      )}
    </>
  );
}
