'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Flag, User, AlertTriangle } from 'lucide-react';
import { reviewModerationItem } from '@/actions/admin/reviewModerationItem';
import { toast } from 'sonner';
import type { ModerationQueueItem } from '@/actions/admin/getModerationQueue';

interface ModerationItemCardProps {
  item: ModerationQueueItem;
  onActionComplete?: () => void;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  PROFILE_BIO: 'Profile Bio',
  READING_ROOM_DESCRIPTION: 'Reading Room Description',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  DISMISSED: 'Dismissed',
  WARNED: 'Warned',
  REMOVED: 'Removed',
  SUSPENDED: 'Suspended',
};

export function ModerationItemCard({ item, onActionComplete }: ModerationItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isPending = item.status === 'PENDING';

  async function handleAction(action: 'dismiss' | 'warn' | 'remove' | 'suspend') {
    setLoading(true);
    try {
      const result = await reviewModerationItem({
        moderationItemId: item.id,
        action,
        adminNotes: adminNotes || undefined,
      });

      if (result.success) {
        toast.success(`Item ${action === 'dismiss' ? 'dismissed' : action === 'warn' ? 'warned' : action === 'remove' ? 'removed' : 'suspended'} successfully`);
        onActionComplete?.();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to process action');
    } finally {
      setLoading(false);
    }
  }

  const createdAt = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left min-h-[44px]"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-3 min-w-0">
            <Flag className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded">
                  {CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}
                </span>
                <span className="text-xs text-muted-foreground">
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>
              <p className="text-sm mt-1 line-clamp-2">{item.reason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {createdAt.toLocaleDateString()}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Reporter:</span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.reporter.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {item.reporter.name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{item.reporter.name ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Reported:</span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.reportedUser.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {item.reportedUser.name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{item.reportedUser.name ?? 'Unknown'}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{item.reason}</p>
            </div>

            {isPending && (
              <>
                <div>
                  <label htmlFor={`notes-${item.id}`} className="text-xs font-medium text-muted-foreground mb-1 block">
                    Admin Notes (optional)
                  </label>
                  <Textarea
                    id={`notes-${item.id}`}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this decision..."
                    className="text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('dismiss')}
                    disabled={loading}
                    className="min-h-[44px]"
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAction('warn')}
                    disabled={loading}
                    className="min-h-[44px] bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
                  >
                    Warn
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction('remove')}
                    disabled={loading}
                    className="min-h-[44px]"
                  >
                    Remove
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction('suspend')}
                    disabled={loading}
                    className="min-h-[44px]"
                  >
                    Suspend
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
