import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserSessionStats } from '@/actions/sessions';
import { getStreakData } from '@/actions/streaks';
import { getKudosReceived } from '@/actions/social';
import { ProfileView } from '@/components/features/profile';
import { KudosList } from '@/components/features/social';

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    redirect('/login?callbackUrl=/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect('/login?callbackUrl=/profile');
  }

  const statsResult = await getUserSessionStats();
  const sessionStats = statsResult.success ? statsResult.data : null;

  const streakResult = await getStreakData();
  const streakData = streakResult.success ? streakResult.data : null;

  // Fetch kudos for current user
  const kudosResult = await getKudosReceived({ limit: 20, offset: 0 });
  const kudosData = kudosResult.success
    ? kudosResult.data
    : { kudos: [], total: 0, hasMore: false };

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
      <ProfileView user={user} sessionStats={sessionStats} streakData={streakData} />

      {/* Kudos Section - Only on own profile */}
      <section className="border-t pt-6">
        <KudosList
          initialKudos={kudosData.kudos}
          initialTotal={kudosData.total}
        />
      </section>
    </main>
  );
}
