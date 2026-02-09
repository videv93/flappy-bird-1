import { CheckCircle } from 'lucide-react';

export function ModerationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
      <h3 className="text-lg font-medium mb-1">No pending items</h3>
      <p className="text-muted-foreground">Great work!</p>
    </div>
  );
}
