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
    userStreak: { findUnique: vi.fn() },
    readingSession: { aggregate: vi.fn() },
    follow: { count: vi.fn() },
    session: { findFirst: vi.fn() },
    kudos: { findMany: vi.fn() },
    roomPresence: { findFirst: vi.fn() },
    userWarning: { count: vi.fn() },
    userSuspension: { count: vi.fn() },
    moderationItem: { count: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((u: { role: string }) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'),
}));

vi.mock('@/actions/admin/logAdminAction', () => ({
  logAdminAction: vi.fn(),
}));

import { getUserDetail } from './getUserDetail';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/actions/admin/logAdminAction';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockStreakFindUnique = prisma.userStreak.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockReadingSessionAggregate = prisma.readingSession.aggregate as unknown as ReturnType<typeof vi.fn>;
const mockFollowCount = prisma.follow.count as unknown as ReturnType<typeof vi.fn>;
const mockSessionFindFirst = prisma.session.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockKudosFindMany = prisma.kudos.findMany as unknown as ReturnType<typeof vi.fn>;
const mockRoomPresenceFindFirst = prisma.roomPresence.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockWarningCount = prisma.userWarning.count as unknown as ReturnType<typeof vi.fn>;
const mockSuspensionCount = prisma.userSuspension.count as unknown as ReturnType<typeof vi.fn>;
const mockModerationItemCount = prisma.moderationItem.count as unknown as ReturnType<typeof vi.fn>;
const mockLogAdminAction = logAdminAction as unknown as ReturnType<typeof vi.fn>;

const mockUserData = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  avatarUrl: null,
  bio: 'A reader',
  role: 'USER',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  suspendedUntil: null,
  suspensionReason: null,
};

describe('getUserDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    // First call: admin check, second call: target user
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce(mockUserData);
    mockStreakFindUnique.mockResolvedValue({ currentStreak: 5, longestStreak: 12 });
    mockReadingSessionAggregate.mockResolvedValue({ _sum: { duration: 7200 }, _count: 10 });
    mockFollowCount.mockResolvedValue(25);
    mockSessionFindFirst.mockResolvedValue({ createdAt: new Date('2026-02-09') });
    mockKudosFindMany.mockResolvedValue([]);
    mockRoomPresenceFindFirst.mockResolvedValue(null);
    mockWarningCount.mockResolvedValue(1);
    mockSuspensionCount.mockResolvedValue(0);
    mockModerationItemCount.mockResolvedValue(2);
    mockLogAdminAction.mockResolvedValue({});
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await getUserDetail('user-1');
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin', async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-2', role: 'USER' });
    const result = await getUserDetail('user-1');
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns error for missing userId', async () => {
    const result = await getUserDetail('');
    expect(result).toEqual({ success: false, error: 'User ID is required' });
  });

  it('returns user not found for invalid ID', async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })
      .mockResolvedValueOnce(null);
    const result = await getUserDetail('nonexistent');
    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('returns complete user profile', async () => {
    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.account.id).toBe('user-1');
      expect(result.data.account.email).toBe('test@example.com');
      expect(result.data.account.role).toBe('USER');
    }
  });

  it('returns reading stats with hours conversion', async () => {
    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      // 7200 seconds = 2.0 hours
      expect(result.data.readingStats.totalReadingTimeHours).toBe(2);
      expect(result.data.readingStats.totalSessions).toBe(10);
      expect(result.data.readingStats.currentStreak).toBe(5);
      expect(result.data.readingStats.longestStreak).toBe(12);
    }
  });

  it('returns social stats', async () => {
    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      // Both follower and following counts return 25
      expect(result.data.socialStats.followerCount).toBe(25);
      expect(result.data.socialStats.followingCount).toBe(25);
    }
  });

  it('returns recent activity with last login', async () => {
    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recentActivity.lastLogin).toEqual(new Date('2026-02-09'));
      expect(result.data.recentActivity.currentRoom).toBeNull();
    }
  });

  it('returns moderation summary counts', async () => {
    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moderationSummary.warningCount).toBe(1);
      expect(result.data.moderationSummary.suspensionCount).toBe(0);
      // moderationItem.count is called twice (received + submitted), both return 2
      expect(result.data.moderationSummary.flagsReceived).toBe(2);
      expect(result.data.moderationSummary.flagsSubmitted).toBe(2);
    }
  });

  it('handles zero/null values for new user', async () => {
    mockStreakFindUnique.mockResolvedValueOnce(null);
    mockReadingSessionAggregate.mockResolvedValueOnce({ _sum: { duration: null }, _count: 0 });
    mockFollowCount.mockResolvedValue(0);
    mockSessionFindFirst.mockResolvedValueOnce(null);
    mockWarningCount.mockResolvedValueOnce(0);
    mockSuspensionCount.mockResolvedValueOnce(0);
    mockModerationItemCount.mockResolvedValue(0);

    const result = await getUserDetail('user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.readingStats.currentStreak).toBe(0);
      expect(result.data.readingStats.totalReadingTimeHours).toBe(0);
      expect(result.data.readingStats.totalSessions).toBe(0);
      expect(result.data.recentActivity.lastLogin).toBeNull();
    }
  });

  it('logs VIEW_USER_DETAIL admin action', async () => {
    await getUserDetail('user-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: 'admin-1',
      actionType: 'VIEW_USER_DETAIL',
      targetId: 'user-1',
      targetType: 'User',
    });
  });
});
