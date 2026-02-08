'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import type { PresenceEvent } from '@/hooks/usePresenceChannel';
import { joinRoom, leaveRoom } from '@/actions/presence';
import { useAuth } from '@/components/providers/AuthProvider';
import type { PresenceMember } from '@/stores/usePresenceStore';

interface EventLog {
  id: number;
  timestamp: string;
  type: string;
  detail: string;
}

export default function PresenceTestPage() {
  const { session } = useAuth();
  const [bookId, setBookId] = useState('test');
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const eventCounter = useRef(0);

  const addLog = useCallback((type: string, detail: string) => {
    eventCounter.current += 1;
    setEventLog((prev) => [
      {
        id: eventCounter.current,
        timestamp: new Date().toLocaleTimeString(),
        type,
        detail,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const handlePresenceEvent = useCallback(
    (event: PresenceEvent) => {
      const typeMap: Record<PresenceEvent['type'], string> = {
        subscription_succeeded: 'SUBSCRIBED',
        member_added: 'MEMBER_ADDED',
        member_removed: 'MEMBER_REMOVED',
        subscription_error: 'SUB_ERROR',
        polling_fallback: 'FALLBACK',
        poll_update: 'POLL',
      };
      addLog(typeMap[event.type] || event.type, event.detail);
    },
    [addLog]
  );

  const { members, currentChannel, isConnected, connectionMode, memberCount } =
    usePresenceChannel({
      channelId: activeBookId,
      enabled: !!activeBookId,
      onEvent: handlePresenceEvent,
    });

  const handleJoin = async () => {
    setJoinError(null);
    const result = await joinRoom(bookId);
    if (result.success) {
      setActiveBookId(bookId);
      addLog('JOIN', `Joined room for book: ${bookId}`);
    } else {
      setJoinError(result.error);
      addLog('ERROR', `Join failed: ${result.error}`);
    }
  };

  const handleLeave = async () => {
    if (!activeBookId) return;
    const result = await leaveRoom(activeBookId);
    if (result.success) {
      addLog('LEAVE', `Left room for book: ${activeBookId}`);
      setActiveBookId(null);
    } else {
      addLog('ERROR', `Leave failed: ${result.error}`);
    }
  };

  const connectionBadge = () => {
    switch (connectionMode) {
      case 'realtime':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Real-time (Pusher)
          </span>
        );
      case 'polling':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            Polling (30s)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Presence Channel Spike</h1>
        <p className="text-sm text-muted-foreground">
          Dev-only test page for validating Pusher presence channels
        </p>
      </div>

      {/* User Info */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Current User</h2>
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {session?.user?.name?.[0] || '?'}
            </div>
          )}
          <div>
            <p className="font-medium">{session?.user?.name || 'Anonymous'}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.id}</p>
          </div>
        </div>
      </section>

      {/* Connection Status */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Connection Status</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mode:</span>
            {connectionBadge()}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Channel:</span>
            <code className="text-sm">{currentChannel || 'none'}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Connected:</span>
            <span className="text-sm">{isConnected ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </section>

      {/* Join / Leave Controls */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Room Controls</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="bookId" className="mb-1 block text-sm font-medium">
              Book ID
            </label>
            <input
              id="bookId"
              type="text"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              disabled={!!activeBookId}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter book ID..."
            />
          </div>
          {!activeBookId ? (
            <button
              onClick={handleJoin}
              disabled={!bookId}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Join Room
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Room
            </button>
          )}
        </div>
        {joinError && (
          <p className="mt-2 text-sm text-destructive">{joinError}</p>
        )}
      </section>

      {/* Member List */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">
          Room Members{' '}
          <span
            className="text-sm font-normal text-muted-foreground"
            aria-label={`${memberCount} ${memberCount === 1 ? 'reader' : 'readers'} in this room`}
          >
            ({memberCount})
          </span>
        </h2>
        {memberCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeBookId
              ? 'No other members in this room yet.'
              : 'Join a room to see members.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {Array.from(members.values()).map((member: PresenceMember) => (
              <li key={member.id} className="flex items-center gap-3">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {member.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.id}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Event Log */}
      <section className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Event Log</h2>
          <button
            onClick={() => setEventLog([])}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
        {eventLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {eventLog.map((event) => (
              <div
                key={event.id}
                className="flex gap-2 text-sm"
              >
                <span className="shrink-0 text-muted-foreground">
                  {event.timestamp}
                </span>
                <span
                  className={`shrink-0 font-mono text-xs ${
                    event.type === 'ERROR'
                      ? 'text-destructive'
                      : event.type === 'JOIN'
                        ? 'text-green-600'
                        : event.type === 'LEAVE'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                  }`}
                >
                  [{event.type}]
                </span>
                <span>{event.detail}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
