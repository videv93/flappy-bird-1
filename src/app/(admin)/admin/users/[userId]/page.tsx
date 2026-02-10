import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { getUserDetail } from '@/actions/admin/getUserDetail';
import { getUserModerationHistory } from '@/actions/admin/getUserModerationHistory';
import { UserAccountCard } from '@/components/features/admin/UserAccountCard';
import { UserActivitySection } from '@/components/features/admin/UserActivitySection';
import { UserSessionsList } from '@/components/features/admin/UserSessionsList';
import { UserModerationDetail } from '@/components/features/admin/UserModerationDetail';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user?.id) {
    redirect('/login');
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!adminUser || !isAdmin(adminUser)) {
    redirect('/home');
  }

  const [detailResult, moderationResult] = await Promise.all([
    getUserDetail(userId),
    getUserModerationHistory(userId),
  ]);

  if (!detailResult.success) {
    return (
      <div className="p-6">
        <p className="text-destructive">{detailResult.error}</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center min-h-[44px]"
      >
        &larr; Back to User Lookup
      </Link>

      <UserAccountCard
        account={detailResult.data.account}
        readingStats={detailResult.data.readingStats}
        socialStats={detailResult.data.socialStats}
      />

      <UserActivitySection
        recentActivity={detailResult.data.recentActivity}
        moderationSummary={detailResult.data.moderationSummary}
      />

      <UserSessionsList userId={userId} />

      {moderationResult.success && (
        <UserModerationDetail data={moderationResult.data} />
      )}
    </div>
  );
}
