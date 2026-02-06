'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useOfflineStore } from '@/stores/useOfflineStore';
import { saveReadingSession } from '@/actions/sessions';

/**
 * Hook that syncs offline-queued reading sessions when the browser comes back online.
 * Mount this in AppShell or root layout so it runs app-wide.
 */
export function useOfflineSync() {
  const pendingSessions = useOfflineStore((s) => s.pendingSessions);
  const removeSession = useOfflineStore((s) => s.removeSession);
  const hasHydrated = useOfflineStore((s) => s._hasHydrated);

  const syncSessions = useCallback(async () => {
    if (!hasHydrated || pendingSessions.length === 0) return;

    let synced = 0;

    // Process from last to first so index removal is safe
    for (let i = pendingSessions.length - 1; i >= 0; i--) {
      const session = pendingSessions[i];
      const result = await saveReadingSession({
        bookId: session.bookId,
        duration: session.duration,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      });

      if (result.success) {
        removeSession(i);
        synced++;
      }
    }

    if (synced > 0) {
      toast.success(
        `${synced} offline session${synced > 1 ? 's' : ''} synced!`
      );
    }
  }, [hasHydrated, pendingSessions, removeSession]);

  useEffect(() => {
    // Sync on mount if online and has pending sessions
    if (navigator.onLine && pendingSessions.length > 0) {
      syncSessions();
    }

    const handleOnline = () => {
      syncSessions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncSessions, pendingSessions.length]);
}
