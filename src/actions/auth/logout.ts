'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function logout() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (session) {
    await auth.api.signOut({
      headers: headersList,
    });
  }

  redirect('/login');
}
