import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: vi.fn(), findUnique: vi.fn() },
    readingSession: { count: vi.fn(), aggregate: vi.fn() },
    userStreak: { count: vi.fn(), aggregate: vi.fn() },
    kudos: { count: vi.fn() },
    follow: { count: vi.fn() },
    book: { count: vi.fn() },
    authorClaim: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((user: { id: string; role?: string }) => {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  }),
}));

import { getPlatformMetrics } from './getPlatformMetrics';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserCount = prisma.user.count as unknown as ReturnType<typeof vi.fn>;

type MockPrisma = {
  readingSession: { count: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  userStreak: { count: ReturnType<typeof vi.fn>; aggregate: ReturnType<typeof vi.fn> };
  kudos: { count: ReturnType<typeof vi.fn> };
  follow: { count: ReturnType<typeof vi.fn> };
  book: { count: ReturnType<typeof vi.fn> };
  authorClaim: { count: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

const mp = prisma as unknown as MockPrisma;

function setupAdminSession() {
  mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
  mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
}

function setupDefaultMetrics() {
  mockUserCount
    .mockResolvedValueOnce(1000) // totalUsers
    .mockResolvedValueOnce(5) // newUsersToday
    .mockResolvedValueOnce(25) // newUsersThisWeek
    .mockResolvedValueOnce(80); // newUsersThisMonth

  mp.$queryRaw
    .mockResolvedValueOnce([{ count: BigInt(50) }]) // DAU
    .mockResolvedValueOnce([{ count: BigInt(200) }]) // MAU
    .mockResolvedValueOnce([{ count: BigInt(3) }]); // activeRooms

  mp.readingSession.count.mockResolvedValue(5000);
  mp.readingSession.aggregate
    .mockResolvedValueOnce({ _sum: { duration: 360000 } }) // 100 hours
    .mockResolvedValueOnce({ _avg: { duration: 1800 } }); // 30 min avg

  mp.userStreak.count.mockResolvedValue(150);
  mp.userStreak.aggregate.mockResolvedValue({ _avg: { currentStreak: 4.5 } });

  mp.kudos.count
    .mockResolvedValueOnce(12) // today
    .mockResolvedValueOnce(3000); // all-time

  mp.follow.count.mockResolvedValue(800);
  mp.book.count.mockResolvedValue(450);

  mp.authorClaim.count
    .mockResolvedValueOnce(15) // verified
    .mockResolvedValueOnce(3); // pending
}

describe('getPlatformMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getPlatformMetrics();

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin user', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: 'USER' });

    const result = await getPlatformMetrics();

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns forbidden when user not found', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'ghost' } });
    mockUserFindUnique.mockResolvedValue(null);

    const result = await getPlatformMetrics();

    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns all metric categories with correct values', async () => {
    setupAdminSession();
    setupDefaultMetrics();

    const result = await getPlatformMetrics();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.user).toEqual({
      totalUsers: 1000,
      newUsersToday: 5,
      newUsersThisWeek: 25,
      newUsersThisMonth: 80,
      dailyActiveUsers: 50,
      monthlyActiveUsers: 200,
      dauMauRatio: 0.25,
    });

    expect(result.data.engagement).toEqual({
      totalSessions: 5000,
      totalReadingTimeHours: 100,
      avgSessionDurationMinutes: 30,
      activeStreaks: 150,
      avgStreakLength: 4.5,
    });

    expect(result.data.social).toEqual({
      kudosToday: 12,
      kudosAllTime: 3000,
      activeReadingRooms: 3,
      totalFollows: 800,
    });

    expect(result.data.content).toEqual({
      totalBooks: 450,
      verifiedAuthors: 15,
      pendingAuthorClaims: 3,
    });
  });

  it('handles empty database with zero counts', async () => {
    setupAdminSession();

    mockUserCount.mockResolvedValue(0);
    mp.$queryRaw
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }]);
    mp.readingSession.count.mockResolvedValue(0);
    mp.readingSession.aggregate
      .mockResolvedValueOnce({ _sum: { duration: null } })
      .mockResolvedValueOnce({ _avg: { duration: null } });
    mp.userStreak.count.mockResolvedValue(0);
    mp.userStreak.aggregate.mockResolvedValue({ _avg: { currentStreak: null } });
    mp.kudos.count.mockResolvedValue(0);
    mp.follow.count.mockResolvedValue(0);
    mp.book.count.mockResolvedValue(0);
    mp.authorClaim.count.mockResolvedValue(0);

    const result = await getPlatformMetrics();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.user.totalUsers).toBe(0);
    expect(result.data.user.dauMauRatio).toBe(0);
    expect(result.data.engagement.totalReadingTimeHours).toBe(0);
    expect(result.data.engagement.avgSessionDurationMinutes).toBe(0);
    expect(result.data.engagement.avgStreakLength).toBe(0);
    expect(result.data.social.activeReadingRooms).toBe(0);
  });

  it('handles query errors gracefully', async () => {
    setupAdminSession();
    mockUserCount.mockRejectedValue(new Error('DB connection failed'));

    const result = await getPlatformMetrics();

    expect(result).toEqual({ success: false, error: 'Failed to fetch platform metrics' });
  });

  it('executes queries in parallel with Promise.all', async () => {
    setupAdminSession();
    setupDefaultMetrics();

    await getPlatformMetrics();

    expect(mockUserCount).toHaveBeenCalledTimes(4);
    expect(mp.$queryRaw).toHaveBeenCalledTimes(3);
    expect(mp.readingSession.count).toHaveBeenCalledTimes(1);
    expect(mp.readingSession.aggregate).toHaveBeenCalledTimes(2);
    expect(mp.userStreak.count).toHaveBeenCalledTimes(1);
    expect(mp.userStreak.aggregate).toHaveBeenCalledTimes(1);
    expect(mp.kudos.count).toHaveBeenCalledTimes(2);
    expect(mp.follow.count).toHaveBeenCalledTimes(1);
    expect(mp.book.count).toHaveBeenCalledTimes(1);
    expect(mp.authorClaim.count).toHaveBeenCalledTimes(2);
  });

  it('converts bigint from raw queries to number', async () => {
    setupAdminSession();
    setupDefaultMetrics();

    const result = await getPlatformMetrics();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(typeof result.data.user.dailyActiveUsers).toBe('number');
    expect(typeof result.data.user.monthlyActiveUsers).toBe('number');
    expect(typeof result.data.social.activeReadingRooms).toBe('number');
  });
});
