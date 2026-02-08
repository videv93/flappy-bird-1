'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';
import { getPusherClient } from '@/lib/pusher-client';
import { getUnreadKudosCount } from '@/actions/social/getUnreadKudosCount';
import { useNotificationStore, type KudosEvent } from '@/stores/useNotificationStore';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();
  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getPusherClient>>['subscribe']
  > | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    let isMounted = true;

    // Fetch initial unread count
    getUnreadKudosCount().then((result) => {
      if (isMounted && result.success) {
        useNotificationStore.getState().setUnreadCount(result.data.count);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    try {
      const channel = pusher.subscribe(`private-user-${userId}`);
      channelRef.current = channel;

      channel.bind('kudos:received', (data: KudosEvent) => {
        const store = useNotificationStore.getState();
        store.incrementUnread();
        store.queueToast(data);
      });
    } catch (error) {
      console.error('Pusher subscription error:', error);
    }

    return () => {
      const pusher = getPusherClient();
      if (pusher && userId) {
        try {
          channelRef.current?.unbind('kudos:received');
          pusher.unsubscribe(`private-user-${userId}`);
        } catch (error) {
          console.error('Pusher cleanup error:', error);
        }
      }
      channelRef.current = null;
    };
  }, [isAuthenticated, userId]);

  // Handle toast flushing
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = useNotificationStore.subscribe((state, prevState) => {
      // Detect when pendingToasts is cleared (flush happened)
      if (
        prevState.pendingToasts.length > 0 &&
        state.pendingToasts.length === 0
      ) {
        const events = prevState.pendingToasts;
        if (events.length === 0) return;

        const message =
          events.length === 1
            ? `${events[0].fromUserName} sent you kudos!`
            : `${events.length} people sent you kudos`;

        toast(message, {
          duration: 4000,
          className: 'border-l-4 border-l-[#eab308]',
          action: {
            label: 'View',
            onClick: () => router.push('/activity'),
          },
        });
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, router]);

  return <>{children}</>;
}
