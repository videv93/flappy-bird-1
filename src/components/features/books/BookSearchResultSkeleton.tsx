import { Skeleton } from '@/components/ui/skeleton';

interface BookSearchResultSkeletonProps {
  count?: number;
}

function SingleSkeleton() {
  return (
    <div
      data-testid="book-search-result-skeleton"
      className="flex gap-3 p-3 rounded-lg min-h-[72px]"
    >
      {/* Cover skeleton */}
      <Skeleton
        data-testid="skeleton-cover"
        className="w-12 h-16 flex-shrink-0"
      />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton data-testid="skeleton-title" className="h-4 w-3/4" />
        <Skeleton data-testid="skeleton-author" className="h-3 w-1/2" />
        <Skeleton data-testid="skeleton-year" className="h-3 w-12" />
      </div>
    </div>
  );
}

export function BookSearchResultSkeleton({
  count = 1,
}: BookSearchResultSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <SingleSkeleton key={index} />
      ))}
    </>
  );
}
