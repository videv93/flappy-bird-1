import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            {/* Avatar skeleton */}
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
            {/* Name skeleton */}
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            {/* Email skeleton */}
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form field skeletons */}
            <div className="space-y-2">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
