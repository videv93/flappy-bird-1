'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { profileSchema, type ProfileInput } from '@/lib/validation/profile';
import { GENRES } from '@/lib/config/genres';
import { Loader2 } from 'lucide-react';

interface ProfileFormProps {
  defaultValues: ProfileInput;
  onSubmit: (data: ProfileInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ProfileForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const nameValue = watch('name');
  const bioValue = watch('bio');
  const favoriteGenres = watch('favoriteGenres');
  const showReadingActivity = watch('showReadingActivity');

  const handleGenreToggle = (genre: string) => {
    const current = favoriteGenres || [];
    if (current.includes(genre)) {
      setValue(
        'favoriteGenres',
        current.filter((g) => g !== genre),
        { shouldValidate: true }
      );
    } else {
      setValue('favoriteGenres', [...current, genre], { shouldValidate: true });
    }
  };

  const submitHandler = (data: ProfileInput) => onSubmit(data);

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-6">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Display Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={!!errors.name}
          maxLength={50}
        />
        <div className="flex justify-between text-xs">
          {errors.name ? (
            <p id="name-error" className="text-destructive">
              {errors.name.message}
            </p>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {nameValue?.length || 0}/50
          </span>
        </div>
      </div>

      {/* Bio Field */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          {...register('bio')}
          placeholder="Tell us about yourself..."
          aria-describedby={errors.bio ? 'bio-error' : undefined}
          aria-invalid={!!errors.bio}
          maxLength={200}
          rows={4}
        />
        <div className="flex justify-between text-xs">
          {errors.bio ? (
            <p id="bio-error" className="text-destructive">
              {errors.bio.message}
            </p>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            {bioValue?.length || 0}/200
          </span>
        </div>
      </div>

      {/* Favorite Genres */}
      <div className="space-y-3">
        <Label>Favorite Genres</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GENRES.map((genre) => (
            <label
              key={genre}
              className="flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Checkbox
                checked={favoriteGenres?.includes(genre) || false}
                onCheckedChange={() => handleGenreToggle(genre)}
                aria-label={genre}
              />
              <span className="text-sm">{genre}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Show Reading Activity Toggle */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="space-y-0.5">
          <Label htmlFor="showReadingActivity" className="cursor-pointer">
            Show my reading activity to followers
          </Label>
          <p className="text-xs text-muted-foreground">
            When enabled, your followers can see your reading progress
          </p>
        </div>
        <Switch
          id="showReadingActivity"
          checked={showReadingActivity}
          onCheckedChange={(checked) =>
            setValue('showReadingActivity', checked, { shouldValidate: true })
          }
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
