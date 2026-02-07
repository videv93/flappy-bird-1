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
