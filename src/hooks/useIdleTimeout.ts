'use client';

import { useCallback, useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Hook that tracks user activity and fires a callback after a configurable
 * idle timeout. Listens for mousemove, keydown, touchstart, and scroll events
 * on the document.
 *
 * @param callback - Function to call when the user has been idle for timeoutMs
 * @param timeoutMs - Idle timeout duration in milliseconds
 * @param enabled - Whether the idle timeout is active
 * @returns Object with a `reset` function to manually restart the timer
 */
export function useIdleTimeout(
  callback: () => void,
  timeoutMs: number,
  enabled: boolean,
): { reset: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  const reset = useCallback(() => {
    if (enabled) {
      startTimer();
    }
  }, [enabled, startTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    const handleActivity = () => {
      startTimer();
    };

    // Start the initial timer
    startTimer();

    // Attach activity listeners
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, startTimer, clearTimer]);

  return { reset };
}
