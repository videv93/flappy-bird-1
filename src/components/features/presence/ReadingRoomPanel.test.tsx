import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadingRoomPanel } from './ReadingRoomPanel';
import type { PresenceMember } from '@/stores/usePresenceStore';

// Mock framer-motion (needed because PresenceAvatarStack imports it)
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  motion: {
    div: ({
      children,
      animate,
      transition,
      layout,
      initial,
      exit,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

// Mock sonner - toast is a callable function AND has method properties
vi.mock('sonner', () => {
  const fn = vi.fn() as ReturnType<typeof vi.fn> & {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
  fn.error = vi.fn();
  fn.success = vi.fn();
  fn.info = vi.fn();
  return { toast: fn };
});

import { toast } from 'sonner';
const mockToast = toast as unknown as ReturnType<typeof vi.fn> & {
  error: ReturnType<typeof vi.fn>;
  success: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

// Mock auth-client
const mockUseSession = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

// Mock usePresenceStore
const mockUsePresenceStore = vi.fn();
vi.mock('@/stores/usePresenceStore', () => ({
  usePresenceStore: (selector: (s: Record<string, unknown>) => unknown) =>
    mockUsePresenceStore(selector),
}));

// Mock the usePresenceChannel hook — capture callbacks for testing
let capturedOnAuthorJoin: ((data: { authorId: string; authorName: string }) => void) | undefined;
let capturedOnAuthorLeave: ((data: { authorId: string }) => void) | undefined;
const mockUsePresenceChannel = vi.fn();
vi.mock('@/hooks/usePresenceChannel', () => ({
  usePresenceChannel: (...args: unknown[]) => {
    const opts = args[0] as Record<string, unknown> | undefined;
    capturedOnAuthorJoin = opts?.onAuthorJoin as typeof capturedOnAuthorJoin;
    capturedOnAuthorLeave = opts?.onAuthorLeave as typeof capturedOnAuthorLeave;
    return mockUsePresenceChannel(...args);
  },
}));

// Mock useIdleTimeout hook - capture callback to simulate idle timeout in tests
let capturedIdleCallback: (() => void) | null = null;
let capturedIdleEnabled: boolean = false;
const mockIdleReset = vi.fn();
vi.mock('@/hooks/useIdleTimeout', () => ({
  useIdleTimeout: (callback: () => void, _timeoutMs: number, enabled: boolean) => {
    capturedIdleCallback = callback;
    capturedIdleEnabled = enabled;
    return { reset: mockIdleReset };
  },
}));

// Mock server actions
const mockJoinRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockGetRoomMembers = vi.fn();
vi.mock('@/actions/presence', () => ({
  joinRoom: (...args: unknown[]) => mockJoinRoom(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
  getRoomMembers: (...args: unknown[]) => mockGetRoomMembers(...args),
}));

const mockUpdateHeartbeat = vi.fn();
vi.mock('@/actions/presence/updatePresenceHeartbeat', () => ({
  updatePresenceHeartbeat: (...args: unknown[]) => mockUpdateHeartbeat(...args),
}));

const mockGetAuthorPresence = vi.fn();
vi.mock('@/actions/authors/getAuthorPresence', () => ({
  getAuthorPresence: (...args: unknown[]) => mockGetAuthorPresence(...args),
}));

// Mock @/actions/stream (imported by AuthorChatPanel via ReadingRoomPanel)
vi.mock('@/actions/stream', () => ({
  deleteAuthorChatChannel: vi.fn(),
  getBookChannel: vi.fn(),
  generateStreamToken: vi.fn(),
}));

// Mock AuthorChatPanel (imported by ReadingRoomPanel)
vi.mock('@/components/features/author-chat', () => ({
  AuthorChatPanel: ({ authorPresent, authorName }: { authorPresent: boolean; authorName?: string }) =>
    authorPresent ? <div data-testid="author-chat-panel">Chat with {authorName || 'the Author'}</div> : null,
}));

// Mock next/link (needed by OccupantDetailSheet)
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock radix-ui Dialog (used by Sheet component)
vi.mock('radix-ui', () => {
  const Root = ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid="sheet-root">{children}</div> : null);

  const Portal = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );

  const Overlay = (props: Record<string, unknown>) => (
    <div {...props} />
  );

  const Content = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => (
    <div data-testid="sheet-content" {...props}>
      {children}
    </div>
  );

  const Close = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>;

  const Title = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => <h2 {...props}>{children}</h2>;

  const Description = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => <p {...props}>{children}</p>;

  const Trigger = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>;

  return {
    Dialog: {
      Root,
      Portal,
      Overlay,
      Content,
      Close,
      Title,
      Description,
      Trigger,
    },
  };
});

function createMemberMap(count: number): Map<string, PresenceMember> {
  const map = new Map<string, PresenceMember>();
  for (let i = 0; i < count; i++) {
    map.set(`user-${i}`, {
      id: `user-${i}`,
      name: `Reader ${i}`,
      avatarUrl: null,
    });
  }
  return map;
}

describe('ReadingRoomPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'current-user-id' } },
    });
    mockUsePresenceStore.mockImplementation(
      (selector: (s: Record<string, unknown>) => unknown) =>
        selector({ currentChannel: null })
    );
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: null,
      isConnected: false,
      connectionMode: 'disconnected',
      memberCount: 0,
    });
    mockJoinRoom.mockResolvedValue({ success: true, data: { id: 'p1' } });
    mockLeaveRoom.mockResolvedValue({ success: true, data: { leftAt: new Date() } });
    mockUpdateHeartbeat.mockResolvedValue({ success: true, data: { updated: true } });
    mockGetRoomMembers.mockResolvedValue({ success: true, data: [] });
    mockGetAuthorPresence.mockResolvedValue({ success: true, data: null });
  });

  // --- Preview (not joined) state ---

  it('renders preview state with Join Room button', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.getByTestId('reading-room-panel')).toBeInTheDocument();
    expect(screen.getByTestId('join-room-button')).toHaveTextContent('Join Room');
    expect(screen.getByText('Reading Room')).toBeInTheDocument();
  });

  it('does not show connection indicator in preview state', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.queryByTestId('connection-live')).toBeNull();
    expect(screen.queryByTestId('connection-delayed')).toBeNull();
    expect(screen.queryByTestId('connection-offline')).toBeNull();
  });

  it('does not call usePresenceChannel when not joined', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(mockUsePresenceChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: null,
        enabled: false,
      })
    );
  });

  // --- Join action ---

  it('calls joinRoom server action on Join Room click', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    expect(mockJoinRoom).toHaveBeenCalledWith('book-1');
  });

  it('transitions to joined state after successful join', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(1),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 1,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });
  });

  it('shows loading state while joining', async () => {
    const user = userEvent.setup();
    let resolveJoin: (value: unknown) => void;
    mockJoinRoom.mockReturnValue(new Promise((res) => { resolveJoin = res; }));
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    expect(screen.getByTestId('join-room-button')).toHaveTextContent('Joining...');
    expect(screen.getByTestId('join-room-button')).toBeDisabled();
    resolveJoin!({ success: true, data: { id: 'p1' } });
  });

  // --- Leave action ---

  it('calls leaveRoom server action on Leave Room click', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(1),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 1,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('leave-room-button'));
    expect(mockLeaveRoom).toHaveBeenCalledWith('book-1');
  });

  it('transitions back to preview after successful leave', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('leave-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('join-room-button')).toBeInTheDocument();
    });
  });

  // --- Empty room state ---

  it('shows warm empty-room message when user is sole reader', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(1),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 1,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('empty-room-message')).toHaveTextContent(
        "You're the first reader here!"
      );
    });
  });

  it('shows empty-room message when member count is 0', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 0,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('empty-room-message')).toBeInTheDocument();
    });
  });

  // --- Joined with multiple readers ---

  it('shows avatar stack and reader count when multiple readers', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(3),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 3,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('reader-count')).toHaveTextContent('3 readers');
    });
  });

  // --- Connection mode indicators ---

  it('shows Live indicator in realtime mode', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('connection-live')).toHaveTextContent('Live');
    });
  });

  it('shows Delayed indicator in polling mode', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'polling',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('connection-delayed')).toHaveTextContent('Delayed');
    });
  });

  it('shows Offline indicator in disconnected mode', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: null,
      isConnected: false,
      connectionMode: 'disconnected',
      memberCount: 0,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('connection-offline')).toHaveTextContent('Offline');
    });
  });

  // --- Accessibility ---

  it('has accessible join button with aria-label', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.getByTestId('join-room-button')).toHaveAttribute(
      'aria-label',
      'Join reading room'
    );
  });

  it('has accessible leave button with aria-label', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toHaveAttribute(
        'aria-label',
        'Leave reading room'
      );
    });
  });

  // --- Error handling ---

  it('stays in preview state if join fails', async () => {
    const user = userEvent.setup();
    mockJoinRoom.mockResolvedValue({ success: false, error: 'Failed' });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('join-room-button')).toHaveTextContent('Join Room');
    });
  });

  // --- OccupantDetailSheet integration ---

  it('does not show sheet when not joined', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.queryByTestId('sheet-root')).toBeNull();
  });

  it('opens occupant sheet when avatar stack is clicked', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(3),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 3,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /readers in room/i })).toBeInTheDocument();
    });
    // Click the avatar stack to open sheet
    await user.click(screen.getByRole('button', { name: /readers in room/i }));
    await waitFor(() => {
      expect(screen.getByTestId('sheet-root')).toBeInTheDocument();
    });
  });

  it('sheet shows member list with profile links', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /readers in room/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /readers in room/i }));
    await waitFor(() => {
      expect(screen.getByText('Reader 0')).toBeInTheDocument();
      expect(screen.getByText('Reader 1')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/user/user-0');
    expect(links[1]).toHaveAttribute('href', '/user/user-1');
  });

  // --- Last person leaves (Story 5.4, AC #5) ---

  it('shows preview state after last person leaves via manual button', async () => {
    const user = userEvent.setup();
    // Start with the user joined as sole reader
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(1),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 1,
    });
    render(<ReadingRoomPanel bookId="book-1" />);

    // Join first
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    // Leave
    await user.click(screen.getByTestId('leave-room-button'));
    await waitFor(() => {
      // Should transition back to preview with Join Room button
      expect(screen.getByTestId('join-room-button')).toBeInTheDocument();
      expect(screen.queryByTestId('leave-room-button')).toBeNull();
      // Should show "Be the first to return!" since we were the last person
      expect(screen.getByTestId('return-message')).toHaveTextContent('Be the first to return!');
    });
  });

  // --- Idle timeout (Story 5.4) ---

  it('enables idle timeout when joined', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);

    // Not joined - idle should be disabled
    expect(capturedIdleEnabled).toBe(false);

    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(capturedIdleEnabled).toBe(true);
    });
  });

  it('idle timeout triggers leave and shows info toast', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);

    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    // Simulate idle timeout callback
    expect(capturedIdleCallback).not.toBeNull();
    await act(async () => {
      await capturedIdleCallback!();
    });

    expect(mockLeaveRoom).toHaveBeenCalledWith('book-1');
    expect(mockToast.info).toHaveBeenCalledWith(
      "You've been idle for 30 minutes and left the reading room."
    );
  });

  it('idle timeout transitions panel back to preview state', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);

    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    await act(async () => {
      await capturedIdleCallback!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('join-room-button')).toBeInTheDocument();
      expect(screen.getByTestId('return-message')).toHaveTextContent('Be the first to return!');
    });
  });

  it('does not show return message on initial render', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.queryByTestId('return-message')).toBeNull();
  });

  // --- Author presence (Story 5.6) ---

  it('shows "Author is here!" when author is currently present in room', async () => {
    mockGetAuthorPresence.mockResolvedValue({
      success: true,
      data: {
        isCurrentlyPresent: true,
        lastSeenAt: new Date(),
        authorName: 'Jane Author',
        authorId: 'author-1',
      },
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('author-here-indicator')).toHaveTextContent('Author is here!');
    });
  });

  it('shows golden border glow when author is present (preview state)', async () => {
    mockGetAuthorPresence.mockResolvedValue({
      success: true,
      data: {
        isCurrentlyPresent: true,
        lastSeenAt: new Date(),
        authorName: 'Jane Author',
        authorId: 'author-1',
      },
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await waitFor(() => {
      const panel = screen.getByTestId('reading-room-panel');
      expect(panel.className).toContain('border-[var(--author-shimmer,#eab308)]');
      expect(panel.className).toContain('shadow-[0_0_12px_var(--author-shimmer,#eab308)]');
    });
  });

  it('shows AuthorShimmerBadge when author was here recently but not currently present', async () => {
    mockGetAuthorPresence.mockResolvedValue({
      success: true,
      data: {
        isCurrentlyPresent: false,
        lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        authorName: 'Jane Author',
        authorId: 'author-1',
      },
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('author-shimmer-badge')).toBeInTheDocument();
      expect(screen.getByTestId('author-shimmer-text')).toHaveTextContent(/Author was here/);
    });
  });

  it('does not show author indicators when no author presence data', () => {
    mockGetAuthorPresence.mockResolvedValue({ success: true, data: null });
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(screen.queryByTestId('author-here-indicator')).toBeNull();
  });

  it('fetches author presence on mount', () => {
    render(<ReadingRoomPanel bookId="book-1" />);
    expect(mockGetAuthorPresence).toHaveBeenCalledWith('book-1');
  });

  it('shows "Author is here!" in joined state when author is a live member', async () => {
    const user = userEvent.setup();
    const membersWithAuthor = new Map<string, PresenceMember>();
    membersWithAuthor.set('user-1', { id: 'user-1', name: 'Reader', avatarUrl: null });
    membersWithAuthor.set('author-1', { id: 'author-1', name: 'Jane Author', avatarUrl: null, isAuthor: true });
    mockUsePresenceChannel.mockReturnValue({
      members: membersWithAuthor,
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('author-here-indicator')).toHaveTextContent('Author is here!');
    });
  });

  // --- Author join notification (Story 5.7) ---

  it('shows golden toast when onAuthorJoin fires in realtime mode', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    // Simulate the author join event
    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    expect(mockToast).toHaveBeenCalledWith(
      '✨ Jane Author just joined the reading room!',
      expect.objectContaining({
        duration: 6000,
        className: 'border-l-4 border-l-[var(--author-shimmer,#eab308)]',
      })
    );
  });

  it('updates authorPresence state when onAuthorJoin fires', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('author-here-indicator')).toHaveTextContent('Author is here!');
    });
  });

  it('does NOT show toast in polling mode when onAuthorJoin fires', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'polling',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    mockToast.mockClear();

    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    // toast() should NOT have been called (but toast.error etc. may have been called earlier)
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does NOT show toast when onAuthorLeave fires', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    mockGetAuthorPresence.mockResolvedValue({
      success: true,
      data: {
        isCurrentlyPresent: true,
        lastSeenAt: new Date(),
        authorName: 'Jane Author',
        authorId: 'author-1',
      },
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    mockToast.mockClear();
    mockToast.error.mockClear();
    mockToast.info.mockClear();

    act(() => {
      capturedOnAuthorLeave?.({ authorId: 'author-1' });
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('updates authorPresence to "was here" state when onAuthorLeave fires', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    // First simulate author joining
    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('author-here-indicator')).toBeInTheDocument();
    });
    // AuthorChatPanel should appear when author is present
    expect(screen.getByTestId('author-chat-panel')).toBeInTheDocument();
    expect(screen.getByText('Chat with Jane Author')).toBeInTheDocument();

    // Then author leaves
    act(() => {
      capturedOnAuthorLeave?.({ authorId: 'author-1' });
    });

    await waitFor(() => {
      // Author is no longer "here", should show shimmer badge instead
      expect(screen.queryByTestId('author-here-indicator')).toBeNull();
      expect(screen.getByTestId('author-shimmer-badge')).toBeInTheDocument();
    });
    // AuthorChatPanel should disappear when author leaves
    expect(screen.queryByTestId('author-chat-panel')).toBeNull();
  });

  it('renders aria-live announcement when author joins', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    await waitFor(() => {
      const announcement = screen.getByTestId('author-join-announcement');
      expect(announcement).toHaveTextContent('Jane Author, the author, has joined the reading room');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('does NOT show toast when the author themselves joins (self-notification suppressed)', async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'author-1' } },
    });
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    mockToast.mockClear();

    // The author themselves triggers the join event
    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    // Toast should NOT fire for the author themselves
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does NOT show toast in disconnected mode when onAuthorJoin fires', async () => {
    const user = userEvent.setup();
    mockUsePresenceChannel.mockReturnValue({
      members: createMemberMap(2),
      currentChannel: 'presence-room-book-1',
      isConnected: true,
      connectionMode: 'disconnected',
      memberCount: 2,
    });
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(screen.getByTestId('leave-room-button')).toBeInTheDocument();
    });

    mockToast.mockClear();

    act(() => {
      capturedOnAuthorJoin?.({ authorId: 'author-1', authorName: 'Jane Author' });
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('passes onAuthorJoin and onAuthorLeave to usePresenceChannel', async () => {
    const user = userEvent.setup();
    render(<ReadingRoomPanel bookId="book-1" />);
    await user.click(screen.getByTestId('join-room-button'));
    await waitFor(() => {
      expect(capturedOnAuthorJoin).toBeDefined();
      expect(capturedOnAuthorLeave).toBeDefined();
    });
  });
});
