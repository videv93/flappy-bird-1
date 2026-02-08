import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PresenceTestPage from './page';

// Mock auth
const mockUseAuth = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock presence hook
const mockUsePresenceChannel = vi.fn();
vi.mock('@/hooks/usePresenceChannel', () => ({
  usePresenceChannel: (opts: unknown) => mockUsePresenceChannel(opts),
}));

// Mock server actions
vi.mock('@/actions/presence', () => ({
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
}));

import { joinRoom } from '@/actions/presence';
const mockJoinRoom = joinRoom as ReturnType<typeof vi.fn>;

describe('PresenceTestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-1', name: 'Test User', image: null } },
    });
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: null,
      isConnected: false,
      connectionMode: 'disconnected',
      memberCount: 0,
    });
  });

  it('renders page title', () => {
    render(<PresenceTestPage />);
    expect(screen.getByText('Presence Channel Spike')).toBeInTheDocument();
  });

  it('displays current user info', () => {
    render(<PresenceTestPage />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('shows disconnected status initially', () => {
    render(<PresenceTestPage />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows Join Room button when not in a room', () => {
    render(<PresenceTestPage />);
    expect(screen.getByText('Join Room')).toBeInTheDocument();
  });

  it('calls joinRoom on button click', async () => {
    mockJoinRoom.mockResolvedValue({ success: true, data: { id: 'p1' } });
    render(<PresenceTestPage />);

    fireEvent.click(screen.getByText('Join Room'));

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith('test');
    });
  });

  it('shows Leave Room button after joining', async () => {
    mockJoinRoom.mockResolvedValue({ success: true, data: { id: 'p1' } });
    render(<PresenceTestPage />);

    fireEvent.click(screen.getByText('Join Room'));

    await waitFor(() => {
      expect(screen.getByText('Leave Room')).toBeInTheDocument();
    });
  });

  it('displays error when join fails', async () => {
    mockJoinRoom.mockResolvedValue({ success: false, error: 'Room full' });
    render(<PresenceTestPage />);

    fireEvent.click(screen.getByText('Join Room'));

    await waitFor(() => {
      expect(screen.getByText('Room full')).toBeInTheDocument();
    });
  });

  it('shows member list when members exist', () => {
    const members = new Map([
      ['u1', { id: 'u1', name: 'Alice', avatarUrl: null }],
      ['u2', { id: 'u2', name: 'Bob', avatarUrl: 'bob.jpg' }],
    ]);
    mockUsePresenceChannel.mockReturnValue({
      members,
      currentChannel: 'presence-room-test',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 2,
    });

    render(<PresenceTestPage />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('shows realtime connection badge', () => {
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: 'presence-room-test',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 0,
    });

    render(<PresenceTestPage />);
    expect(screen.getByText('Real-time (Pusher)')).toBeInTheDocument();
  });

  it('shows polling connection badge', () => {
    mockUsePresenceChannel.mockReturnValue({
      members: new Map(),
      currentChannel: 'presence-room-test',
      isConnected: true,
      connectionMode: 'polling',
      memberCount: 0,
    });

    render(<PresenceTestPage />);
    expect(screen.getByText('Polling (30s)')).toBeInTheDocument();
  });

  it('has accessible member count label', () => {
    mockUsePresenceChannel.mockReturnValue({
      members: new Map([['u1', { id: 'u1', name: 'Alice', avatarUrl: null }]]),
      currentChannel: 'presence-room-test',
      isConnected: true,
      connectionMode: 'realtime',
      memberCount: 1,
    });

    render(<PresenceTestPage />);
    expect(screen.getByLabelText('1 reader in this room')).toBeInTheDocument();
  });
});
