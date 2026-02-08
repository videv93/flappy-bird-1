import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDailyProgress } from '@/actions/goals';
import { getStreakData, checkStreakStatus } from '@/actions/streaks';
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
    // TODO: Pass user's timezone from client cookie/preference instead of UTC
    // Currently uses UTC which may show incorrect "today" for non-UTC users
    const progressResult = await getDailyProgress({ timezone: 'UTC' });
    if (progressResult.success) {
      minutesRead = progressResult.data.minutesRead;
    }
  }

  // Fetch streak data only when goal is set (StreakRing not rendered otherwise)
  let currentStreak = 0;
  let freezeUsedToday = false;
  let isStreakAtRisk = false;
  let freezesAvailable = 0;
  if (user.dailyGoalMinutes) {
    // TODO: Pass user's timezone from client cookie/preference instead of UTC
    // Currently uses UTC which may show incorrect "today" for non-UTC users
    const streakResult = await getStreakData({ timezone: 'UTC' });
    if (streakResult.success) {
      currentStreak = streakResult.data.currentStreak;
      freezeUsedToday = streakResult.data.freezeUsedToday;
      freezesAvailable = streakResult.data.freezesAvailable;
    }

    // Check streak health for compassionate messaging
    // TODO: Pass user's timezone from client cookie/preference instead of UTC
    const statusResult = await checkStreakStatus({ timezone: 'UTC' });
    if (statusResult.success) {
      isStreakAtRisk = statusResult.data.isAtRisk;
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
        isStreakAtRisk={isStreakAtRisk}
        freezesAvailable={freezesAvailable}
      />
    </main>
  );
}
