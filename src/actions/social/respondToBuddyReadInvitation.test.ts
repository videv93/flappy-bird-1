import { describe, it, expect, vi, beforeEach } from 'vitest';
import { respondToBuddyReadInvitation } from './respondToBuddyReadInvitation';

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
    buddyReadInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userBook: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockInvitationFindUnique = prisma.buddyReadInvitation
  .findUnique as unknown as ReturnType<typeof vi.fn>;
const mockInvitationUpdate = prisma.buddyReadInvitation.update as unknown as ReturnType<
  typeof vi.fn
>;
const mockUserBookFindUnique = prisma.userBook.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUserBookCreate = prisma.userBook.create as unknown as ReturnType<typeof vi.fn>;

const pendingInvitation = {
  id: 'inv-1',
  inviteeId: 'user-1',
  status: 'PENDING',
  buddyRead: { bookId: 'book-1' },
};

describe('respondToBuddyReadInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('accepts invitation and adds book to library', async () => {
    mockInvitationFindUnique.mockResolvedValue(pendingInvitation);
    mockInvitationUpdate.mockResolvedValue({ ...pendingInvitation, status: 'ACCEPTED' });
    mockUserBookFindUnique.mockResolvedValue(null);
    mockUserBookCreate.mockResolvedValue({ id: 'ub-1' });

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ACCEPTED');
    }
    expect(mockUserBookCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        bookId: 'book-1',
        status: 'WANT_TO_READ',
      },
    });
  });

  it('accepts invitation but skips library add if book already exists', async () => {
    mockInvitationFindUnique.mockResolvedValue(pendingInvitation);
    mockInvitationUpdate.mockResolvedValue({ ...pendingInvitation, status: 'ACCEPTED' });
    mockUserBookFindUnique.mockResolvedValue({ id: 'existing-ub' });

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(true);
    expect(mockUserBookCreate).not.toHaveBeenCalled();
  });

  it('declines invitation without adding to library', async () => {
    mockInvitationFindUnique.mockResolvedValue(pendingInvitation);
    mockInvitationUpdate.mockResolvedValue({ ...pendingInvitation, status: 'DECLINED' });

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'DECLINED',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('DECLINED');
    }
    expect(mockUserBookCreate).not.toHaveBeenCalled();
  });

  it('returns error when invitation not found', async () => {
    mockInvitationFindUnique.mockResolvedValue(null);

    const result = await respondToBuddyReadInvitation({
      invitationId: 'nonexistent',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invitation not found');
    }
  });

  it('returns error when user is not the invitee', async () => {
    mockInvitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      inviteeId: 'other-user',
    });

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns error when invitation already responded to', async () => {
    mockInvitationFindUnique.mockResolvedValue({
      ...pendingInvitation,
      status: 'ACCEPTED',
    });

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invitation already responded to');
    }
  });

  it('returns error when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await respondToBuddyReadInvitation({
      invitationId: 'inv-1',
      response: 'ACCEPTED',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });
});
