import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface BookSearchErrorProps {
  onRetry: () => void;
  message?: string;
}

export function BookSearchError({
  onRetry,
  message = "We couldn't search for books right now. Please try again.",
}: BookSearchErrorProps) {
  return (
    <div
      data-testid="book-search-error"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <AlertCircle
        className="h-12 w-12 text-destructive mb-4"
        data-testid="error-icon"
        aria-hidden="true"
      />
      <h3 className="font-medium text-lg mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" data-testid="refresh-icon" />
        Try again
      </Button>
    </div>
  );
}
