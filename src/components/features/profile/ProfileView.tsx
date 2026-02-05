'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProfileHeader } from './ProfileHeader';
import { ProfileForm } from './ProfileForm';
import { updateProfile } from '@/actions/profile';
import type { ProfileInput } from '@/lib/validation/profile';
import type { User } from '@prisma/client';

interface ProfileViewProps {
  user: User;
}

export function ProfileView({ user: initialUser }: ProfileViewProps) {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousUserRef = useRef(initialUser);

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
          <ProfileReadOnlyView user={user} />
        )}
      </CardContent>
    </Card>
  );
}

function ProfileReadOnlyView({ user }: { user: User }) {
  const hasGenres = user.favoriteGenres && user.favoriteGenres.length > 0;

  return (
    <div className="space-y-6">
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
