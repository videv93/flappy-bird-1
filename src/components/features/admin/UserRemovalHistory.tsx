'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { getUserRemovalHistory } from '@/actions/admin/getUserRemovalHistory';
import type { RemovalHistoryItem } from '@/actions/admin/getUserRemovalHistory';

const VIOLATION_TYPE_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  SPOILERS: 'Spoilers',
  INAPPROPRIATE: 'Inappropriate',
  OTHER: 'Other',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  PROFILE_BIO: 'Profile Bio',
  READING_ROOM_DESCRIPTION: 'Reading Room Description',
};

interface UserRemovalHistoryProps {
  userId: string;
}

export function UserRemovalHistory({ userId }: UserRemovalHistoryProps) {
  const [items, setItems] = useState<RemovalHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const result = await getUserRemovalHistory({ userId });
      if (result.success) {
        setItems(result.data.items);
        setTotalCount(result.data.totalCount);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    fetchHistory();
  }, [userId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading removal history...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No content removals on record.</p>;
  }

  const hasPattern = totalCount >= 3;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Content Removal History</h3>
        <span className="text-xs text-muted-foreground">{totalCount} total</span>
      </div>

      {hasPattern && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Pattern detected: {totalCount} content removals on record</span>
        </div>
      )}

      <ul className="space-y-2" role="list" aria-label="Removal history">
        {items.map((item) => {
          const removedAt =
            item.removedAt instanceof Date ? item.removedAt : new Date(item.removedAt);
          const restoredAt =
            item.restoredAt instanceof Date
              ? item.restoredAt
              : item.restoredAt
                ? new Date(item.restoredAt)
                : null;

          return (
            <li key={item.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {VIOLATION_TYPE_LABELS[item.violationType] ?? item.violationType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}
                  </span>
                </div>
                {restoredAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <RotateCcw className="h-3 w-3" />
                    Restored
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Removed {removedAt.toLocaleDateString()} by {item.removedBy.name ?? 'Unknown'}
              </p>
              {item.adminNotes && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  &quot;{item.adminNotes}&quot;
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
