/**
 * Database types re-exported from Prisma client
 * These types are used for database operations and type-safe queries
 */

// Re-export Prisma types
export type {
  User,
  Session,
  Account,
  Verification,
  Book,
  UserBook,
  ReadingStatus,
} from '@prisma/client';

// Re-export Prisma enums as values for runtime use
export { ReadingStatus as ReadingStatusEnum } from '@prisma/client';
