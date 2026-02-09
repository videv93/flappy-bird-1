import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    book: {
      findUnique: vi.fn(),
    },
    moderationItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { flagContent } from './flagContent';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockBookFindUnique = (prisma as unknown as { book: { findUnique: ReturnType<typeof vi.fn> } }).book.findUnique;
const mockModItemFindUnique = (prisma as unknown as { moderationItem: { findUnique: ReturnType<typeof vi.fn> } }).moderationItem.findUnique;
const mockModItemCreate = (prisma as unknown as { moderationItem: { create: ReturnType<typeof vi.fn> } }).moderationItem.create;

describe('flagContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('creates a moderation item for a valid profile bio flag', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-2' });
    mockModItemFindUnique.mockResolvedValue(null);
    const createdItem = {
      id: 'mod-1',
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reporterId: 'user-1',
      reportedUserId: 'user-2',
      reason: 'Inappropriate content in bio',
      status: 'PENDING',
    };
    mockModItemCreate.mockResolvedValue(createdItem);

    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'Inappropriate content in bio',
    });

    expect(result).toEqual({ success: true, data: createdItem });
    expect(mockModItemCreate).toHaveBeenCalledWith({
      data: {
        contentType: 'PROFILE_BIO',
        contentId: 'user-2',
        reporterId: 'user-1',
        reportedUserId: 'user-2',
        reason: 'Inappropriate content in bio',
      },
    });
  });

  it('prevents duplicate flags', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-2' });
    mockModItemFindUnique.mockResolvedValue({ id: 'existing-mod' });

    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'Duplicate flag attempt here',
    });

    expect(result).toEqual({ success: false, error: 'You have already reported this content' });
    expect(mockModItemCreate).not.toHaveBeenCalled();
  });

  it('returns error for unauthorized user', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'Some reason for flagging',
    });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns error for non-existent user target', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'non-existent',
      reason: 'Flagging non-existent user bio',
    });

    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('prevents self-flagging', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' });

    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'user-1',
      reason: 'Trying to flag my own bio',
    });

    expect(result).toEqual({ success: false, error: 'You cannot flag your own content' });
  });

  it('returns error for invalid input', async () => {
    const result = await flagContent({
      contentType: 'PROFILE_BIO',
      contentId: 'user-2',
      reason: 'short', // too short - less than 10 chars
    });

    expect(result).toEqual({ success: false, error: 'Invalid input' });
  });

  it('creates moderation item for reading room description', async () => {
    mockBookFindUnique.mockResolvedValue({ id: 'book-1' });
    mockModItemFindUnique.mockResolvedValue(null);
    const createdItem = {
      id: 'mod-2',
      contentType: 'READING_ROOM_DESCRIPTION',
      contentId: 'book-1',
      reporterId: 'user-1',
      reportedUserId: 'system',
      reason: 'Spoilers in reading room description',
      status: 'PENDING',
    };
    mockModItemCreate.mockResolvedValue(createdItem);

    const result = await flagContent({
      contentType: 'READING_ROOM_DESCRIPTION',
      contentId: 'book-1',
      reason: 'Spoilers in reading room description',
    });

    expect(result).toEqual({ success: true, data: createdItem });
  });
});
