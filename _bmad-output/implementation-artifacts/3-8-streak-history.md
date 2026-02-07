# Story 3.8: Streak History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to view my streak history as a calendar heatmap**,
so that **I can see my reading consistency over time and feel motivated by my progress**.

## Acceptance Criteria

1. **Navigate to Streak History:** Given I am on my profile page, When I tap on my streak count or a "View Streak History" link, Then I see a streak history view.

2. **Calendar Heatmap Display:** Given I am viewing streak history, When the view loads, Then I see a calendar-style heatmap of the last 90 days, And each day is colored: green (goal met), blue (freeze used), gray (missed), empty/neutral (no data/no goal set), And I see my current streak count, And I see my longest streak ever.

3. **Day Detail on Tap:** Given I tap on a specific day in the heatmap, When the day detail appears, Then I see: total minutes read that day, the goal for that day, number of sessions logged, And I see if a freeze was used.

4. **Scrollable History:** Given I have a long history, When I scroll the heatmap, Then I can view older months beyond 90 days, And performance remains smooth (virtualized rendering if needed for 365+ days).

## Tasks / Subtasks

- [x] Task 1: Create `getStreakHistory` server action (AC: #2, #3, #4)
  - [x] 1.1: Create `src/actions/streaks/getStreakHistory.ts` following `ActionResult<T>` pattern
  - [x] 1.2: Accept input: `{ timezone: string, days?: number }` validated with Zod (default 90 days)
  - [x] 1.3: Authenticate via `auth.api.getSession({ headers: await headers() })`
  - [x] 1.4: Query `DailyProgress` for the date range: `where: { userId, date: { gte: startDate } }`, ordered by `date asc`
  - [x] 1.5: Query `UserStreak` for `currentStreak` and `longestStreak`
  - [x] 1.6: Return `ActionResult<StreakHistoryData>` with:
    - `history: Array<{ date: string; minutesRead: number; goalMet: boolean; freezeUsed: boolean }>`
    - `currentStreak: number`
    - `longestStreak: number`
    - `dailyGoalMinutes: number | null`

- [x] Task 2: Create `getDayDetail` server action (AC: #3)
  - [x] 2.1: Create `src/actions/streaks/getDayDetail.ts` following `ActionResult<T>` pattern
  - [x] 2.2: Accept input: `{ date: string, timezone: string }` (date as YYYY-MM-DD)
  - [x] 2.3: Query `DailyProgress` for that specific date
  - [x] 2.4: Query `ReadingSession` count for that date (using timezone-aware bounds from `getDayBounds`)
  - [x] 2.5: Return `ActionResult<DayDetailData>` with:
    - `date: string`
    - `minutesRead: number`
    - `goalMinutes: number | null`
    - `goalMet: boolean`
    - `freezeUsed: boolean`
    - `sessionCount: number`

- [x] Task 3: Create `StreakHeatmap` component (AC: #2, #4)
  - [x] 3.1: Create `src/components/features/streaks/StreakHeatmap.tsx`
  - [x] 3.2: Accept props: `{ history, currentStreak, longestStreak, dailyGoalMinutes, onDaySelect }`
  - [x] 3.3: Render a GitHub-style contribution heatmap grid (7 rows for days of week, columns for weeks)
  - [x] 3.4: Color cells: green (`goalMet`), blue (`freezeUsed`), gray (data exists but missed), empty/neutral (no data)
  - [x] 3.5: Use CSS Grid for layout — 7 rows x N columns
  - [x] 3.6: Display month labels above the grid at month boundaries
  - [x] 3.7: Display day-of-week labels (Mon, Wed, Fri) on left side
  - [x] 3.8: On cell click/tap: call `onDaySelect(dateString)` callback
  - [x] 3.9: Render streak stats header: "Current Streak: X days" and "Longest Streak: X days"
  - [x] 3.10: Color legend: green = "Goal Met", blue = "Freeze Used", gray = "Missed"
  - [x] 3.11: Accessibility: each cell has `aria-label` describing the day and status, grid has role="grid", keyboard navigation with arrow keys
  - [x] 3.12: 44px minimum touch targets for day cells on mobile
  - [x] 3.13: Responsive: horizontal scroll on narrow screens, full grid on wider screens

- [x] Task 4: Create `DayDetailPanel` component (AC: #3)
  - [x] 4.1: Create `src/components/features/streaks/DayDetailPanel.tsx`
  - [x] 4.2: Accept props: `{ date, onClose }` — fetches detail via `getDayDetail` action on mount
  - [x] 4.3: Show loading skeleton while fetching
  - [x] 4.4: Display: date formatted (e.g., "Mon, Feb 3"), minutes read, goal, sessions count, freeze status
  - [x] 4.5: Show as a dismissible panel/card below heatmap or as a bottom sheet on mobile
  - [x] 4.6: Accessibility: `aria-live="polite"` for dynamic content, close button with aria-label

- [x] Task 5: Create `StreakHistoryView` container component (AC: #1, #2, #3, #4)
  - [x] 5.1: Create `src/components/features/streaks/StreakHistoryView.tsx`
  - [x] 5.2: Client component that manages state for selected day and data loading
  - [x] 5.3: On mount: call `getStreakHistory({ timezone, days: 90 })` to load initial data
  - [x] 5.4: Render `StreakHeatmap` with loaded data
  - [x] 5.5: When day selected: render `DayDetailPanel` below heatmap
  - [x] 5.6: Support loading more history via "Load more" button (extend days to 180, 365, etc.)

- [x] Task 6: Integrate streak history into Profile page (AC: #1)
  - [x] 6.1: In `src/app/(main)/profile/page.tsx`, fetch initial streak data (`getStreakData()` already available)
  - [x] 6.2: Pass `currentStreak` and `longestStreak` to `ProfileView`
  - [x] 6.3: In `ProfileReadOnlyView`, add a "Streak History" section after Reading Statistics
  - [x] 6.4: Show current streak count as tappable element that expands/navigates to `StreakHistoryView`
  - [x] 6.5: Alternatively: render `StreakHistoryView` inline within profile, collapsed by default with "View Streak History" toggle

- [x] Task 7: Add navigation from Home StreakRing to Streak History (AC: #1)
  - [x] 7.1: In `HomeContent.tsx`, wrap StreakRing area with a link/button to profile streak history
  - [x] 7.2: Use `router.push('/profile#streak-history')` or similar navigation approach
  - [x] 7.3: Ensure touch target meets 44px minimum for the tap area

- [x] Task 8: Update barrel exports (AC: all)
  - [x] 8.1: Update `src/actions/streaks/index.ts` to export `getStreakHistory`, `getDayDetail`, and their types
  - [x] 8.2: Update `src/components/features/streaks/index.ts` to export `StreakHeatmap`, `DayDetailPanel`, `StreakHistoryView`

- [x] Task 9: Write comprehensive tests (AC: all)
  - [x] 9.1: Create `src/actions/streaks/getStreakHistory.test.ts`:
    - Test: Returns empty history array when no DailyProgress records
    - Test: Returns correct history for 90-day range
    - Test: Includes goalMet and freezeUsed flags correctly
    - Test: Returns current and longest streak from UserStreak
    - Test: Unauthenticated returns error
    - Test: Handles missing UserStreak gracefully (defaults)
  - [x] 9.2: Create `src/actions/streaks/getDayDetail.test.ts`:
    - Test: Returns correct day detail with session count
    - Test: Returns defaults when no DailyProgress for date
    - Test: Counts ReadingSession records correctly
    - Test: Unauthenticated returns error
  - [x] 9.3: Create `src/components/features/streaks/StreakHeatmap.test.tsx`:
    - Test: Renders correct number of day cells for 90-day history
    - Test: Colors cells correctly (green/blue/gray)
    - Test: Displays current and longest streak
    - Test: Fires onDaySelect callback on cell click
    - Test: Shows month labels
    - Test: Shows day-of-week labels
    - Test: Shows color legend
    - Test: Accessibility: cells have aria-labels, keyboard navigation
  - [x] 9.4: Create `src/components/features/streaks/DayDetailPanel.test.tsx`:
    - Test: Shows loading skeleton initially
    - Test: Displays day details after load
    - Test: Shows freeze indicator when applicable
    - Test: Close button works
    - Test: Accessibility: aria-live region
  - [x] 9.5: Create `src/components/features/streaks/StreakHistoryView.test.tsx`:
    - Test: Loads and displays heatmap on mount
    - Test: Shows day detail panel when day selected
    - Test: Handles empty history gracefully
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
- **Duration**: `ReadingSession.duration` stored in **seconds**, `DailyProgress.minutesRead` in **minutes**
- **Zod v4**: Use `error.issues` not `error.errors` for ZodError handling
- **Toast**: Use `import { toast } from 'sonner'`

### Heatmap Implementation Approach (CRITICAL)

**Build the heatmap with pure CSS Grid + native HTML — NO external heatmap libraries.**

Rationale: The heatmap is a simple grid of colored cells. Adding a library like `react-calendar-heatmap` or `cal-heatmap` would:
1. Add unnecessary bundle weight
2. Introduce a dependency that may not match the design system
3. Be harder to customize for the specific color scheme (green/blue/gray)

**Implementation pattern:**
```typescript
// Grid layout: 7 rows (Sun-Sat) x N columns (weeks)
// Each cell = 1 day, colored by status
const CELL_SIZE = 14; // px (desktop), scale up for touch on mobile
const CELL_GAP = 3; // px

// Build week columns from history data
// Fill from 90 days ago to today
// Empty cells for days before start of data
```

**Color mapping:**
```typescript
const STATUS_COLORS = {
  goalMet: 'bg-green-500',    // #16a34a (streak.success)
  freezeUsed: 'bg-blue-500',  // #3b82f6 (streak.frozen)
  missed: 'bg-gray-300',      // data exists but goal not met, no freeze
  empty: 'bg-gray-100',       // no data for this day
} as const;
```

### Database Queries for Heatmap (CRITICAL)

**Query Pattern for History:**
```typescript
// Get all DailyProgress records for the last N days
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);
startDate.setHours(0, 0, 0, 0); // Midnight UTC

const history = await prisma.dailyProgress.findMany({
  where: {
    userId,
    date: { gte: startDate },
  },
  orderBy: { date: 'asc' },
  select: {
    date: true,
    minutesRead: true,
    goalMet: true,
    freezeUsed: true,
  },
});
```

**Key insight**: `DailyProgress.date` stores midnight UTC of the user's local date. The query returns records in chronological order. Days without records = "no data" (user had no sessions and no goal evaluation happened).

**Query Pattern for Day Detail:**
```typescript
// Count sessions for a specific day using timezone-aware bounds
const { start, end } = getDayBounds(timezone, targetDate);
const sessionCount = await prisma.readingSession.count({
  where: {
    userId,
    startedAt: { gte: start, lt: end },
  },
});
```

### Existing Code to Reuse (DO NOT REINVENT)

| What | Where | How to Use |
|------|-------|-----------|
| `ActionResult<T>` | `@/actions/books/types.ts` | Import for return types |
| `getStreakData()` | `@/actions/streaks/getStreakData.ts` | Returns currentStreak, longestStreak — use for streak stats |
| `getDayBounds()` | `@/lib/dates.ts` | For timezone-aware date bounds in session counting |
| `getTodayBounds()` | `@/lib/dates.ts` | For today's date reference |
| `getDateInTimezone()` | `@/lib/dates.ts` | For converting UTC dates to YYYY-MM-DD strings |
| `StreakRing` | `@/components/features/streaks/StreakRing.tsx` | Existing streak display — add tap handler to navigate to history |
| Prisma client | `@/lib/prisma` | Singleton Prisma instance |
| Auth | `@/lib/auth` | `auth.api.getSession({ headers: await headers() })` |
| `UserStreak` model | `prisma/schema.prisma` | `currentStreak`, `longestStreak` fields |
| `DailyProgress` model | `prisma/schema.prisma` | `date`, `minutesRead`, `goalMet`, `freezeUsed` — primary heatmap data source |
| `ReadingSession` model | `prisma/schema.prisma` | Count sessions for day detail |
| `ProfileView` | `@/components/features/profile/ProfileView.tsx` | Integration point — add streak history section in `ProfileReadOnlyView` |
| Home page | `@/app/(main)/home/HomeContent.tsx` | Add navigation from StreakRing to streak history |
| Toast | `sonner` | Already used project-wide |
| `router.refresh()` | Next.js router | Standard pattern for refetching after mutations |

### Database Schema (ALREADY EXISTS — NO CHANGES NEEDED)

**No Prisma schema changes required.** All necessary models and fields exist:

- `UserStreak`: `currentStreak`, `longestStreak` — streak stats for header display
- `DailyProgress`: `date`, `minutesRead`, `goalMet`, `freezeUsed` — heatmap cell data
- `DailyProgress` has index on `[userId, date]` — efficient range queries
- `ReadingSession`: `startedAt`, `userId` — for session count in day detail

### Integration Points

**1. Profile Page (`src/app/(main)/profile/page.tsx`):**
```typescript
// Add getStreakData() call alongside existing getUserSessionStats()
const streakResult = await getStreakData();
const streakData = streakResult.success ? streakResult.data : null;

// Pass to ProfileView
<ProfileView user={user} sessionStats={sessionStats} streakData={streakData} />
```

**2. ProfileView / ProfileReadOnlyView:**
```typescript
// Add after Reading Statistics section, before Reading Goal section
{streakData && (
  <div className="space-y-2">
    <h3 className="text-sm font-medium text-muted-foreground">Streak History</h3>
    <StreakHistoryView
      currentStreak={streakData.currentStreak}
      longestStreak={streakData.longestStreak}
    />
  </div>
)}
```

**3. Home StreakRing navigation:**
```typescript
// In HomeContent.tsx, wrap StreakRing with Link or clickable area
import Link from 'next/link';

<Link href="/profile" className="cursor-pointer" aria-label="View streak history">
  <StreakRing ... />
</Link>
```

### Emotional Design Requirements (from UX spec)

- **Positive framing**: Show streaks as achievements, not pressure
- "Your reading journey" as section title — warm, personal
- Green cells = "Goal met" (celebrate), Blue = "Freeze day" (neutral/warm), Gray = "Missed" (not judgmental)
- Longest streak displayed as achievement: "Best streak: X days"
- Empty history: "Start reading to build your streak!" — encouraging, not empty-state-shaming
- NEVER use: "You missed X days" as a negative framing

### Performance Considerations

- **Initial load**: 90 days = max 90 DailyProgress records — single query, fast
- **Grid rendering**: CSS Grid with fixed-size cells — no virtualization needed for 90 days (only ~13 columns x 7 rows)
- **Extended history** (365 days): Still only ~52 columns x 7 rows = 364 cells — no virtualization needed
- **Day detail**: Lazy-loaded on tap — single DailyProgress + ReadingSession count query
- **Bundle size**: No external heatmap library — pure CSS Grid + Tailwind classes

### Scope Boundaries

**Story 3.8 DOES:**
- Create `getStreakHistory` server action for fetching heatmap data
- Create `getDayDetail` server action for individual day details
- Create `StreakHeatmap` component (CSS Grid calendar heatmap)
- Create `DayDetailPanel` component (tappable day detail display)
- Create `StreakHistoryView` container component
- Integrate into Profile page (after Reading Statistics)
- Add navigation from Home StreakRing to profile streak history
- Handle empty state gracefully

**Story 3.8 does NOT:**
- Modify the Prisma schema (all data already exists in DailyProgress)
- Implement social comparison (e.g., "friend streaks") — future Epic 4
- Add streak sharing/export functionality — future enhancement
- Implement push notifications for streak milestones — future enhancement
- Add goal editing from streak history — already available in Profile Settings

### Previous Story Intelligence (Story 3.7)

**Key patterns to follow:**
- Server actions use `auth.api.getSession({ headers: await headers() })` — consistent auth pattern
- `prisma.$transaction()` NOT needed for this story (all queries are read-only)
- All streak actions are in `src/actions/streaks/` with barrel export in `index.ts`
- All streak components are in `src/components/features/streaks/` with barrel export
- Server action naming: avoid `use` prefix (triggers ESLint hooks rule) — use `get` prefix for reads
- Test patterns: `vi.mock('@/lib/auth')`, `vi.mock('@/lib/prisma')`, `as unknown` for type casts
- 745 tests passing across 70 files — must maintain 0 regressions
- `FreezeCountBadge` already shows freeze count near StreakRing — don't duplicate this info in heatmap

**Code review learnings from Story 3.7:**
- `useSyncExternalStore` subscribe/getSnapshot need `useCallback` for stable refs
- Goal-met takes priority over frozen for display (green > blue)
- `getStreakData` computes `freezeUsedToday` dynamically from DailyProgress — don't rely on stale `UserStreak.freezeUsedToday`

### Git Intelligence

Recent commits:
- `0607f41` feat: Implement streak freeze mechanics with review fixes (Story 3.7)
- `67445ca` fix: remove border top book detail
- `d437bf2` feat: Implement streak credit and reset logic (Story 3.6)
- `64aced6` feat: Implement daily reading goal and streak ring display (Stories 3.4, 3.5)

**Commit pattern:** `feat: [Description] (Story N.N)` — all files + tests in single commit.

### Architecture Compliance

- **Streak System maps to FR17-FR22** per architecture doc — specifically FR22 implied: "Users can view their reading consistency and streak history"
- **Primary locations:** `features/streaks/`, `actions/streaks/` — per architecture structure mapping
- **Server Actions for data fetching** — read-only queries still use server actions for auth consistency
- **No Zustand needed** — streak history data is fetched on-demand, not persisted client-side
- **Component location:** `src/components/features/streaks/` for all new streak components
- **Profile integration:** `src/components/features/profile/ProfileView.tsx` and `src/app/(main)/profile/page.tsx`
- **Lucide icons:** Use `Calendar`, `Flame`, `Snowflake`, `X` from `lucide-react` for heatmap UI

### Testing Standards

- **Framework:** Vitest + React Testing Library (NOT Jest)
- **Mock auth:** `vi.mock('@/lib/auth')`
- **Mock prisma:** `vi.mock('@/lib/prisma')`
- **Mock server actions:** `vi.mock('@/actions/streaks/getStreakHistory')` for component tests
- **Test co-location:** Test files next to source files
- **Accessibility:** aria attributes, keyboard navigation, 44px touch targets
- **Run full suite** after implementation to verify 0 regressions
- **Date mocking:** Use `vi.useFakeTimers()` to control "today" for consistent heatmap rendering in tests
- **Mock patterns:**
  ```typescript
  vi.mock('@/lib/auth', () => ({
    auth: { api: { getSession: vi.fn() } }
  }));
  vi.mock('@/lib/prisma', () => ({
    prisma: {
      dailyProgress: { findMany: vi.fn(), findFirst: vi.fn() },
      userStreak: { findUnique: vi.fn() },
      readingSession: { count: vi.fn() },
    }
  }));
  ```

### Project Structure Notes

**New files:**
- `src/actions/streaks/getStreakHistory.ts`
- `src/actions/streaks/getStreakHistory.test.ts`
- `src/actions/streaks/getDayDetail.ts`
- `src/actions/streaks/getDayDetail.test.ts`
- `src/components/features/streaks/StreakHeatmap.tsx`
- `src/components/features/streaks/StreakHeatmap.test.tsx`
- `src/components/features/streaks/DayDetailPanel.tsx`
- `src/components/features/streaks/DayDetailPanel.test.tsx`
- `src/components/features/streaks/StreakHistoryView.tsx`
- `src/components/features/streaks/StreakHistoryView.test.tsx`

**Modified files:**
- `src/actions/streaks/index.ts` (add getStreakHistory, getDayDetail exports)
- `src/components/features/streaks/index.ts` (add StreakHeatmap, DayDetailPanel, StreakHistoryView exports)
- `src/app/(main)/profile/page.tsx` (add getStreakData call, pass streakData to ProfileView)
- `src/components/features/profile/ProfileView.tsx` (add streakData prop, render StreakHistoryView in ProfileReadOnlyView)
- `src/app/(main)/home/HomeContent.tsx` (add navigation from StreakRing to profile)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-reading-sessions-habit-tracking.md#Story 3.8]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - Streak System FR17-FR22]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns - Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns - Format Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#High-Risk Technical Areas - Streak calculation HIGH]
- [Source: _bmad-output/planning-artifacts/prd.md#Streak System - reading consistency tracking]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Design - Forgiveness over shame]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System - streak.success, streak.frozen]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#StreakRing component specification]
- [Source: _bmad-output/implementation-artifacts/3-7-streak-freeze.md#Dev Notes - all patterns]
- [Source: _bmad-output/implementation-artifacts/3-7-streak-freeze.md#Completion Notes - 745 tests]
- [Source: src/actions/streaks/getStreakData.ts#streak data fetching pattern]
- [Source: src/actions/streaks/checkStreakStatus.ts#streak status checking]
- [Source: src/lib/dates.ts#timezone utilities - getDayBounds, getDateInTimezone]
- [Source: src/components/features/streaks/StreakRing.tsx#streak display component]
- [Source: src/components/features/profile/ProfileView.tsx#integration point - ProfileReadOnlyView]
- [Source: src/app/(main)/profile/page.tsx#server component data fetching]
- [Source: src/app/(main)/home/HomeContent.tsx#StreakRing rendering]
- [Source: prisma/schema.prisma#DailyProgress model - heatmap data source]
- [Source: prisma/schema.prisma#UserStreak model - streak stats]
- [Source: prisma/schema.prisma#ReadingSession model - session count for day detail]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- All 9 tasks and all subtasks completed successfully
- 39 tests added (8 + 5 + 13 + 7 + 6 = 39 across 5 test files)
- Full regression suite: **75 test files, 784 tests, 0 failures** (up from 70 files / 745 tests)
- No new TypeScript errors introduced (pre-existing TS errors in Story 3.7 test files only)
- Pure CSS Grid heatmap — no external library dependencies added
- ProfileView.test.tsx required additional mocks for transitive imports (`@/lib/auth`, `@/lib/prisma`, `next/headers`) after StreakHistoryView integration
- Emotional design followed: "Your Reading Journey" section title, positive framing, no guilt language
- Accessibility: 44px touch targets, aria-labels, keyboard navigation, aria-live regions

### Code Review Fixes Applied

- **[H1] Fixed timezone date formatting bug** in `getStreakHistory.ts`: DailyProgress.date is midnight UTC convention; was incorrectly formatting with user's timezone (shifted dates backward for west-of-UTC users). Now uses `toISOString().split('T')[0]` for correct UTC extraction.
- **[H2] Used initial props in StreakHistoryView**: `initialCurrentStreak`/`initialLongestStreak` were accepted but ignored. Now displayed during loading state for instant feedback.
- **[H3] Fixed timezone-aware date range calculation** in `getStreakHistory.ts`: Start date now computed relative to user's timezone instead of server clock.
- **[M1] Added goal clarity tooltip** in `DayDetailPanel.tsx`: Goal display now has tooltip "Your current daily reading goal" to distinguish from historical.
- **[M2] Added error state handling** in `StreakHistoryView.tsx`: Error and empty states now properly separated with "Try again" retry button.
- **[M4] Parallelized database queries** in both `getStreakHistory.ts` and `getDayDetail.ts` using `Promise.all()` for better latency.
- **[Additional] Fixed DailyProgress query bug** in `getDayDetail.ts`: Was using timezone-aware bounds (getDayBounds) to query DailyProgress.date, which missed records for users west of UTC. Now queries with exact UTC midnight date.

### File List

**New files (10):**
- `src/actions/streaks/getStreakHistory.ts`
- `src/actions/streaks/getStreakHistory.test.ts`
- `src/actions/streaks/getDayDetail.ts`
- `src/actions/streaks/getDayDetail.test.ts`
- `src/components/features/streaks/StreakHeatmap.tsx`
- `src/components/features/streaks/StreakHeatmap.test.tsx`
- `src/components/features/streaks/DayDetailPanel.tsx`
- `src/components/features/streaks/DayDetailPanel.test.tsx`
- `src/components/features/streaks/StreakHistoryView.tsx`
- `src/components/features/streaks/StreakHistoryView.test.tsx`

**Modified files (6):**
- `src/actions/streaks/index.ts` — added getStreakHistory, getDayDetail exports
- `src/components/features/streaks/index.ts` — added StreakHeatmap, DayDetailPanel, StreakHistoryView exports
- `src/app/(main)/profile/page.tsx` — added getStreakData() call, pass streakData to ProfileView
- `src/components/features/profile/ProfileView.tsx` — added streakData prop, render StreakHistoryView section
- `src/app/(main)/home/HomeContent.tsx` — wrapped StreakRing with Link to /profile#streak-history
- `src/components/features/profile/ProfileView.test.tsx` — added transitive import mocks
