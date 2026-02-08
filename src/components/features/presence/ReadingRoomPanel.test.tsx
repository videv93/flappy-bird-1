import { render, screen, waitFor } from '@testing-library/react';
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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

// Mock the usePresenceChannel hook
const mockUsePresenceChannel = vi.fn();
vi.mock('@/hooks/usePresenceChannel', () => ({
  usePresenceChannel: (...args: unknown[]) => mockUsePresenceChannel(...args),
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
    expect(mockUsePresenceChannel).toHaveBeenCalledWith({
      channelId: null,
      enabled: false,
    });
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
    expect(links[0]).toHaveAttribute('href', '/profile/user-0');
    expect(links[1]).toHaveAttribute('href', '/profile/user-1');
  });
});
