'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface ProfileHeaderProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  isEditing: boolean;
  onEditClick: () => void;
}

export function ProfileHeader({
  name,
  email,
  avatarUrl,
  createdAt,
  isEditing,
  onEditClick,
}: ProfileHeaderProps) {
  const displayName = name || 'Anonymous User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(createdAt));

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>

      <div className="text-center">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Member since {memberSince}
        </p>
      </div>

      {!isEditing && (
        <Button
          variant="secondary"
          onClick={onEditClick}
          className="min-h-[44px]"
          aria-label="Edit Profile"
        >
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      )}
    </div>
  );
}
