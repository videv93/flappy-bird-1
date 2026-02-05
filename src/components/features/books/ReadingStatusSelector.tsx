'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { READING_STATUS_OPTIONS } from './types';
import type { ReadingStatus } from '@prisma/client';

interface ReadingStatusSelectorProps {
  /** Currently selected status */
  value?: ReadingStatus;
  /** Callback when status is selected */
  onSelect: (status: ReadingStatus) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Component for selecting a reading status.
 * Displays three options: Currently Reading, Finished, Want to Read.
 * Touch-friendly with 44px minimum targets.
 */
export function ReadingStatusSelector({
  value,
  onSelect,
  disabled = false,
  className,
}: ReadingStatusSelectorProps) {
  return (
    <div
      className={cn('flex flex-col gap-1', className)}
      role="radiogroup"
      aria-label="Select reading status"
    >
      {READING_STATUS_OPTIONS.map(({ value: statusValue, label, icon: Icon }) => {
        const isSelected = value === statusValue;

        return (
          <button
            key={statusValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(statusValue as ReadingStatus)}
            className={cn(
              // Base styles - 44px minimum touch target
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm min-h-[44px]',
              'transition-colors duration-150',
              // Focus styles
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              // Selected vs unselected styles
              isSelected
                ? 'bg-primary/10 text-primary border-2 border-primary'
                : 'bg-muted/50 hover:bg-muted border-2 border-transparent',
              // Disabled styles
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-hidden
            />
            <span className={cn('font-medium', isSelected && 'text-primary')}>
              {label}
            </span>
            {isSelected && (
              <Check className="ml-auto h-4 w-4 text-primary" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Re-export from types.ts for backwards compatibility
export { READING_STATUS_OPTIONS, getReadingStatusLabel } from './types';
