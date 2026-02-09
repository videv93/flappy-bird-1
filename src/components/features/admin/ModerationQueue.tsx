'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModerationItemCard } from './ModerationItemCard';
import { ModerationEmptyState } from './ModerationEmptyState';
import { getModerationQueue } from '@/actions/admin/getModerationQueue';
import type { ModerationQueueItem, ModerationQueueResult } from '@/actions/admin/getModerationQueue';
import { Skeleton } from '@/components/ui/skeleton';

interface ModerationQueueProps {
  initialData: ModerationQueueResult;
}

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'PROFILE_BIO', label: 'Profile Bio' },
  { value: 'READING_ROOM_DESCRIPTION', label: 'Room Description' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Pending' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'WARNED', label: 'Warned' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export function ModerationQueue({ initialData }: ModerationQueueProps) {
  const [data, setData] = useState<ModerationQueueResult>(initialData);
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchQueue = useCallback(async (page = 1, contentType?: string, status?: string) => {
    setLoading(true);
    try {
      const result = await getModerationQueue({
        page,
        pageSize: 20,
        contentType: contentType || undefined,
        status: status || undefined,
      } as Parameters<typeof getModerationQueue>[0]);

      if (result.success) {
        setData(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleContentTypeChange(value: string) {
    setContentTypeFilter(value);
    fetchQueue(1, value, statusFilter);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    fetchQueue(1, contentTypeFilter, value);
  }

  function handleRefresh() {
    fetchQueue(data.page, contentTypeFilter, statusFilter);
  }

  const totalPages = Math.ceil(data.totalCount / data.pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={contentTypeFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleContentTypeChange(opt.value)}
            className="min-h-[44px]"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleStatusChange(opt.value)}
            className="min-h-[44px]"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <ModerationEmptyState />
      ) : (
        <div className="space-y-3">
          {data.items.map((item: ModerationQueueItem) => (
            <ModerationItemCard
              key={item.id}
              item={item}
              onActionComplete={handleRefresh}
            />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => fetchQueue(data.page - 1, contentTypeFilter, statusFilter)}
            className="min-h-[44px]"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= totalPages}
            onClick={() => fetchQueue(data.page + 1, contentTypeFilter, statusFilter)}
            className="min-h-[44px]"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
