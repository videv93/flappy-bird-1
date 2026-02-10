import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    adminAction: { create: vi.fn() },
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: vi.fn((u: { role: string }) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'),
}));

vi.mock('@/actions/admin/logAdminAction', () => ({
  logAdminAction: vi.fn(),
}));

import { searchUsers } from './searchUsers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/actions/admin/logAdminAction';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserFindMany = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUserCount = prisma.user.count as unknown as ReturnType<typeof vi.fn>;
const mockLogAdminAction = logAdminAction as unknown as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  createdAt: new Date('2026-01-01'),
  suspendedUntil: null,
  _count: { warnings: 1, suspensions: 0 },
};

describe('searchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'admin-1' } });
    mockUserFindUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockUserFindMany.mockResolvedValue([mockUser]);
    mockUserCount.mockResolvedValue(1);
    mockLogAdminAction.mockResolvedValue({});
  });

  it('returns unauthorized when no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const result = await searchUsers({ query: 'test' });
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns forbidden when non-admin', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-2', role: 'USER' });
    const result = await searchUsers({ query: 'test' });
    expect(result).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns invalid input for empty query', async () => {
    const result = await searchUsers({ query: '' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });

  it('finds users by email', async () => {
    const result = await searchUsers({ query: 'test@example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].email).toBe('test@example.com');
      expect(result.data.users[0].warningCount).toBe(1);
      expect(result.data.users[0].suspensionCount).toBe(0);
      expect(result.data.total).toBe(1);
      expect(result.data.query).toBe('test@example.com');
    }
  });

  it('finds users by name', async () => {
    const result = await searchUsers({ query: 'Test User' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].name).toBe('Test User');
    }
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: { contains: 'Test User', mode: 'insensitive' } },
            { name: { contains: 'Test User', mode: 'insensitive' } },
            { id: 'Test User' },
          ],
        },
      })
    );
  });

  it('finds user by exact ID', async () => {
    await searchUsers({ query: 'user-1' });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([{ id: 'user-1' }]),
        },
      })
    );
  });

  it('returns empty results when no matches', async () => {
    mockUserFindMany.mockResolvedValueOnce([]);
    mockUserCount.mockResolvedValueOnce(0);
    const result = await searchUsers({ query: 'nonexistent' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toHaveLength(0);
      expect(result.data.total).toBe(0);
    }
  });

  it('respects pagination parameters', async () => {
    await searchUsers({ query: 'test', limit: 10, offset: 5 });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 5,
      })
    );
  });

  it('logs SEARCH_USERS admin action', async () => {
    await searchUsers({ query: 'test@example.com' });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: 'admin-1',
      actionType: 'SEARCH_USERS',
      targetId: 'N/A',
      targetType: 'User',
      details: { query: 'test@example.com', resultCount: 1 },
    });
  });
});
