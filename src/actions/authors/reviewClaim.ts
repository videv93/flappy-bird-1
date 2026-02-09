'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reviewClaimSchema } from '@/lib/validation/author';
import { getPusher } from '@/lib/pusher-server';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';
import type { AuthorClaim } from '@prisma/client';

export async function reviewClaim(
  input: unknown
): Promise<ActionResult<AuthorClaim>> {
  try {
    const validated = reviewClaimSchema.parse(input);

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!isAdmin(session.user.id)) {
      return { success: false, error: 'Forbidden' };
    }

    const claim = await prisma.authorClaim.findUnique({
      where: { id: validated.claimId },
      include: { book: { select: { title: true } } },
    });

    if (!claim) {
      return { success: false, error: 'Claim not found' };
    }

    if (claim.status !== 'PENDING') {
      return { success: false, error: 'Claim has already been reviewed' };
    }

    const newStatus = validated.decision === 'approve' ? 'APPROVED' : 'REJECTED';

    const updatedClaim = await prisma.authorClaim.update({
      where: { id: validated.claimId },
      data: {
        status: newStatus,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Send real-time notification to the claimant
    const eventName =
      validated.decision === 'approve'
        ? 'author:claim-approved'
        : 'author:claim-rejected';

    try {
      const pusher = getPusher();
      await pusher?.trigger(`private-user-${claim.userId}`, eventName, {
        bookTitle: claim.book.title,
        claimId: claim.id,
      });
    } catch (pusherError) {
      console.error('Pusher trigger failed:', pusherError);
    }

    return { success: true, data: updatedClaim };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return { success: false, error: 'Invalid input' };
    }
    console.error('reviewClaim error:', error);
    return { success: false, error: 'Failed to review claim' };
  }
}
