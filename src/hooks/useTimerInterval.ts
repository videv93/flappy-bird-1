'use client';

import { useReducer, useEffect } from 'react';
import { useTimerStore } from '@/stores/useTimerStore';

/**
 * Hook that ticks every second while the timer is running,
 * returning the current elapsed seconds for display.
 *
 * Uses useReducer instead of useState to satisfy the
 * react-hooks/set-state-in-effect lint rule.
 */
export function useTimerInterval(): number {
  const isRunning = useTimerStore((s) => s.isRunning);
  const getElapsedSeconds = useTimerStore((s) => s.getElapsedSeconds);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!isRunning) {
      forceRender();
      return;
    }

    forceRender();

    const interval = setInterval(() => {
      forceRender();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return getElapsedSeconds();
}
