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

// Warning & Suspension schemas

export const warningTypeEnum = z.enum(['FIRST_WARNING', 'FINAL_WARNING']);

export const suspensionDurationEnum = z.enum(['HOURS_24', 'DAYS_7', 'DAYS_30', 'PERMANENT']);

export const warnUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  warningType: warningTypeEnum,
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be at most 1000 characters'),
  moderationItemId: z.string().min(1).optional(),
});

export type WarnUserInput = z.infer<typeof warnUserSchema>;

export const suspendUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  duration: suspensionDurationEnum,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must be at most 1000 characters'),
  moderationItemId: z.string().min(1).optional(),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

export const liftSuspensionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().max(1000).optional(),
});

export type LiftSuspensionInput = z.infer<typeof liftSuspensionSchema>;

export const acknowledgeWarningSchema = z.object({
  warningId: z.string().min(1, 'Warning ID is required'),
});

export type AcknowledgeWarningInput = z.infer<typeof acknowledgeWarningSchema>;

// User search schema (Story 6.7)

export const userSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query must be at most 100 characters'),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type UserSearchInput = z.infer<typeof userSearchSchema>;
