# Story 3.3: Session History

Status: done

## Story

As a **user**,
I want **to view my reading session history**,
so that **I can see my reading patterns and total time**.

## Acceptance Criteria

1. **Book Session List:** Given I am on a book detail page, When I scroll to the "Your Sessions" section, Then I see a list of my reading sessions for this book, And each session shows: date, duration, time of day, And sessions are sorted by most recent first.

2. **Pagination:** Given I have many sessions for a book, When I view the history, Then I see the first 10 sessions, And I can tap "Show more" to load additional sessions.

3. **Profile Reading Stats:** Given I am on my profile page, When I view my reading statistics, Then I see my total reading time across all books, And I see total sessions count, And I see average session duration.

4. **Cross-Book Aggregation:** Given I have sessions for multiple books, When I view my profile stats, Then the totals aggregate correctly across all books, And the data updates in real-time after logging a session.

## Tasks / Subtasks

- [x] Task 1: Create `getBookSessions` server action (AC: #1, #2)
  - [x] 1.1 Create `src/actions/sessions/getBookSessions.ts` following ActionResult pattern
  - [x] 1.2 Define Zod schema: `{ bookId: string, cursor?: string, limit?: number (default 10) }`
  - [x] 1.3 Authenticate via `auth.api.getSession({ headers: await headers() })`
  - [x] 1.4 Query `prisma.readingSession.findMany()` with cursor-based pagination: `where: { userId, bookId }`, `orderBy: { startedAt: 'desc' }`, `take: limit + 1` (extra to detect hasMore)
  - [x] 1.5 Return `ActionResult<{ sessions: ReadingSession[], nextCursor: string | null }>` — if results.length > limit, pop last and set nextCursor = last.id
  - [x] 1.6 Create `src/actions/sessions/getBookSessions.test.ts`

- [x] Task 2: Create `getUserSessionStats` server action (AC: #3, #4)
  - [x] 2.1 Create `src/actions/sessions/getUserSessionStats.ts`
  - [x] 2.2 Use `prisma.readingSession.aggregate()`: `_sum: { duration: true }`, `_count: { id: true }`, `_avg: { duration: true }`, with `where: { userId }`
  - [x] 2.3 Return `ActionResult<{ totalSeconds: number, sessionCount: number, avgSeconds: number }>`
  - [x] 2.4 Handle null aggregates (no sessions yet): return zeros
  - [x] 2.5 Create `src/actions/sessions/getUserSessionStats.test.ts`

- [x] Task 3: Create `SessionList` component (AC: #1, #2)
  - [x] 3.1 Create `src/components/features/sessions/SessionList.tsx` as client component
  - [x] 3.2 Accept props: `bookId: string`, `initialSessions: ReadingSession[]`, `initialCursor: string | null`
  - [x] 3.3 Display each session as a `SessionListItem`: date (formatted via `Intl.DateTimeFormat`), duration (reuse `formatTime` from `./types`), time of day (e.g., "2:30 PM")
  - [x] 3.4 "Show more" button at bottom when `nextCursor !== null` — calls `getBookSessions` with cursor, appends to list
  - [x] 3.5 Loading state on "Show more" button while fetching
  - [x] 3.6 Empty state: "No reading sessions yet. Start a session to see your history here."
  - [x] 3.7 Create `src/components/features/sessions/SessionList.test.tsx`

- [x] Task 4: Create `ReadingStats` component (AC: #3, #4)
  - [x] 4.1 Create `src/components/features/sessions/ReadingStats.tsx` as server component or accept stats as props
  - [x] 4.2 Display: total reading time (formatted as hours/minutes), total sessions count, average session duration
  - [x] 4.3 Use Card from shadcn/ui for container, consistent with ProfileView style
  - [x] 4.4 Handle zero-state gracefully: "Start reading to see your stats!"
  - [x] 4.5 Create `src/components/features/sessions/ReadingStats.test.tsx`

- [x] Task 5: Integrate SessionList into BookDetail (AC: #1, #2)
  - [x] 5.1 In `src/app/(main)/book/[id]/page.tsx`: fetch initial 10 sessions via `getBookSessions` (server-side)
  - [x] 5.2 Pass sessions and cursor to BookDetail as props
  - [x] 5.3 In `BookDetail.tsx`: add `<SessionList>` section after BookDescription and before BookDetailActions
  - [x] 5.4 Wrap with section heading: "Your Sessions"
  - [x] 5.5 Only show for authenticated users who own this book

- [x] Task 6: Integrate ReadingStats into profile page (AC: #3, #4)
  - [x] 6.1 In `src/app/(main)/profile/page.tsx`: fetch session stats via `getUserSessionStats` (server-side)
  - [x] 6.2 Pass stats to ProfileView as new prop
  - [x] 6.3 In `ProfileView.tsx`: add `<ReadingStats>` section (before or after existing sections)
  - [x] 6.4 Update ProfileView props interface to include stats

- [x] Task 7: Update barrel exports and write integration tests
  - [x] 7.1 Add `SessionList`, `ReadingStats` exports to `src/components/features/sessions/index.ts`
  - [x] 7.2 Add `getBookSessions`, `getUserSessionStats` exports to `src/actions/sessions/index.ts`
  - [x] 7.3 Write integration test verifying BookDetail renders session list
  - [x] 7.4 Ensure all existing tests pass (0 regressions)

## Dev Notes

### Architecture Patterns & Constraints

- **Server Action pattern:** All server actions return `ActionResult<T>` (import from `@/actions/books/types`). Validate with Zod, authenticate via `auth.api.getSession({ headers: await headers() })`, then query DB. See `src/actions/sessions/saveReadingSession.ts` for reference in same domain.
- **Cursor-based pagination:** Use `take: limit + 1` to detect `hasMore`. If result count > limit, pop the extra record and use its `id` as `nextCursor`. This avoids a separate count query.
- **Prisma aggregate:** `_sum`, `_count`, `_avg` return `number | null`. Always coalesce: `stats._sum.duration ?? 0`.
- **Date formatting:** Use native `Intl.DateTimeFormat` — do NOT add date-fns. For time-of-day: `new Date(startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })`. For date: `new Date(startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })`.
- **Duration formatting:** Reuse `formatTime()` from `@/components/features/sessions/types` — already handles HH:MM:SS and MM:SS.
- **Import convention:** ALWAYS use `@/` alias for cross-boundary imports.
- **Component file limit:** ~200 lines per file.
- **Toast notifications:** Use `import { toast } from 'sonner'`.

### Existing Code to Reuse — DO NOT Reinvent

- **`formatTime(seconds: number)`** in `src/components/features/sessions/types.ts:9-18` — formats seconds into MM:SS or HH:MM:SS.
- **`ActionResult<T>`** in `src/actions/books/types.ts:3-8` — discriminated union for all server actions.
- **`saveReadingSession.ts`** in `src/actions/sessions/saveReadingSession.ts` — reference for auth pattern, Zod validation, Prisma query in sessions domain.
- **`Card` component** from `@/components/ui/card` — used in ProfileView for section containers.
- **`Button` component** from `@/components/ui/button` — use `variant="outline"` for "Show more".
- **`Skeleton` component** from `@/components/ui/skeleton` — for loading states.

### Source Tree Components to Touch

**New files:**
- `src/actions/sessions/getBookSessions.ts`
- `src/actions/sessions/getBookSessions.test.ts`
- `src/actions/sessions/getUserSessionStats.ts`
- `src/actions/sessions/getUserSessionStats.test.ts`
- `src/components/features/sessions/SessionList.tsx`
- `src/components/features/sessions/SessionList.test.tsx`
- `src/components/features/sessions/ReadingStats.tsx`
- `src/components/features/sessions/ReadingStats.test.tsx`

**Modified files:**
- `src/actions/sessions/index.ts` (add new exports)
- `src/components/features/sessions/index.ts` (add new exports)
- `src/app/(main)/book/[id]/page.tsx` (fetch sessions, pass to BookDetail)
- `src/components/features/books/BookDetail.tsx` (add SessionList section)
- `src/app/(main)/profile/page.tsx` (fetch stats, pass to ProfileView)
- `src/components/features/profile/ProfileView.tsx` (add ReadingStats section)

### Critical Implementation Details

- **BookDetail.tsx is 96 lines** — add SessionList after `<BookDescription>` (line 81) and before `<BookDetailActions>` (line 83). The section should be wrapped in a heading div similar to other sections.
- **ProfileView.tsx is 145 lines** — add ReadingStats as a new section. Use the existing pattern: `<div className="space-y-2"><h3 className="text-sm font-medium text-muted-foreground">` for section heading.
- **Book detail page (`book/[id]/page.tsx`)** is a Server Component. Fetch initial sessions there via `getBookSessions({ bookId })` and pass to BookDetail. This keeps the initial load server-rendered.
- **Profile page (`profile/page.tsx`)** is a Server Component. Fetch stats there and pass to ProfileView.
- **ReadingSession.duration is `Int` (seconds)** — not minutes. All formatting should treat the value as seconds.
- **Auth in server actions:** Use `auth.api.getSession({ headers: await headers() })` — NOT `auth()` or other patterns. Import: `import { auth } from '@/lib/auth'` and `import { headers } from 'next/headers'`.
- **The `prisma.readingSession` model** has indexes on `[userId]`, `[bookId]`, and `[userId, bookId]`. The composite index is perfect for `getBookSessions` queries.
- **"Show more" client interaction:** SessionList must be a client component to manage loaded sessions state and cursor. Initial data is passed as props from the server component page.
- **Empty states matter:** Both SessionList and ReadingStats need empty states for users with no sessions yet.
- **No `useEffect` for initial data fetch.** Initial sessions come from server props. Only the "Show more" click triggers client-side fetching via server action.
- **Prisma `aggregate` returns nulls** for empty result sets. Always coalesce: `stats._sum.duration ?? 0`, `stats._count.id ?? 0`, `stats._avg.duration ?? 0`.

### Testing Standards

- **Framework:** Vitest + React Testing Library
- **Server action tests:** Mock `@/lib/auth` and `@/lib/prisma`. Test: valid query returns sessions, cursor pagination works, empty result, auth failure, aggregate stats are correct.
- **Component tests:** Mock server actions (`@/actions/sessions`). Test: renders session list, "Show more" loads more, empty state, ReadingStats displays correct values, zero-state.
- **Accessibility:** `data-testid` attributes on key elements, aria-labels on interactive elements, minimum 44px touch targets on "Show more" button.
- **Mock patterns for new actions:** `vi.mock('@/actions/sessions', () => ({ getBookSessions: vi.fn(), getUserSessionStats: vi.fn(), saveReadingSession: vi.fn() }))`.

### Previous Story 3.2 Learnings

- `saveReadingSession.ts` uses `auth.api.getSession({ headers: await headers() })` — follow this exact pattern for new actions.
- Zod v4 API uses `error.issues` not `error.errors` for ZodError handling.
- Transitive imports of server actions in tests cause DATABASE_URL errors — mock `@/actions/sessions` in any test file that imports components using session actions.
- `useTimerStore.setState()` in tests for state setup; `vi.mock('idb-keyval')` to prevent actual IndexedDB access.
- The `ActionResult` type lives in `src/actions/books/types.ts` — import it, don't redefine it.

### Git Intelligence

Recent commits:
- `9afab03` feat: Implement save reading session with offline support and session summary (Story 3.2)
- `2b55181` feat: Implement session timer with persistence and code review fixes (Story 3.1)
- Pattern: All files committed together, tests included, direct to main

### Project Structure Notes

- Server actions for sessions already live in `src/actions/sessions/` — add new files alongside `saveReadingSession.ts`.
- Session components in `src/components/features/sessions/` — add SessionList and ReadingStats here.
- ProfileView is in `src/components/features/profile/ProfileView.tsx` — modify to accept and display stats.
- BookDetail is in `src/components/features/books/BookDetail.tsx` — modify to render SessionList.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-reading-sessions-habit-tracking.md#Story 3.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture - State Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/implementation-artifacts/3-2-save-reading-session.md#Dev Notes]
- [Source: src/actions/sessions/saveReadingSession.ts#auth pattern]
- [Source: src/actions/books/types.ts#ActionResult]
- [Source: src/components/features/sessions/types.ts#formatTime]
- [Source: src/components/features/books/BookDetail.tsx#component structure]
- [Source: src/components/features/profile/ProfileView.tsx#section pattern]
- [Source: prisma/schema.prisma#ReadingSession model]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- All 7 tasks completed successfully
- 57 test files, 582 tests all passing
- TypeScript typecheck clean
- Used `z.input` instead of `z.infer` for Zod schemas with `.default()` to keep optional params
- Updated 6 existing test files with new session action mocks to prevent transitive DATABASE_URL errors
- Fixed pre-existing `image: null` missing from ProfileView.test.tsx mockUser

### File List

New files:
- src/actions/sessions/getBookSessions.ts
- src/actions/sessions/getBookSessions.test.ts
- src/actions/sessions/getUserSessionStats.ts
- src/actions/sessions/getUserSessionStats.test.ts
- src/components/features/sessions/SessionList.tsx
- src/components/features/sessions/SessionList.test.tsx
- src/components/features/sessions/ReadingStats.tsx
- src/components/features/sessions/ReadingStats.test.tsx

Modified files:
- src/actions/sessions/index.ts
- src/components/features/sessions/index.ts
- src/app/(main)/book/[id]/page.tsx
- src/app/(main)/book/[id]/page.test.tsx
- src/components/features/books/BookDetail.tsx
- src/components/features/books/BookDetail.test.tsx
- src/components/features/books/BookDetailActions.test.tsx
- src/app/(main)/profile/page.tsx
- src/components/features/profile/ProfileView.tsx
- src/components/features/profile/ProfileView.test.tsx
- src/components/features/sessions/SessionTimer.test.tsx
- src/components/features/sessions/integration.test.tsx
- src/components/layout/AppShell.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-3-session-history.md
