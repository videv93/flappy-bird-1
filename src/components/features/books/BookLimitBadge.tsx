import { cn } from '@/lib/utils';

interface BookLimitBadgeProps {
  currentBookCount: number;
  maxBooks: number;
  isPremium: boolean;
}

export function BookLimitBadge({
  currentBookCount,
  maxBooks,
  isPremium,
}: BookLimitBadgeProps) {
  if (isPremium) {
    return null;
  }

  const atLimit = currentBookCount >= maxBooks;

  return (
    <span
      data-testid="book-limit-badge"
      aria-label={`${currentBookCount} of ${maxBooks} books used`}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        atLimit
          ? 'bg-amber-100 text-amber-800'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {currentBookCount}/{maxBooks} books
    </span>
  );
}
