import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProfileView } from '@/components/features/profile';

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    redirect('/login?callbackUrl=/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect('/login?callbackUrl=/profile');
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <ProfileView user={user} />
    </main>
  );
}
