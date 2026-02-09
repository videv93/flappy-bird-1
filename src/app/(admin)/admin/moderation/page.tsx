import { getModerationQueue } from '@/actions/admin/getModerationQueue';
import { ModerationQueue } from '@/components/features/admin/ModerationQueue';
import { ModerationEmptyState } from '@/components/features/admin/ModerationEmptyState';

export default async function ModerationPage() {
  const result = await getModerationQueue();

  if (!result.success) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-6">Moderation Queue</h2>
      {result.data.totalCount === 0 && result.data.items.length === 0 ? (
        <ModerationEmptyState />
      ) : (
        <ModerationQueue initialData={result.data} />
      )}
    </div>
  );
}
