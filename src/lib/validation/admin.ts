import { z } from 'zod';

export const userRoleEnum = z.enum(['USER', 'AUTHOR', 'ADMIN', 'SUPER_ADMIN']);

export const promoteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newRole: userRoleEnum,
});

export type PromoteUserInput = z.infer<typeof promoteUserSchema>;

export const adminActionSchema = z.object({
  actionType: z.string().min(1, 'Action type is required'),
  targetId: z.string().min(1, 'Target ID is required'),
  targetType: z.string().min(1, 'Target type is required'),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type AdminActionInput = z.infer<typeof adminActionSchema>;

// Moderation schemas

export const contentTypeEnum = z.enum(['PROFILE_BIO', 'READING_ROOM_DESCRIPTION']);

export const moderationStatusEnum = z.enum(['PENDING', 'DISMISSED', 'WARNED', 'REMOVED', 'SUSPENDED']);

export const flagContentSchema = z.object({
  contentType: contentTypeEnum,
  contentId: z.string().min(1, 'Content ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be at most 500 characters'),
});

export type FlagContentInput = z.infer<typeof flagContentSchema>;

export const reviewModerationItemSchema = z.object({
  moderationItemId: z.string().min(1, 'Moderation item ID is required'),
  action: z.enum(['dismiss', 'warn', 'remove', 'suspend']),
  adminNotes: z.string().max(1000).optional(),
});

export type ReviewModerationItemInput = z.infer<typeof reviewModerationItemSchema>;

// Content removal schemas

export const violationTypeEnum = z.enum(['SPAM', 'HARASSMENT', 'SPOILERS', 'INAPPROPRIATE', 'OTHER']);

export const removeContentSchema = z.object({
  moderationItemId: z.string().min(1, 'Moderation item ID is required'),
  violationType: violationTypeEnum,
  adminNotes: z.string().max(1000).optional(),
});

export type RemoveContentInput = z.infer<typeof removeContentSchema>;

export const restoreContentSchema = z.object({
  contentRemovalId: z.string().min(1, 'Content removal ID is required'),
  reason: z.string().max(1000).optional(),
});

export type RestoreContentInput = z.infer<typeof restoreContentSchema>;
