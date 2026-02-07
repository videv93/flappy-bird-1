# Story 3.7: Streak Freeze

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to use a streak freeze to protect my streak when I miss my daily reading goal**,
so that **I don't lose my progress when life gets in the way**.

## Acceptance Criteria

1. **View Available Freezes:** Given I have available streak freezes (`freezesAvailable > 0`), When I view my streak settings or the home page, Then I see my freeze count displayed: "X freezes available".

2. **Freeze Prompt on Miss:** Given I missed my goal today and have freezes available, When I open the app the next day (or the day transitions), Then the system prompts: "Use a freeze to protect your streak?", And I can choose "Use Freeze" or "Let Streak Reset".

3. **Apply Freeze:** Given I choose "Use Freeze", When the freeze is applied, Then today's DailyProgress is marked as `freezeUsed: true` (the missed day, not current day), And my `freezesAvailable` decreases by 1, And my streak count is preserved (not reset), And the StreakRing shows the blue/frozen state for that context.

4. **No Freezes Available:** Given I have no freezes available (`freezesAvailable === 0`), When I miss my goal, Then I am not offered the freeze option, And my streak resets at the next evaluation.

5. **Earn Freeze at 7-Day Streak:** Given I complete a 7-day streak (currentStreak reaches 7), When the 7th day goal is met, Then I earn 1 freeze (freezesAvailable += 1, capped at max 5), And I see a toast: "You earned a streak freeze!".

6. **Earn Freezes at 30-Day Streak:** Given I complete a 30-day streak (currentStreak reaches 30), When the 30th day goal is met, Then I earn 3 additional freezes (freezesAvailable += 3, capped at max 5), And I see a toast notification about earned freezes.

7. **Freeze Bank Maximum:** Given I have 5 freezes (maximum), When I would earn more, Then the extra freezes are not added, And I see: "Freeze bank full (5/5)".

8. **Freeze Count Display in StreakRing Area:** Given I am on the home page, When the page loads, Then I see my available freeze count near the StreakRing area (e.g., a small snowflake icon with count).

9. **Same-Day Idempotency for Freeze:** Given I have already applied a freeze for a missed day, When the system re-evaluates, Then no additional freeze is consumed.

10. **No Retroactive Freeze Application:** Given I missed more than 1 day without freezes, When I return to the app, Then the system does NOT try to retroactively apply freezes for multiple missed days, And my streak resets to 0 (or 1 when next goal is met).

## Tasks / Subtasks

