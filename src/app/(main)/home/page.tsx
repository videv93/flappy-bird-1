'use client';

import Image from 'next/image';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logout } from '@/actions/auth/logout';

export default function HomePage() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSignOut = async () => {
    toast.success('Signed out successfully');
    await logout();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Welcome Home</h1>
        {user && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name || 'User avatar'}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full"
              />
            )}
            <p className="text-lg text-foreground">{user.name || 'Reader'}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        )}
      </div>

      <Button variant="outline" onClick={handleSignOut}>
        Sign Out
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        This is a protected page. You can only see this if you&apos;re signed in.
      </p>
    </div>
  );
}
