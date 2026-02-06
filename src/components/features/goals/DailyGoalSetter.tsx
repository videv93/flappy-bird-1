'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { setDailyGoal } from '@/actions/goals';
import { Check } from 'lucide-react';

const PRESET_OPTIONS = [5, 15, 30, 60] as const;

interface DailyGoalSetterProps {
  onGoalSet?: (minutes: number) => void;
  currentGoal?: number | null;
}

export function DailyGoalSetter({ onGoalSet, currentGoal }: DailyGoalSetterProps) {
  const [selected, setSelected] = useState<number | null>(currentGoal ?? null);
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePresetClick = (minutes: number) => {
    setSelected(minutes);
    setShowCustom(false);
    setCustomValue('');
  };

  const handleCustomClick = () => {
    setShowCustom(true);
    setSelected(null);
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 480) {
      setSelected(num);
    } else {
      setSelected(null);
    }
  };

  const handleConfirm = async () => {
    if (selected === null) return;

    setIsSaving(true);
    const result = await setDailyGoal({ dailyGoalMinutes: selected });
    setIsSaving(false);

    if (result.success) {
      toast.success(`Your daily goal is ${selected} minutes`);
      onGoalSet?.(selected);
    } else {
      toast.error(result.error || 'Failed to set goal');
    }
  };

  return (
    <Card data-testid="daily-goal-setter">
      <CardHeader>
        <CardTitle className="text-lg">Set your daily reading goal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((minutes) => (
            <Button
              key={minutes}
              variant={selected === minutes && !showCustom ? 'default' : 'outline'}
              className="min-h-[44px] min-w-[44px]"
              onClick={() => handlePresetClick(minutes)}
              data-testid={`goal-preset-${minutes}`}
            >
              {minutes} min
            </Button>
          ))}
          <Button
            variant={showCustom ? 'default' : 'outline'}
            className="min-h-[44px] min-w-[44px]"
            onClick={handleCustomClick}
            data-testid="goal-preset-custom"
          >
            Custom
          </Button>
        </div>

        {showCustom && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={480}
              placeholder="Minutes"
              value={customValue}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="w-28"
              aria-label="Custom goal in minutes"
              data-testid="goal-custom-input"
            />
            <span className="text-sm text-muted-foreground">minutes per day</span>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={selected === null || isSaving}
          className="w-full min-h-[44px]"
          data-testid="goal-confirm-button"
        >
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm Goal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
