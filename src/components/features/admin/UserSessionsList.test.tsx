import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSessionsList } from './UserSessionsList';

const mockSessions = [
  {
    id: 'sess-1',
    maskedToken: 'abcdefgh...',
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome on Windows',
    deviceInfo: { browser: 'Chrome', os: 'Windows' },
    createdAt: new Date('2026-02-09'),
    expiresAt: new Date('2027-01-01'),
    isActive: true,
  },
  {
    id: 'sess-2',
    maskedToken: 'zyxwvuts...',
    ipAddress: null,
    userAgent: null,
    deviceInfo: { browser: 'Unknown', os: 'Unknown' },
    createdAt: new Date('2026-01-01'),
    expiresAt: new Date('2025-01-01'),
    isActive: false,
  },
];

vi.mock('@/actions/admin/getSessionHistory', () => ({
  getSessionHistory: vi.fn(),
}));

import { getSessionHistory } from '@/actions/admin/getSessionHistory';

const mockGetSessionHistory = getSessionHistory as unknown as ReturnType<typeof vi.fn>;

describe('UserSessionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionHistory.mockResolvedValue({ success: true, data: mockSessions });
  });

  it('shows confirmation dialog before loading sessions', () => {
    render(<UserSessionsList userId="user-1" />);
    expect(screen.getByText(/sensitive information/)).toBeInTheDocument();
    expect(screen.getByText('Show Sessions')).toBeInTheDocument();
  });

  it('loads sessions after confirmation', async () => {
    const user = userEvent.setup();
    render(<UserSessionsList userId="user-1" />);

    await user.click(screen.getByText('Show Sessions'));

    expect(mockGetSessionHistory).toHaveBeenCalledWith('user-1');
    expect(await screen.findByText('abcdefgh...')).toBeInTheDocument();
    expect(screen.getByText('Chrome')).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
  });

  it('shows active and expired status', async () => {
    const user = userEvent.setup();
    render(<UserSessionsList userId="user-1" />);

    await user.click(screen.getByText('Show Sessions'));

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows masked tokens', async () => {
    const user = userEvent.setup();
    render(<UserSessionsList userId="user-1" />);

    await user.click(screen.getByText('Show Sessions'));

    expect(await screen.findByText('abcdefgh...')).toBeInTheDocument();
    expect(screen.getByText('zyxwvuts...')).toBeInTheDocument();
  });

  it('handles empty sessions', async () => {
    mockGetSessionHistory.mockResolvedValueOnce({ success: true, data: [] });
    const user = userEvent.setup();
    render(<UserSessionsList userId="user-1" />);

    await user.click(screen.getByText('Show Sessions'));

    expect(await screen.findByText('No sessions found.')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockGetSessionHistory.mockResolvedValueOnce({
      success: false,
      error: 'Failed to fetch',
    });
    const user = userEvent.setup();
    render(<UserSessionsList userId="user-1" />);

    await user.click(screen.getByText('Show Sessions'));

    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });
});
