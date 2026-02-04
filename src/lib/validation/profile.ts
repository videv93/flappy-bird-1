import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
  bio: z
    .string()
    .max(200, 'Bio must be 200 characters or less')
    .optional()
    .nullable(),
  favoriteGenres: z.array(z.string()),
  showReadingActivity: z.boolean(),
});

// Type for form input - matches what the form handles
export type ProfileInput = z.input<typeof profileSchema>;

// Type for validated output - what the schema produces after parsing
export type ProfileOutput = z.output<typeof profileSchema>;
