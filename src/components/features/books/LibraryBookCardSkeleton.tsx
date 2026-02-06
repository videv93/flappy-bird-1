import { Skeleton } from '@/components/ui/skeleton';

interface LibraryBookCardSkeletonProps {
  count?: number;
}

export function LibraryBookCardSkeleton({ count = 3 }: LibraryBookCardSkeletonProps) {
  return (
    <div className="space-y-1" data-testid="library-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg p-3">
          {/* Cover skeleton */}
          <Skeleton className="h-[80px] w-[54px] flex-shrink-0 rounded-md" />

          {/* Info skeleton */}
          <div className="flex flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
