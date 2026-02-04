'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { profileSchema, type ProfileInput } from '@/lib/validation/profile';
import type { User } from '@prisma/client';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateProfile(
  data: ProfileInput
): Promise<ActionResult<User>> {
  try {
    // Validate with Zod
    const validated = profileSchema.parse(data);

    // Get session - require authentication
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validated.name,
        bio: validated.bio,
        favoriteGenres: validated.favoriteGenres,
        showReadingActivity: validated.showReadingActivity,
      },
    });

    return { success: true, data: user };
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return { success: false, error: 'Invalid profile data' };
    }
    return { success: false, error: 'Failed to update profile' };
  }
}
