'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { usePresenceStore, type PresenceMember } from '@/stores/usePresenceStore';
import { getRoomMembers } from '@/actions/presence/getRoomMembers';

interface PresenceEvent {
  type: 'subscription_succeeded' | 'member_added' | 'member_removed' | 'subscription_error' | 'polling_fallback' | 'poll_update';
  detail: string;
  memberId?: string;
}

interface UsePresenceChannelOptions {
  channelId: string | null;
  enabled?: boolean;
  pollingIntervalMs?: number;
  onEvent?: (event: PresenceEvent) => void;
}

export function usePresenceChannel({
  channelId,
  enabled = true,
  pollingIntervalMs = 30000,
  onEvent,
}: UsePresenceChannelOptions) {
  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getPusherClient>>['subscribe']
  > | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const {
    members,
    currentChannel,
    isConnected,
    connectionMode,
    joinChannel,
    leaveChannel,
    setMembers,
    addMember,
    removeMember,
    setConnectionMode,
  } = usePresenceStore();

  const startPolling = useCallback(
    (bookId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      const poll = async () => {
        const result = await getRoomMembers(bookId);
        if (result.success) {
          const memberMap = new Map<string, PresenceMember>();
          for (const m of result.data) {
            memberMap.set(m.id, m);
          }
          setMembers(memberMap);
          onEventRef.current?.({ type: 'poll_update', detail: `Polled ${result.data.length} members` });
        }
      };

      poll();
      pollingRef.current = setInterval(poll, pollingIntervalMs);
    },
    [pollingIntervalMs, setMembers]
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!channelId || !enabled) return;

    const channelName = `presence-room-${channelId}`;
    const pusher = getPusherClient();

    if (!pusher) {
      joinChannel(channelName);
      setConnectionMode('polling');
      onEventRef.current?.({ type: 'polling_fallback', detail: 'Pusher not available, using polling' });
      startPolling(channelId);
      return () => {
        stopPolling();
        leaveChannel();
      };
    }

    try {
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;
      joinChannel(channelName);

      channel.bind(
        'pusher:subscription_succeeded',
        (data: { members: Record<string, { name: string; avatarUrl: string | null }> }) => {
          const memberMap = new Map<string, PresenceMember>();
          for (const [id, info] of Object.entries(data.members)) {
            memberMap.set(id, { id, name: info.name, avatarUrl: info.avatarUrl });
          }
          setMembers(memberMap);
          setConnectionMode('realtime');
          onEventRef.current?.({
            type: 'subscription_succeeded',
            detail: `Subscribed with ${Object.keys(data.members).length} members`,
          });
        }
      );

      channel.bind(
        'pusher:member_added',
        (member: { id: string; info: { name: string; avatarUrl: string | null } }) => {
          addMember({ id: member.id, name: member.info.name, avatarUrl: member.info.avatarUrl });
          onEventRef.current?.({
            type: 'member_added',
            detail: `${member.info.name} joined`,
            memberId: member.id,
          });
        }
      );

      channel.bind('pusher:member_removed', (member: { id: string }) => {
        removeMember(member.id);
        onEventRef.current?.({
          type: 'member_removed',
          detail: `Member ${member.id} left`,
          memberId: member.id,
        });
      });

      channel.bind('pusher:subscription_error', () => {
        setConnectionMode('polling');
        onEventRef.current?.({ type: 'subscription_error', detail: 'Subscription failed, falling back to polling' });
        startPolling(channelId);
      });
    } catch {
      setConnectionMode('polling');
      onEventRef.current?.({ type: 'polling_fallback', detail: 'Pusher error, falling back to polling' });
      startPolling(channelId);
    }

    return () => {
      stopPolling();
      if (pusher && channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
      }
      channelRef.current = null;
      leaveChannel();
    };
  }, [
    channelId,
    enabled,
    joinChannel,
    leaveChannel,
    setMembers,
    addMember,
    removeMember,
    setConnectionMode,
    startPolling,
    stopPolling,
  ]);

  return {
    members,
    currentChannel,
    isConnected,
    connectionMode,
    memberCount: members.size,
  };
}

export type { PresenceEvent };