- [x] Task 1: Create `useStreakFreeze` server action (AC: #2, #3, #4, #9)
  - [x] 1.1: Create `src/actions/streaks/useStreakFreeze.ts` following `ActionResult<T>` pattern
  - [x] 1.2: Accept input: `{ timezone: string }` (validated with Zod, defaults to 'UTC')
  - [x] 1.3: Authenticate via `auth.api.getSession({ headers: await headers() })`
  - [x] 1.4: Fetch user's `UserStreak` record — if no record or `freezesAvailable === 0`, return error: "No freezes available"
  - [x] 1.5: Determine the "missed day" to freeze: use `checkStreakStatus` logic to find the last missed day (yesterday in user's TZ)
  - [x] 1.6: Check idempotency: if yesterday's `DailyProgress` already has `freezeUsed: true`, return `{ freezeApplied: false, reason: 'already_frozen' }`
  - [x] 1.7: Verify streak is actually at risk (yesterday was missed) — if not at risk, return `{ freezeApplied: false, reason: 'streak_not_at_risk' }`
  - [x] 1.8: In a `prisma.$transaction()`:
    - Upsert `DailyProgress` for yesterday with `freezeUsed: true`
    - Update `UserStreak`: decrement `freezesAvailable` by 1, set `freezeUsedToday: true`
  - [x] 1.9: Return `ActionResult<FreezeResult>` with `{ freezeApplied: true, freezesRemaining, currentStreak }`

- [x] Task 2: Add freeze earning logic to `updateStreakOnGoalMet` (AC: #5, #6, #7)
  - [x] 2.1: In `src/actions/streaks/updateStreakOnGoalMet.ts`, after streak increment logic, add milestone checks
  - [x] 2.2: Check if `newStreak` has reached milestone: 7, 14, 21, 28 (earn 1 freeze each), or 30 (earn 3 freezes)
  - [x] 2.3: Calculate `freezesToAward` based on milestone hit
  - [x] 2.4: Cap `freezesAvailable` at `MAX_STREAK_FREEZES` (5) — use constant from a shared location
  - [x] 2.5: Update the `UserStreak` upsert to include new `freezesAvailable` value
  - [x] 2.6: Include `freezesEarned` and `freezesAvailable` in `StreakUpdateResult` return type
  - [x] 2.7: Add milestone toast message to `StreakUpdateResult.message` field

- [x] Task 3: Create streak freeze constants (AC: #7)
  - [x] 3.1: Add to `src/lib/config/constants.ts` (or create if not exists):
    - `MAX_STREAK_FREEZES = 5`
    - `FREEZE_MILESTONES = { 7: 1, 14: 1, 21: 1, 28: 1, 30: 3 }` (streak day → freezes earned)

- [x] Task 4: Create `StreakFreezePrompt` component (AC: #2, #3, #4)
  - [x] 4.1: Create `src/components/features/streaks/StreakFreezePrompt.tsx`
  - [x] 4.2: Accept props: `{ freezesAvailable: number, isAtRisk: boolean, onFreezeUsed: () => void, onDecline: () => void }`
  - [x] 4.3: Render as a Card with warm styling (not error/warning) — match existing compassionate messaging tone
  - [x] 4.4: Show snowflake icon + "Use a freeze to protect your [X]-day streak?"
  - [x] 4.5: Two buttons: "Use Freeze" (primary, amber) and "Let It Reset" (secondary, ghost)
  - [x] 4.6: Show remaining freeze count: "[X] freezes remaining"
  - [x] 4.7: On "Use Freeze" click: call `useStreakFreeze` server action, show loading state, then call `onFreezeUsed` callback
  - [x] 4.8: On "Let It Reset" click: call `onDecline` callback
  - [x] 4.9: Handle success/error with toast messages
  - [x] 4.10: Do NOT show component if `freezesAvailable === 0` or `isAtRisk === false`
  - [x] 4.11: Accessibility: proper ARIA labels, 44px touch targets, keyboard navigable

- [x] Task 5: Create `FreezeCountBadge` component (AC: #1, #8)
  - [x] 5.1: Create `src/components/features/streaks/FreezeCountBadge.tsx`
  - [x] 5.2: Accept props: `{ count: number, max?: number }`
  - [x] 5.3: Show snowflake icon (Snowflake from lucide-react) + count (e.g., "3/5")
  - [x] 5.4: Compact display suitable for placement near StreakRing
  - [x] 5.5: Muted styling when count is 0, blue accent when count > 0
  - [x] 5.6: Accessibility: `aria-label="X streak freezes available"`

- [x] Task 6: Integrate freeze UI into Home page (AC: #1, #2, #8)
  - [x] 6.1: In `src/app/(main)/home/page.tsx`, pass `freezesAvailable` (already available from `getStreakData`) and `isAtRisk` (from `checkStreakStatus`) to `HomeContent`
  - [x] 6.2: In `src/app/(main)/home/HomeContent.tsx`:
    - Add `freezesAvailable` to component props (if not already there)
    - Render `FreezeCountBadge` near the StreakRing area
    - Render `StreakFreezePrompt` when `isAtRisk && freezesAvailable > 0`
    - After freeze used or declined: call `router.refresh()` to refetch streak data
  - [x] 6.3: When freeze is used, the page should refresh and show updated streak state (streak preserved, StreakRing shows blue/frozen)

- [x] Task 7: Handle freeze earning toast in session save flow (AC: #5, #6, #7)
  - [x] 7.1: In `HomeContent.tsx` (or wherever session save result is handled), check `streakUpdate.freezesEarned` from the save response
  - [x] 7.2: If `freezesEarned > 0`, show toast: "You earned [N] streak freeze(s)!" with snowflake icon
  - [x] 7.3: If freeze bank is now full (5/5), show: "Freeze bank full (5/5)"

- [x] Task 8: Update barrel exports (AC: all)
  - [x] 8.1: Update `src/actions/streaks/index.ts` to export `useStreakFreeze` and its types
  - [x] 8.2: Update `src/components/features/streaks/index.ts` to export `StreakFreezePrompt`, `FreezeCountBadge`

- [x] Task 9: Write comprehensive tests (AC: all)
  - [x] 9.1: Create `src/actions/streaks/useStreakFreeze.test.ts`:
    - Test: No streak record → error
    - Test: No freezes available → error
    - Test: Streak not at risk → returns `streak_not_at_risk`
    - Test: Successfully apply freeze → DailyProgress updated, freezesAvailable decremented
    - Test: Idempotent — already frozen yesterday → returns `already_frozen`
    - Test: Transaction atomicity (both UserStreak and DailyProgress updated)
    - Test: Unauthenticated → error
  - [x] 9.2: Update `src/actions/streaks/updateStreakOnGoalMet.test.ts`:
    - Test: 7-day milestone → earns 1 freeze
    - Test: 30-day milestone → earns 3 freezes
    - Test: Freeze cap at 5 → no over-award
    - Test: Multiple milestones don't stack (only highest triggered)
    - Test: `freezesEarned` included in return
  - [x] 9.3: Create `src/components/features/streaks/StreakFreezePrompt.test.tsx`:
    - Test: Renders when `isAtRisk && freezesAvailable > 0`
    - Test: Does NOT render when `freezesAvailable === 0`
    - Test: Does NOT render when `isAtRisk === false`
    - Test: "Use Freeze" button calls action and callback
    - Test: "Let It Reset" button calls decline callback
    - Test: Shows loading state during freeze application
    - Test: Shows freeze count
    - Test: Accessibility (aria labels, touch targets)
  - [x] 9.4: Create `src/components/features/streaks/FreezeCountBadge.test.tsx`:
    - Test: Shows correct count
    - Test: Muted when count is 0
    - Test: Blue accent when count > 0
    - Test: Accessibility (aria-label)
  - [x] 9.5: Update `src/app/(main)/home/HomeContent.test.tsx`:
    - Test: FreezeCountBadge renders with correct count
    - Test: StreakFreezePrompt shown when at risk with freezes
    - Test: StreakFreezePrompt NOT shown when not at risk
    - Test: Freeze earned toast shown after session save
  - [x] 9.6: Verify 0 regressions across the full test suite

## Dev Notes

### Critical Architecture Patterns

- **Server Actions** use `ActionResult<T>` discriminated union — import from `@/actions/books/types.ts`
- **Auth pattern**: `const session = await auth.api.getSession({ headers: await headers() });`
- **Import convention**: ALWAYS use `@/` alias for cross-boundary imports
- **Component naming**: PascalCase files, named exports (not default)
- **Test co-location**: `Component.test.tsx` next to `Component.tsx`
- **Barrel exports**: Every feature folder needs `index.ts`
- **Date handling**: Store UTC in DB, calculate in user's timezone via `Intl.DateTimeFormat`
- **Duration**: `ReadingSession.duration` is stored in **seconds**
- **Zod v4**: Use `error.issues` not `error.errors` for ZodError handling
- **Toast**: Use `import { toast } from 'sonner'`

### Freeze Logic Algorithm (CRITICAL)

```
function determineIfFreezeCanBeApplied(streakStatus, freezesAvailable):
  if freezesAvailable === 0:
    return CANNOT_FREEZE  // no freezes to use

  if NOT streakStatus.isAtRisk:
    return NOT_AT_RISK  // streak is healthy, no need

  if yesterdayDailyProgress.freezeUsed === true:
    return ALREADY_FROZEN  // idempotent

  return CAN_FREEZE  // apply freeze to yesterday
```

**Freeze is applied to YESTERDAY (the missed day), not today.** When the user opens the app today and their streak is at risk because yesterday's goal wasn't met, the freeze marks yesterday's DailyProgress as `freezeUsed: true`. This makes the `checkStreakStatus` and `updateStreakOnGoalMet` logic treat yesterday as "not a break" — streak continues.

### Freeze Earning Milestones

```
When streak reaches milestone after goal met:
  7 days  → earn 1 freeze
  14 days → earn 1 freeze
  21 days → earn 1 freeze
  28 days → earn 1 freeze
  30 days → earn 3 freezes
  Cap: MAX_STREAK_FREEZES = 5

Only award freezes when currentStreak FIRST reaches the milestone.
Do NOT re-award if user has already passed that milestone before (use modular check: streak === milestone).
```

### Existing Code to Reuse (DO NOT REINVENT)

| What | Where | How to Use |
|------|-------|-----------|
| `ActionResult<T>` | `@/actions/books/types.ts` | Import for return types |
| `checkStreakStatus()` | `@/actions/streaks/checkStreakStatus.ts` | Use its logic to determine if streak is at risk |
| `updateStreakOnGoalMet()` | `@/actions/streaks/updateStreakOnGoalMet.ts` | MODIFY to add freeze earning logic |
| `updateStreakInternal()` | `@/actions/streaks/updateStreakOnGoalMet.ts` | Internal version without auth overhead |
| `getStreakData()` | `@/actions/streaks/getStreakData.ts` | Already returns `freezesAvailable` and `freezeUsedToday` |
| `getTodayBounds()` | `@/lib/dates.ts` | For timezone-aware date bounds |
| `getYesterdayBounds()` | `@/lib/dates.ts` | For determining yesterday in user's timezone |
| `getDateInTimezone()` | `@/lib/dates.ts` | For date comparisons |
| `StreakRing` | `@/components/features/streaks/StreakRing.tsx` | Already handles frozen state (blue snowflake) when `freezeUsedToday: true` — NO changes needed |
| `HomeContent` | `@/app/(main)/home/HomeContent.tsx` | Add freeze prompt and badge here |
| Home page server fetch | `@/app/(main)/home/page.tsx` | Already fetches `freezesAvailable` via `getStreakData` |
| Toast notifications | `sonner` | Already used project-wide |
| Prisma client | `@/lib/prisma` | Singleton Prisma instance |
| Auth | `@/lib/auth` | `auth.api.getSession({ headers: await headers() })` |
| `UserStreak` model | `prisma/schema.prisma` | Already has `freezesAvailable` (Int, default 0) and `freezeUsedToday` (Boolean, default false) |
| `DailyProgress` model | `prisma/schema.prisma` | Already has `freezeUsed` (Boolean, default false) |

### Database Schema (ALREADY EXISTS — NO CHANGES NEEDED)

The `UserStreak` model already has:
- `freezesAvailable Int @default(0)` — tracks available freezes
- `freezeUsedToday Boolean @default(false)` — indicates if freeze was used today

The `DailyProgress` model already has:
- `freezeUsed Boolean @default(false)` — marks a specific day as frozen

**No schema migration needed for this story.** All required fields were created in Story 3.6.

### Integration Points

**1. `useStreakFreeze` action flow:**
```typescript
// Called from StreakFreezePrompt component
const result = await useStreakFreeze({ timezone: userTimezone });
if (result.success && result.data.freezeApplied) {
  toast.success('Streak protected with freeze!');
  router.refresh(); // Refetch server data
}
```

**2. Freeze earning in `updateStreakOnGoalMet`:**
```typescript
// After streak increment, check milestones
const FREEZE_MILESTONES: Record<number, number> = { 7: 1, 14: 1, 21: 1, 28: 1, 30: 3 };
const freezesToAward = FREEZE_MILESTONES[newStreak] ?? 0;
if (freezesToAward > 0) {
  const newFreezes = Math.min(currentFreezes + freezesToAward, MAX_STREAK_FREEZES);
  // Include in UserStreak upsert
}
```

**3. HomeContent integration:**
```typescript
// Already receives freezeUsedToday and freezesAvailable from page.tsx
// Add: StreakFreezePrompt when isAtRisk && freezesAvailable > 0
// Add: FreezeCountBadge near StreakRing
```

### Emotional Design Requirements (from UX spec)

**CRITICAL — Forgiveness-first language:**
- "Use a freeze to protect your streak?" — Warm, not urgent
- "Streak protected! Freeze day saved you." — Positive reinforcement
- "You earned a streak freeze!" — Reward framing
- "Freeze bank full (5/5)" — Informational, not limiting

**NEVER use:**
- "You'll lose your streak!" — Guilt language
- "Warning: streak at risk!" — Anxiety-inducing
- "Last chance to save your streak!" — Pressure language

**Freeze is presented as a REWARD, not a safety net.** Per UX spec (Journey 5): "Freeze is presented as reward, not safety net."

### StreakRing Integration — NO CHANGES NEEDED

The `StreakRing` component at `src/components/features/streaks/StreakRing.tsx` already:
- Accepts `freezeUsedToday?: boolean` prop
- Displays blue/frozen state with snowflake icon when `freezeUsedToday: true && !goalMet`
- Shows "Freeze day" text label
- Goal-met state takes priority over frozen state (green > blue)

When a freeze is applied and `router.refresh()` is called, the server re-fetches `getStreakData()` which returns updated `freezeUsedToday`, and StreakRing automatically displays the frozen state.

### Scope Boundaries

**Story 3.7 DOES:**
- Create `useStreakFreeze` server action for consuming a freeze
- Add freeze earning logic to `updateStreakOnGoalMet` (milestone-based)
- Create `StreakFreezePrompt` component for the freeze prompt UI
- Create `FreezeCountBadge` component for displaying available freezes
- Integrate freeze UI into Home page
- Add freeze earning toast to session save flow
- Define freeze constants (MAX, milestones)

**Story 3.7 does NOT:**
- Modify the Prisma schema (all fields exist from Story 3.6)
- Modify the StreakRing component (already handles frozen display)
- Implement streak history heatmap (Story 3.8)
- Add end-of-day cron/scheduled job (freeze prompt happens on next app open)
- Implement streak freeze settings page (future enhancement)
- Add auto-freeze option (user must manually choose)

### Previous Story Intelligence (Story 3.6)

**Key patterns established:**
- `checkStreakStatus` already reads `DailyProgress.freezeUsed` for yesterday to determine risk
- `updateStreakOnGoalMet` already reads `DailyProgress.freezeUsed` for yesterday to determine streak continuation
- `getStreakData` already returns `freezesAvailable` and `freezeUsedToday`
- Home page server component already fetches all streak data and passes to `HomeContent`
- `router.refresh()` is the standard way to refetch server data after mutations
- `saveReadingSession` returns optional `streakUpdate` field with streak info

**Story 3.6 code review findings:**
- `useSyncExternalStore` subscribe/getSnapshot need `useCallback` for stable refs
- Conditional server action calls: only fetch streak data if `dailyGoalMinutes` is set
- `goalMet` takes priority over `freezeUsedToday` for display (green > blue)

**Test count:** 663+ tests passing across 64+ files at end of Story 3.6

### Git Intelligence

Recent commits:
- `d437bf2` feat: Implement streak credit and reset logic (Story 3.6)
- `64aced6` feat: Implement daily reading goal and streak ring display (Stories 3.4, 3.5)

**Pattern:** Feature commits include all new files + tests + modifications together. Commit message format: `feat: [Description] (Story N.N)`

### Architecture Compliance

- **Streak System maps to FR17-FR22** per architecture doc — specifically FR20: "Users can use a streak freeze to protect their streak"
- **Primary locations:** `features/streaks/`, `actions/streaks/` — per architecture structure mapping
- **Server Actions for mutations** (not API Routes) — per API Pattern Decision Tree
- **Prisma `$transaction`** for multi-table atomicity — standard pattern
- **Zustand NOT needed** — freeze data flows through server actions and page props
- **High-Risk Area:** Architecture doc identifies "Streak calculation — HIGH — freeze mechanics" — implement with thorough tests
- **Component location:** `src/components/features/streaks/` for `StreakFreezePrompt.tsx` and `FreezeCountBadge.tsx`
- **Lucide icons:** Use `Snowflake` from `lucide-react` for freeze icon (consistent with StreakRing)

### Testing Standards

- **Framework:** Vitest + React Testing Library (NOT Jest)
- **Mock auth:** `vi.mock('@/lib/auth')`
- **Mock prisma:** `vi.mock('@/lib/prisma')`
- **Mock server actions:** `vi.mock('@/actions/streaks/useStreakFreeze')`
- **Test co-location:** Test files next to source files
- **Accessibility:** aria attributes, touch targets (44px minimum)
- **Run full suite** after implementation to verify 0 regressions
- **Mock patterns:**
  ```typescript
  vi.mock('@/lib/auth', () => ({
    auth: { api: { getSession: vi.fn() } }
  }));
  vi.mock('@/lib/prisma', () => ({
    prisma: {
      userStreak: { findUnique: vi.fn(), update: vi.fn() },
      dailyProgress: { findFirst: vi.fn(), upsert: vi.fn() },
      $transaction: vi.fn((fn) => fn(prisma)),
    }
  }));
  ```

### Project Structure Notes

**New files:**
- `src/actions/streaks/useStreakFreeze.ts`
- `src/actions/streaks/useStreakFreeze.test.ts`
- `src/components/features/streaks/StreakFreezePrompt.tsx`
- `src/components/features/streaks/StreakFreezePrompt.test.tsx`
- `src/components/features/streaks/FreezeCountBadge.tsx`
- `src/components/features/streaks/FreezeCountBadge.test.tsx`

**Modified files:**
- `src/actions/streaks/updateStreakOnGoalMet.ts` (add freeze earning logic)
- `src/actions/streaks/updateStreakOnGoalMet.test.ts` (add freeze earning tests)
- `src/actions/streaks/index.ts` (add new exports)
- `src/components/features/streaks/index.ts` (add new component exports)
- `src/app/(main)/home/HomeContent.tsx` (add freeze prompt + freeze count badge)
- `src/app/(main)/home/HomeContent.test.tsx` (add freeze UI tests)
- `src/app/(main)/home/page.tsx` (pass isAtRisk and freezesAvailable to HomeContent — may already be partially wired)
- `src/lib/config/constants.ts` (add freeze constants — create if not exists)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-reading-sessions-habit-tracking.md#Story 3.7]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - Streak System FR17-FR22]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns - Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns - Format Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#High-Risk Technical Areas - Streak calculation HIGH]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 - Users can use a streak freeze to protect their streak]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Design - Forgiveness over shame]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 5 - Streak Freeze & Recovery]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Anti-Patterns - Guilt-trip copy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Anti-Patterns - Streaks without forgiveness]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Pattern Analysis - Duolingo streak ring + freeze mechanic]
- [Source: _bmad-output/implementation-artifacts/3-6-streak-credit-reset-logic.md#Dev Notes]
- [Source: src/actions/streaks/checkStreakStatus.ts#freeze check in yesterday DailyProgress]
- [Source: src/actions/streaks/updateStreakOnGoalMet.ts#freeze continuation logic]
- [Source: src/actions/streaks/getStreakData.ts#returns freezesAvailable, freezeUsedToday]
- [Source: src/components/features/streaks/StreakRing.tsx#frozen state display]
- [Source: src/app/(main)/home/HomeContent.tsx#streak data integration]
- [Source: src/app/(main)/home/page.tsx#streak data fetching]
- [Source: src/lib/dates.ts#timezone utilities]
- [Source: prisma/schema.prisma#UserStreak model - freezesAvailable, freezeUsedToday fields]
- [Source: prisma/schema.prisma#DailyProgress model - freezeUsed field]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- All 10 ACs satisfied
- 745 tests passing across 70 test files (0 failures, 0 regressions)
- Pre-existing lint errors remain in BookDetailActions.tsx (1 error), BookSearchResult.tsx (1 warning), ProfileForm.tsx (1 warning) — none in Story 3.7 files
- Pre-existing TypeScript `as unknown` pattern in streak test files — matches established convention across all streak tests (checkStreakStatus.test.ts, updateStreakOnGoalMet.test.ts, useStreakFreeze.test.ts)
- Fixed pre-existing type issue: `SaveReadingSessionInput` changed from `z.infer` to `z.input` so `timezone` is correctly optional in TypeScript type
- Server action `useStreakFreeze` uses `use` prefix which triggered ESLint `rules-of-hooks` — resolved via import alias (`applyStreakFreeze`) in component
- No Prisma schema changes needed — all fields already existed from Story 3.6
- No StreakRing changes needed — already handles frozen state display

### File List

**New files:**
- `src/actions/streaks/useStreakFreeze.ts` — Server action to apply streak freeze
- `src/actions/streaks/useStreakFreeze.test.ts` — 9 tests for useStreakFreeze
- `src/components/features/streaks/StreakFreezePrompt.tsx` — Freeze prompt UI component
- `src/components/features/streaks/StreakFreezePrompt.test.tsx` — 11 tests for StreakFreezePrompt
- `src/components/features/streaks/FreezeCountBadge.tsx` — Freeze count badge component
- `src/components/features/streaks/FreezeCountBadge.test.tsx` — 8 tests for FreezeCountBadge
- `src/lib/config/constants.ts` — MAX_STREAK_FREEZES, FREEZE_MILESTONES constants

**Modified files:**
- `src/actions/streaks/updateStreakOnGoalMet.ts` — Added freeze earning logic at milestones
- `src/actions/streaks/updateStreakOnGoalMet.test.ts` — Added 5 freeze earning tests
- `src/actions/streaks/checkStreakStatus.test.ts` — Updated `as any` casts to `as unknown`
- `src/actions/streaks/index.ts` — Added useStreakFreeze exports
- `src/components/features/streaks/index.ts` — Added FreezeCountBadge, StreakFreezePrompt exports
- `src/app/(main)/home/page.tsx` — Passes freezesAvailable to HomeContent
- `src/app/(main)/home/HomeContent.tsx` — Integrated FreezeCountBadge and StreakFreezePrompt
- `src/app/(main)/home/HomeContent.test.tsx` — Added 5 freeze UI tests
- `src/components/features/sessions/SessionSummary.tsx` — Added freeze earning toast on session save
- `src/actions/sessions/saveReadingSession.ts` — Fixed SaveReadingSessionInput type (z.input)
- `src/actions/sessions/saveReadingSession.test.ts` — Added freezesEarned/freezesAvailable to mocks
- `src/actions/streaks/getStreakData.ts` — Fixed stale `freezeUsedToday` flag by computing dynamically from DailyProgress
- `src/lib/config/index.ts` — Added constants barrel export
