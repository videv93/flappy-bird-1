'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileHeader } from './ProfileHeader';
import { ProfileForm } from './ProfileForm';
import { updateProfile } from '@/actions/profile';
import { signOut } from '@/lib/auth-client';
import type { ProfileInput } from '@/lib/validation/profile';
import { ReadingStats } from '@/components/features/sessions/ReadingStats';
import type { SessionStats } from '@/actions/sessions/getUserSessionStats';
import type { User } from '@prisma/client';

interface ProfileViewProps {
  user: User;
  sessionStats?: SessionStats | null;
}

export function ProfileView({ user: initialUser, sessionStats }: ProfileViewProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const previousUserRef = useRef(initialUser);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/login');
        },
      },
    });
  }, [router]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSubmit = useCallback(
    async (data: ProfileInput) => {
      setIsSubmitting(true);
      previousUserRef.current = user;

      // Optimistically update UI
      setUser((prev) => ({
        ...prev,
        name: data.name,
        bio: data.bio ?? null,
        favoriteGenres: data.favoriteGenres ?? prev.favoriteGenres,
        showReadingActivity: data.showReadingActivity ?? prev.showReadingActivity,
      }));

      const result = await updateProfile(data);

      setIsSubmitting(false);

      if (result.success) {
        setUser(result.data);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        // Revert on error
        setUser(previousUserRef.current);
        toast.error(result.error || 'Failed to update profile');
      }
    },
    [user]
  );

  const formDefaultValues: ProfileInput = {
    name: user.name || '',
    bio: user.bio,
    favoriteGenres: user.favoriteGenres || [],
    showReadingActivity: user.showReadingActivity,
  };

  return (
    <Card>
      <CardHeader>
        <ProfileHeader
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          createdAt={user.createdAt}
          isEditing={isEditing}
          onEditClick={handleEditClick}
        />
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <ProfileForm
            defaultValues={formDefaultValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        ) : (
          <ProfileReadOnlyView user={user} sessionStats={sessionStats} />
        )}
      </CardContent>

      <CardFooter className="pt-6">
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full"
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProfileReadOnlyView({ user, sessionStats }: { user: User; sessionStats?: SessionStats | null }) {
  const hasGenres = user.favoriteGenres && user.favoriteGenres.length > 0;

  return (
    <div className="space-y-6">
      {/* Reading Stats */}
      {sessionStats && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Reading Statistics
          </h3>
          <ReadingStats
            totalSeconds={sessionStats.totalSeconds}
            sessionCount={sessionStats.sessionCount}
            avgSeconds={sessionStats.avgSeconds}
          />
        </div>
      )}

      {/* Bio */}
      {user.bio && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">About</h3>
          <p className="text-sm">{user.bio}</p>
        </div>
      )}

      {/* Favorite Genres */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Favorite Genres
        </h3>
        {hasGenres ? (
          <div className="flex flex-wrap gap-2">
            {user.favoriteGenres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium"
              >
                {genre}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No genres selected</p>
        )}
      </div>

      {/* Reading Activity Visibility */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Privacy Settings
        </h3>
        <p className="text-sm">
          {user.showReadingActivity
            ? 'Your reading activity is visible to followers'
            : 'Your reading activity is hidden from followers'}
        </p>
      </div>
    </div>
  );
}
