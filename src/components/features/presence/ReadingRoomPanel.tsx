'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { usePresenceChannel } from '@/hooks/usePresenceChannel';
import type { AuthorJoinData } from '@/hooks/usePresenceChannel';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { usePresenceStore } from '@/stores/usePresenceStore';
import { joinRoom, leaveRoom, getRoomMembers } from '@/actions/presence';
import { updatePresenceHeartbeat } from '@/actions/presence/updatePresenceHeartbeat';
import { getAuthorPresence } from '@/actions/authors/getAuthorPresence';
import type { AuthorPresenceData } from '@/actions/authors/getAuthorPresence';
import { PresenceAvatarStack } from './PresenceAvatarStack';
import { OccupantDetailSheet } from './OccupantDetailSheet';
import { AuthorShimmerBadge } from './AuthorShimmerBadge';
import { AuthorChatPanel } from '@/components/features/author-chat';
import { deleteAuthorChatChannel } from '@/actions/stream';

interface ReadingRoomPanelProps {
  bookId: string;
  className?: string;
}

export function ReadingRoomPanel({ bookId, className }: ReadingRoomPanelProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showReturnMessage, setShowReturnMessage] = useState(false);
  const [authorPresence, setAuthorPresence] = useState<AuthorPresenceData | null>(null);
  const [authorAnnouncement, setAuthorAnnouncement] = useState('');
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authorPresenceRef = useRef(authorPresence);
  const connectionModeRef = useRef<string>('disconnected');
  const activeChatChannelRef = useRef<string | null>(null);
  useEffect(() => {
    authorPresenceRef.current = authorPresence;
  });

  const handleAuthorJoin = useCallback((data: AuthorJoinData) => {
    setAuthorPresence({
      isCurrentlyPresent: true,
      authorName: data.authorName,
      authorId: data.authorId,
      lastSeenAt: new Date(),
    });
    // Only show toast in realtime mode (AC #3: polling users discover naturally)
    // Don't show the toast to the author themselves
    if (connectionModeRef.current === 'realtime' && data.authorId !== userId) {
      setAuthorAnnouncement(`${data.authorName}, the author, has joined the reading room`);
      // Clear announcement after 2s so screen readers don't re-announce on re-render
      setTimeout(() => setAuthorAnnouncement(''), 2000);
      toast(`✨ ${data.authorName} just joined the reading room!`, {
        duration: 6000,
        className: 'border-l-4 border-l-[var(--author-shimmer,#eab308)]',
      });
    }
  }, [userId]);

  const handleAuthorLeave = useCallback((data: { authorId: string }) => {
    setAuthorPresence({
      isCurrentlyPresent: false,
      authorName: authorPresenceRef.current?.authorName ?? 'The author',
      authorId: data.authorId,
      lastSeenAt: new Date(),
    });
    setAuthorAnnouncement('');
  }, []);

  const { members, connectionMode, memberCount } = usePresenceChannel({
    channelId: isJoined ? bookId : null,
    enabled: isJoined,
    onAuthorJoin: handleAuthorJoin,
    onAuthorLeave: handleAuthorLeave,
  });

  useEffect(() => {
    connectionModeRef.current = connectionMode;
  }, [connectionMode]);

  // Guard against stale cross-book data in the global presence store
  const expectedChannel = `presence-room-${bookId}`;
  const currentChannel = usePresenceStore((s) => s.currentChannel);
  const isStaleData = currentChannel !== null && currentChannel !== expectedChannel;
  const safeMemberCount = isStaleData ? 0 : memberCount;
  const safeMembers = isStaleData ? new Map() : members;
  const memberCountRef = useRef(safeMemberCount);
  useEffect(() => {
    memberCountRef.current = safeMemberCount;
  });

  // Heartbeat: update lastActiveAt every 5 minutes while joined
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    updatePresenceHeartbeat(bookId);
    heartbeatRef.current = setInterval(() => {
      updatePresenceHeartbeat(bookId);
    }, 5 * 60 * 1000);
  }, [bookId]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Idle timeout: auto-leave after 30 minutes of inactivity
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const cleanupActiveChatChannel = useCallback(async () => {
    const channelId = activeChatChannelRef.current;
    if (channelId) {
      activeChatChannelRef.current = null;
      await deleteAuthorChatChannel(channelId).catch(() => {});
    }
  }, []);

  const handleIdleTimeout = useCallback(async () => {
    try {
      await cleanupActiveChatChannel();
      await leaveRoom(bookId);
      setShowReturnMessage(memberCountRef.current <= 1);
      setIsJoined(false);
      toast.info("You've been idle for 30 minutes and left the reading room.");
    } catch {
      // Silently handle — user may have already left
    }
  }, [bookId, cleanupActiveChatChannel]);

  const { reset: resetIdleTimer } = useIdleTimeout(
    handleIdleTimeout,
    IDLE_TIMEOUT_MS,
    isJoined,
  );

  // Reset idle timer when heartbeat fires (heartbeat confirms the page is open)
  const startHeartbeatWithIdleReset = useCallback(() => {
    startHeartbeat();
    resetIdleTimer();
  }, [startHeartbeat, resetIdleTimer]);

  useEffect(() => {
    if (isJoined) {
      startHeartbeatWithIdleReset();
    } else {
      stopHeartbeat();
    }
    return stopHeartbeat;
  }, [isJoined, startHeartbeatWithIdleReset, stopHeartbeat]);

  // Check if user has existing active presence on mount
  useEffect(() => {
    getRoomMembers(bookId).then((result) => {
      if (result.success && result.data.some((m: any) => m.id === userId)) {
        setIsJoined(true);
      }
    }).catch(() => {});
  }, [bookId, userId]);

  // Fetch author presence on mount and when join state changes
  useEffect(() => {
    getAuthorPresence(bookId).then((result) => {
      if (result.success) {
        setAuthorPresence(result.data);
      }
    }).catch(() => {});
  }, [bookId, isJoined]);

  // Close sheet when member count drops to sole reader
  useEffect(() => {
    if (safeMemberCount <= 1) {
      setIsSheetOpen(false);
    }
  }, [safeMemberCount]);

  const handleJoin = async () => {
    setIsLoading(true);
    try {
      const result = await joinRoom(bookId);
      if (result.success) {
        setIsJoined(true);
        setShowReturnMessage(false);
      } else {
        toast.error('Failed to join reading room');
      }
      setIsLoading(false);
    } catch {
      toast.error('Something went wrong');
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await cleanupActiveChatChannel();
      const result = await leaveRoom(bookId);
      if (result.success) {
        setShowReturnMessage(safeMemberCount <= 1);
        setIsJoined(false);
      } else {
        toast.error('Failed to leave reading room');
      }
      setIsLoading(false);
    } catch {
      toast.error('Something went wrong');
      setIsLoading(false);
    }
  };

  const connectionIndicator = () => {
    if (!isJoined) return null;
    switch (connectionMode) {
      case 'realtime':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600" data-testid="connection-live">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Live
          </span>
        );
      case 'polling':
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600" data-testid="connection-delayed">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Delayed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-gray-400" data-testid="connection-offline">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true" />
            Offline
          </span>
        );
    }
  };

  // Derive author-in-room from live members or server data
  const authorInRoom = authorPresence?.isCurrentlyPresent || Array.from(safeMembers.values()).some((m) => m.isAuthor);

  // Not joined state (preview)
  if (!isJoined) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-amber-50/50 p-3',
          authorInRoom
            ? 'border-[var(--author-shimmer,#eab308)] shadow-[0_0_12px_var(--author-shimmer,#eab308)]'
            : 'border-amber-200',
          className
        )}
        data-testid="reading-room-panel"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="text-sm font-medium text-amber-800">
              Reading Room
            </span>
          </div>
          <Button
            size="sm"
            className="h-9 min-w-[88px] bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleJoin}
            disabled={isLoading}
            data-testid="join-room-button"
            aria-label="Join reading room"
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </Button>
        </div>
        {authorInRoom && (
          <p
            className="text-sm font-medium text-amber-700 mt-2"
            data-testid="author-here-indicator"
            aria-live="polite"
          >
            Author is here!
          </p>
        )}
        {!authorInRoom && authorPresence && (
          <div className="mt-2">
            <AuthorShimmerBadge
              authorName={authorPresence.authorName}
              lastSeenAt={authorPresence.lastSeenAt ?? new Date()}
              isLive={false}
              authorId={authorPresence.authorId}
            />
          </div>
        )}
        {showReturnMessage && !authorPresence && (
          <p
            className="text-sm text-amber-600 italic mt-2"
            data-testid="return-message"
          >
            Be the first to return!
          </p>
        )}
      </div>
    );
  }

  // Joined state
  const isSoleReader = safeMemberCount <= 1;
  const showSheet = safeMemberCount > 1;

  return (
    <div
      className={cn(
        'rounded-lg border bg-amber-50/50 p-3 space-y-2',
        authorInRoom
          ? 'border-[var(--author-shimmer,#eab308)] shadow-[0_0_12px_var(--author-shimmer,#eab308)]'
          : 'border-amber-200',
        className
      )}
      data-testid="reading-room-panel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <span className="text-sm font-medium text-amber-800">
            Reading Room
          </span>
          {connectionIndicator()}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-w-[88px] border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={handleLeave}
          disabled={isLoading}
          data-testid="leave-room-button"
          aria-label="Leave reading room"
        >
          {isLoading ? 'Leaving...' : 'Leave Room'}
        </Button>
      </div>

      {authorInRoom && (
        <p
          className="text-sm font-medium text-amber-700"
          data-testid="author-here-indicator"
          aria-live="polite"
        >
          Author is here!
        </p>
      )}

      {isSoleReader ? (
        <p
          className="text-sm text-amber-600 italic"
          data-testid="empty-room-message"
        >
          You&apos;re the first reader here!
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <PresenceAvatarStack
            members={safeMembers}
            onClick={() => setIsSheetOpen(true)}
            aria-expanded={isSheetOpen}
          />
          <span className="text-xs text-amber-600" data-testid="reader-count">
            {safeMemberCount} {safeMemberCount === 1 ? 'reader' : 'readers'}
          </span>
        </div>
      )}

      {!authorInRoom && authorPresence && (
        <div className="mt-1">
          <AuthorShimmerBadge
            authorName={authorPresence.authorName}
            lastSeenAt={authorPresence.lastSeenAt ?? new Date()}
            isLive={false}
            authorId={authorPresence.authorId}
          />
        </div>
      )}

      <AuthorChatPanel
        bookId={bookId}
        authorPresent={authorInRoom}
        authorUserId={authorPresence?.authorId}
        authorName={authorPresence?.authorName}
        onChannelCleanup={() => { activeChatChannelRef.current = null; }}
      />

      {showSheet && (
        <OccupantDetailSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          members={safeMembers}
        />
      )}

      {/* Screen reader announcement for author join events */}
      <span
        className="sr-only"
        aria-live="polite"
        data-testid="author-join-announcement"
      >
        {authorAnnouncement}
      </span>
    </div>
  );
}
