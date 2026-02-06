import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDailyProgress } from '@/actions/goals';
import { getStreakData } from '@/actions/streaks';
import { HomeContent } from './HomeContent';

export default async function HomePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect('/login?callbackUrl=/home');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      dailyGoalMinutes: true,
    },
  });

  if (!user) {
    redirect('/login?callbackUrl=/home');
  }

  // Fetch daily progress if goal is set
  let minutesRead = 0;
  if (user.dailyGoalMinutes) {
    const progressResult = await getDailyProgress({ timezone: 'UTC' });
    if (progressResult.success) {
      minutesRead = progressResult.data.minutesRead;
    }
  }

  // Fetch streak data only when goal is set (StreakRing not rendered otherwise)
  let currentStreak = 0;
  let freezeUsedToday = false;
  if (user.dailyGoalMinutes) {
    const streakResult = await getStreakData();
    if (streakResult.success) {
      currentStreak = streakResult.data.currentStreak;
      freezeUsedToday = streakResult.data.freezeUsedToday;
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <HomeContent
        userName={user.name}
        userEmail={user.email}
        userImage={user.image}
        dailyGoalMinutes={user.dailyGoalMinutes}
        minutesRead={minutesRead}
        currentStreak={currentStreak}
        freezeUsedToday={freezeUsedToday}
      />
    </main>
  );
}
