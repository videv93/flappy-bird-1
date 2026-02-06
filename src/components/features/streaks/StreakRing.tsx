'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Snowflake, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const SIZE_CONFIG = {
  sm: { dimension: 32, radius: 12, strokeWidth: 3, fontSize: 'text-xs', iconSize: 10 },
  md: { dimension: 48, radius: 20, strokeWidth: 4, fontSize: 'text-sm', iconSize: 14 },
  lg: { dimension: 80, radius: 36, strokeWidth: 5, fontSize: 'text-xl', iconSize: 22 },
} as const;

const MILESTONE_DAYS = [7, 30, 100] as const;

export interface StreakRingProps {
  currentStreak: number;
  minutesRead: number;
  goalMinutes: number;
  freezeUsedToday?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakRing({
  currentStreak,
  minutesRead,
  goalMinutes,
  freezeUsedToday = false,
  size = 'md',
}: StreakRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const milestoneToastedRef = useRef(false);
  const milestoneStoreRef = useRef({ visible: false, listeners: new Set<() => void>() });

  // Stable subscribe function for useSyncExternalStore
  const subscribe = useCallback((cb: () => void) => {
    milestoneStoreRef.current.listeners.add(cb);
    return () => { milestoneStoreRef.current.listeners.delete(cb); };
  }, []);
  const getSnapshot = useCallback(() => milestoneStoreRef.current.visible, []);

  const showMilestone = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const config = SIZE_CONFIG[size];
  const progressPercent = goalMinutes > 0 ? Math.min((minutesRead / goalMinutes) * 100, 100) : 0;
  const goalMet = minutesRead >= goalMinutes && goalMinutes > 0;
  // Frozen state only applies when goal is NOT met — if user reads on a freeze day, show green
  const showFrozen = freezeUsedToday && !goalMet;
  const isMilestone = MILESTONE_DAYS.includes(currentStreak as (typeof MILESTONE_DAYS)[number]);
  const minutesToGo = Math.max(goalMinutes - minutesRead, 0);

  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  // Determine ring color: goal-met (green) takes priority over frozen (blue)
  const ringColor = goalMet
    ? 'var(--streak-success)'
    : showFrozen
      ? 'var(--streak-frozen)'
      : 'var(--warm-amber)';

  // Milestone celebration — toast + animation via external store
  useEffect(() => {
    if (goalMet && isMilestone && !milestoneToastedRef.current) {
      milestoneToastedRef.current = true;
      toast.success(`Amazing! ${currentStreak}-day streak!`);
      if (!prefersReducedMotion) {
        const store = milestoneStoreRef.current;
        store.visible = true;
        store.listeners.forEach((l) => l());
        const timer = setTimeout(() => {
          store.visible = false;
          store.listeners.forEach((l) => l());
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [goalMet, isMilestone, currentStreak, prefersReducedMotion]);

  // Build aria-label
  const ariaLabel = `Reading streak: ${currentStreak} days. ${minutesRead} minutes of ${goalMinutes} minute goal completed today.`;

  // Determine status text: goal-met takes priority over frozen
  const statusText = goalMet
    ? undefined
    : showFrozen
      ? 'Freeze day'
      : `${minutesToGo} min to go`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className="relative inline-flex items-center justify-center"
        style={{ width: config.dimension, height: config.dimension }}
      >
        <svg
          width={config.dimension}
          height={config.dimension}
          className="-rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={config.radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={config.radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: prefersReducedMotion ? offset : circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.5, ease: 'easeOut' }
            }
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {goalMet ? (
            <Check
              size={config.iconSize}
              style={{ color: 'var(--streak-success)' }}
              aria-hidden="true"
            />
          ) : showFrozen ? (
            <Snowflake
              size={config.iconSize}
              style={{ color: 'var(--streak-frozen)' }}
              aria-hidden="true"
            />
          ) : (
            <span className={`font-bold ${config.fontSize}`} style={{ color: ringColor }}>
              {currentStreak}
            </span>
          )}
        </div>

        {/* Milestone sparkle */}
        {showMilestone && !prefersReducedMotion && (
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Sparkles
              size={config.iconSize}
              style={{ color: 'var(--warm-amber)' }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </div>

      {/* Status text below ring */}
      {statusText && (
        <span className="text-xs text-muted-foreground">{statusText}</span>
      )}
    </div>
  );
}
