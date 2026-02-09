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

      channel.bind(
        'author:claim-approved',
        (data: { bookTitle: string; claimId: string }) => {
          toast(
            `You're now verified as the author of ${data.bookTitle}!`,
            {
              duration: 6000,
              className: 'border-l-4 border-l-[#eab308]',
            }
          );
        }
      );

      channel.bind(
        'author:claim-rejected',
        (data: { bookTitle: string; claimId: string }) => {
          toast(
            `Your author claim for ${data.bookTitle} was not approved.`,
            { duration: 6000 }
          );
        }
      );

      channel.bind(
        'moderation:content-removed',
        (data: { contentType: string; violationType: string }) => {
          const contentLabel =
            data.contentType === 'PROFILE_BIO'
              ? 'bio'
              : data.contentType === 'READING_ROOM_DESCRIPTION'
                ? 'room description'
                : 'content';
          const violationLabel = data.violationType.toLowerCase().replace('_', ' ');
          toast(
            `Your ${contentLabel} was removed for violating our ${violationLabel} policy.`,
            { duration: 6000 }
          );
        }
      );

      channel.bind(
        'moderation:content-restored',
        () => {
          toast('Your content has been restored.', { duration: 6000 });
        }
      );
    } catch (error) {
      console.error('Pusher subscription error:', error);
    }

    return () => {
      const pusher = getPusherClient();
      if (pusher && userId) {
        try {
          channelRef.current?.unbind('kudos:received');
          channelRef.current?.unbind('author:claim-approved');
          channelRef.current?.unbind('author:claim-rejected');
          channelRef.current?.unbind('moderation:content-removed');
          channelRef.current?.unbind('moderation:content-restored');
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
