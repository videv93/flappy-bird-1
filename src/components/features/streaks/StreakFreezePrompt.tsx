'use client';

import { useState } from 'react';
import { Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useStreakFreeze as applyStreakFreeze } from '@/actions/streaks/useStreakFreeze';

export interface StreakFreezePromptProps {
  freezesAvailable: number;
  isAtRisk: boolean;
  currentStreak: number;
  onFreezeUsed: () => void;
  onDecline: () => void;
}

export function StreakFreezePrompt({
  freezesAvailable,
  isAtRisk,
  currentStreak,
  onFreezeUsed,
  onDecline,
}: StreakFreezePromptProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Don't render if conditions aren't met
  if (!isAtRisk || freezesAvailable <= 0) {
    return null;
  }

  const handleUseFreeze = async () => {
    setIsLoading(true);
    try {
      const result = await applyStreakFreeze({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (result.success && result.data.freezeApplied) {
        toast.success('Streak protected with freeze!');
        onFreezeUsed();
      } else if (result.success) {
        toast.info(
          result.data.reason === 'already_frozen'
            ? 'Freeze already applied for yesterday'
            : 'Streak is not at risk'
        );
        onFreezeUsed();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to apply freeze');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-blue-200 bg-blue-50/50" data-testid="streak-freeze-prompt">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <Snowflake className="h-8 w-8 text-blue-500" aria-hidden="true" />
        <p className="text-sm text-center text-foreground">
          Use a freeze to protect your {currentStreak}-day streak?
        </p>
        <p className="text-xs text-muted-foreground">
          {freezesAvailable} freeze{freezesAvailable !== 1 ? 's' : ''} remaining
        </p>
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleUseFreeze}
            disabled={isLoading}
            className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white"
            aria-label="Use streak freeze"
          >
            {isLoading ? 'Applying...' : 'Use Freeze'}
          </Button>
          <Button
            variant="ghost"
            onClick={onDecline}
            disabled={isLoading}
            className="flex-1 min-h-[44px]"
            aria-label="Let streak reset"
          >
            Let It Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
