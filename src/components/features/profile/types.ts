import type { User } from '@prisma/client';

export interface ProfileViewProps {
  user: User;
}

export interface ProfileHeaderProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  isEditing: boolean;
  onEditClick: () => void;
}

export interface ProfileFormProps {
  defaultValues: {
    name: string;
    bio: string | null | undefined;
    favoriteGenres: string[];
    showReadingActivity: boolean;
  };
  onSubmit: (data: {
    name: string;
    bio: string | null | undefined;
    favoriteGenres: string[];
    showReadingActivity: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}
