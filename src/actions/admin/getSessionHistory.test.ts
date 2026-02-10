import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((u: { role: string }) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'),
}));

vi.mock('@/actions/admin/logAdminAction', () => ({
  logAdminAction: vi.fn(),
}));

import { getSessionHistory, parseUserAgent } from './getSessionHistory';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/actions/admin/logAdminAction';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockSessionFindMany = prisma.session.findMany as unknown as ReturnType<typeof vi.fn>;
const mockLogAdminAction = logAdminAction as unknown as ReturnType<typeof vi.fn>;

const futureDate = new Date('2027-01-01');
const pastDate = new Date('2025-01-01');

const mockSessions = [
  {
    id: 'sess-1',
    token: 'abcdefgh12345678',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    createdAt: new Date('2026-02-09'),
    expiresAt: futureDate,
  },
  {
    id: 'sess-2',
    token: 'zyxwvuts87654321',
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2026-02-01'),
    expiresAt: pastDate,
  },
];

describe('getSessionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce({ id: 'user-1' });
    mockSessionFindMany.mockResolvedValue(mockSessions);
    mockLogAdminAction.mockResolvedValue({});
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await getSessionHistory('user-1');
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin', async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-2', role: 'USER' });
    const result = await getSessionHistory('user-1');
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for missing userId', async () => {
    const result = await getSessionHistory('');
    expect(result).toEqual({ success: false, error: 'User ID is required' });
  });

  it('returns user not found for invalid ID', async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce(null);
    const result = await getSessionHistory('nonexistent');
    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('returns sessions with parsed device info', async () => {
    const result = await getSessionHistory('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].deviceInfo.browser).toBe('Chrome');
      expect(result.data[0].deviceInfo.os).toBe('Windows');
    }
  });

  it('masks session tokens correctly', async () => {
    const result = await getSessionHistory('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].maskedToken).toBe('abcdefgh...');
      expect(result.data[1].maskedToken).toBe('zyxwvuts...');
    }
  });

  it('returns isActive flag based on expiresAt', async () => {
    const result = await getSessionHistory('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].isActive).toBe(true); // future expiry
      expect(result.data[1].isActive).toBe(false); // past expiry
    }
  });

  it('handles null userAgent and ipAddress', async () => {
    const result = await getSessionHistory('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[1].ipAddress).toBeNull();
      expect(result.data[1].userAgent).toBeNull();
      expect(result.data[1].deviceInfo.browser).toBe('Unknown');
      expect(result.data[1].deviceInfo.os).toBe('Unknown');
    }
  });

  it('returns empty sessions for user with no sessions', async () => {
    mockSessionFindMany.mockResolvedValueOnce([]);
    const result = await getSessionHistory('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('logs VIEW_SESSION_HISTORY admin action', async () => {
    await getSessionHistory('user-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: 'admin-1',
      actionType: 'VIEW_SESSION_HISTORY',
      targetId: 'user-1',
      targetType: 'Session',
      details: { sessionCount: 2 },
    });
  });
});

describe('parseUserAgent', () => {
  it('parses Chrome on Windows', () => {
    const result = parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0');
    expect(result).toEqual({ browser: 'Chrome', os: 'Windows' });
  });

  it('parses Safari on macOS', () => {
    const result = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1');
    expect(result).toEqual({ browser: 'Safari', os: 'macOS' });
  });

  it('parses Edge on Windows', () => {
    const result = parseUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Edg/120.0');
    expect(result).toEqual({ browser: 'Edge', os: 'Windows' });
  });

  it('parses Firefox on Linux', () => {
    const result = parseUserAgent('Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0');
    expect(result).toEqual({ browser: 'Firefox', os: 'Linux' });
  });

  it('parses Safari on iOS', () => {
    const result = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1');
    expect(result).toEqual({ browser: 'Safari', os: 'iOS' });
  });

  it('returns Unknown for null', () => {
    expect(parseUserAgent(null)).toEqual({ browser: 'Unknown', os: 'Unknown' });
  });

  it('returns Unknown for unrecognized agent', () => {
    expect(parseUserAgent('SomeBot/1.0')).toEqual({ browser: 'Unknown', os: 'Unknown' });
  });
});
