'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { getKudosReceived, type KudosWithDetails } from '@/actions/social';
import { KudosListItem } from './KudosListItem';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface KudosListProps {
  initialKudos: KudosWithDetails[];
  initialTotal: number;
}

export function KudosList({ initialKudos, initialTotal }: KudosListProps) {
  const [kudos, setKudos] = useState(initialKudos);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();

  const hasMore = kudos.length < total;

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await getKudosReceived({
        limit: 20,
        offset: kudos.length,
      });

      if (result.success) {
        setKudos((prev) => [...prev, ...result.data.kudos]);
        setTotal(result.data.total);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (kudos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg text-muted-foreground">
          No kudos yet. Keep reading and share your progress with friends!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kudos Received</h2>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <div className="divide-y">
        {kudos.map((k) => (
          <KudosListItem key={k.id} kudos={k} />
        ))}
      </div>

      {hasMore && (
        <Button
          onClick={handleLoadMore}
          disabled={isPending}
          variant="outline"
          className="w-full min-h-[44px]"
        >
          {isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Loading...</span>
            </div>
          ) : (
            'Load More'
          )}
        </Button>
      )}
    </div>
  );
}
