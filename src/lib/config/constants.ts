/**
 * Maximum number of books a free tier user can track.
 */
export const FREE_TIER_BOOK_LIMIT = 3;

/**
 * Premium one-time payment amount in cents ($9.99).
 */
export const PREMIUM_PRICE_AMOUNT = 999;

/**
 * Maximum number of streak freezes a user can hold.
 */
export const MAX_STREAK_FREEZES = 5;

/**
 * Freeze milestones: streak day count → number of freezes earned.
 * Only awarded when currentStreak first reaches that exact value.
 */
export const FREEZE_MILESTONES: Record<number, number> = {
  7: 1,
  14: 1,
  21: 1,
  28: 1,
  30: 3,
};
