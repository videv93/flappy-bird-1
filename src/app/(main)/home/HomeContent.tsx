'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logout } from '@/actions/auth/logout';
import { DailyGoalSetter, DailyGoalProgress } from '@/components/features/goals';
import { StreakRing } from '@/components/features/streaks';

interface HomeContentProps {
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  dailyGoalMinutes: number | null;
  minutesRead: number;
  currentStreak: number;
  freezeUsedToday: boolean;
}

export function HomeContent({
  userName,
  userEmail,
  userImage,
  dailyGoalMinutes,
  minutesRead,
  currentStreak,
  freezeUsedToday,
}: HomeContentProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    toast.success('Signed out successfully');
    await logout();
  };

  const handleGoalSet = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4 pt-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome{userName ? `, ${userName}` : ''}!
        </h2>
        <div className="mt-4 flex flex-col items-center gap-2">
          {userImage && (
            <Image
              src={userImage}
              alt={userName || 'User avatar'}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full"
            />
          )}
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
      </div>

      {/* Daily Goal Section */}
      <div className="w-full max-w-md" data-testid="goal-section">
        {dailyGoalMinutes === null ? (
          <DailyGoalSetter onGoalSet={handleGoalSet} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <StreakRing
              currentStreak={currentStreak}
              minutesRead={minutesRead}
              goalMinutes={dailyGoalMinutes}
              freezeUsedToday={freezeUsedToday}
              size="lg"
            />
            <DailyGoalProgress minutesRead={minutesRead} goalMinutes={dailyGoalMinutes} />
          </div>
        )}
      </div>

      <Button variant="outline" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}
