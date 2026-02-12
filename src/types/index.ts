// Core application types
// This file exports shared types used across the application

export type { User } from './user';
export type {
  Book,
  UserBook,
  ReadingStatus,
} from './database';
export { ReadingStatusEnum } from './database';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
