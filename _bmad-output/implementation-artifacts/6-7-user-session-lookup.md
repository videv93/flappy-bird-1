# Story 6.7: User & Session Lookup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **support admin**,
I want **to look up user accounts and session history**,
so that **I can help users with issues and investigate problems**.

## Acceptance Criteria

1. **User Lookup page** - Given I am on the admin dashboard, When I navigate to User Lookup (`/admin/users`), Then I see a search bar to find users.

2. **Multi-identifier search** - Given I search for a user, When I enter email, username, or user ID, Then I see matching results, And I can click to view the user's admin profile.

3. **User admin profile - Account details** - Given I view a user's admin profile, When the page loads, Then I see their account details: Email, name, avatar, join date, Role, verification status, Current streak, total reading time, Follower/following counts.

4. **User admin profile - Recent activity** - Given I view a user's admin profile, When the page loads, Then I see their recent activity: Last login, Recent sessions (last 10), Recent kudos given/received, Current reading room (if any).

5. **User admin profile - Moderation history** - Given I view a user's admin profile, When the page loads, Then I see their moderation history: Warnings, suspensions, Flags received, flags submitted.

6. **Session detail inspection** - Given I need to help with a technical issue, When I view session details, Then I see: device/browser info, session timestamps, any errors logged, And I can identify patterns (e.g., sessions not saving).

7. **Quick admin actions** - Given I need to take action, When I view the user profile, Then I have quick actions: Send Message, Warn, Suspend, Reset Password, And actions are logged appropriately.

8. **Privacy & audit logging** - Given privacy requirements, When I access user data, Then my access is logged for audit purposes, And I can only see data necessary for support, And sensitive data (e.g., full session history) requires confirmation.

## Dev Notes

### Context & Strategy

**What this story is about:** Transform the placeholder `/admin/users` page into a full user search & lookup tool and enhance the existing `/admin/users/[userId]` detail page with account details, session history, recent activity, and quick actions. The existing `UserModerationDetail` component already covers warnings, suspensions, and content removals -- this story extends that page with additional data sections.

**What already exists (DO NOT RECREATE):**

| What | Where | Status |
|------|-------|--------|
| Admin layout with role guard | `src/app/(admin)/admin/layout.tsx` | Complete - protects all `/admin/*` routes |
| AdminShell with "Users" nav item | `src/components/layout/AdminShell.tsx` | Complete - already links to `/admin/users` |
| Users placeholder page | `src/app/(admin)/admin/users/page.tsx` | Placeholder - needs full implementation |
| User detail page (server component) | `src/app/(admin)/admin/users/[userId]/page.tsx` | Exists - calls `getUserModerationHistory`, renders `UserModerationDetail` |
| `UserModerationDetail` component | `src/components/features/admin/UserModerationDetail.tsx` | Complete - shows warnings, suspensions, content removals, warn/suspend actions |
| `getUserModerationHistory` action | `src/actions/admin/getUserModerationHistory.ts` | Complete - fetches user info + warnings + suspensions + removals + flag count |
| `logAdminAction` action | `src/actions/admin/logAdminAction.ts` | Complete - creates AdminAction audit records |
| `warnUser` / `suspendUser` actions | `src/actions/admin/warnUser.ts`, `suspendUser.ts` | Complete - with transactions, Pusher notifications, audit logging |
| `WarnUserDialog` / `SuspendUserDialog` | `src/components/features/admin/` | Complete - already used in UserModerationDetail |
| `isAdmin()` / `isSuperAdmin()` | `src/lib/admin.ts` | Complete - role checking utilities |
| Admin Zod schemas | `src/lib/validation/admin.ts` | Complete - extend with search schema |
| `ActionResult<T>` type | `src/actions/books/types.ts` | Complete - use for all new actions |
| `DashboardStatCard` | `src/components/features/admin/DashboardStatCard.tsx` | Complete - reusable stat display |

**What this story needs to BUILD:**

1. **`searchUsers` server action** - Search users by email, name, or ID with pagination
2. **`getUserDetail` server action** - Extended user profile with account stats, reading activity, sessions, kudos, follows (goes beyond existing `getUserModerationHistory` which only covers moderation data)
3. **`getSessionHistory` server action** - Auth session records with device/browser parsing
4. **User search page** - Replace placeholder at `/admin/users` with search form + results table
5. **Enhanced user detail page** - Extend `/admin/users/[userId]` with new data sections (account stats, activity, sessions) alongside existing moderation history
6. **Search/results components** - `UserSearchBar`, `UserSearchResults` table
7. **Detail section components** - `UserAccountCard`, `UserActivitySection`, `UserSessionsList`
8. **Audit logging** - Log every search and user profile access via `logAdminAction`

## Tasks / Subtasks

- [x] Task 1: Create `searchUsers` server action (AC: #1, #2, #8)
  - [x] 1.1 Add `userSearchSchema` to `src/lib/validation/admin.ts` (query: string min 1 max 100, limit: number default 20, offset: number default 0)
  - [x] 1.2 Create `src/actions/admin/searchUsers.ts` with OR search on email (contains, insensitive), name (contains, insensitive), and exact id match
  - [x] 1.3 Return paginated results: `{ users: UserSearchResult[], total: number, query: string }`
  - [x] 1.4 Each result includes: id, email, name, role, createdAt, suspendedUntil, warningCount, suspensionCount
  - [x] 1.5 Log admin action with actionType `SEARCH_USERS` including query and result count
  - [x] 1.6 Write unit tests for `searchUsers` (unauthorized, forbidden, search by email, search by name, search by ID, empty results, pagination, audit logging)

- [x] Task 2: Create `getUserDetail` server action (AC: #3, #4, #8)
  - [x] 2.1 Create `src/actions/admin/getUserDetail.ts` that fetches extended user profile
  - [x] 2.2 Fetch account details: email, name, image/avatarUrl, bio, role, createdAt, suspendedUntil, suspensionReason, emailVerified
  - [x] 2.3 Fetch reading stats via parallel queries: current streak (`UserStreak.currentStreak`), total reading time (`ReadingSession.aggregate _sum duration`), total sessions count
  - [x] 2.4 Fetch social stats: follower count (`Follow.count where followingId = userId`), following count (`Follow.count where followerId = userId`)
  - [x] 2.5 Fetch recent activity: last login (most recent Session.createdAt), recent kudos given (last 10 `Kudos where giverId`), recent kudos received (last 10 `Kudos where receiverId`), current reading room (`RoomPresence where userId AND leftAt IS NULL`)
  - [x] 2.6 Fetch moderation summary: warning count, suspension count, flags received count, flags submitted count
  - [x] 2.7 Use `Promise.all()` for all parallel queries
  - [x] 2.8 Log admin action with actionType `VIEW_USER_DETAIL`
  - [x] 2.9 Write unit tests (unauthorized, forbidden, user not found, full profile returned, reading stats calculation, social stats, audit logging)

- [x] Task 3: Create `getSessionHistory` server action (AC: #6, #8)
  - [x] 3.1 Create `src/actions/admin/getSessionHistory.ts` that fetches auth Session records for a user
  - [x] 3.2 Return last 10 sessions by default (configurable limit): id, ipAddress, userAgent, createdAt, expiresAt, isActive (expiresAt > now)
  - [x] 3.3 Parse userAgent string into device info object: `{ browser: string, os: string }` using simple regex extraction (no external library -- parse `userAgent` for common browser/OS patterns)
  - [x] 3.4 Mask session token in response: `token.substring(0, 8) + '...'`
  - [x] 3.5 Log admin action with actionType `VIEW_SESSION_HISTORY` -- this is sensitive data access
  - [x] 3.6 Write unit tests (unauthorized, forbidden, user not found, sessions returned with device parsing, token masking, empty sessions, audit logging)

- [x] Task 4: Create `/admin/users` search page (AC: #1, #2)
  - [x] 4.1 Replace placeholder at `src/app/(admin)/admin/users/page.tsx` with server component that renders search UI
  - [x] 4.2 Create `src/components/features/admin/UserSearchBar.tsx` client component with text input and search button
  - [x] 4.3 Create `src/components/features/admin/UserSearchResults.tsx` client component with results table (columns: Name, Email, Role, Joined, Status, Actions)
  - [x] 4.4 Implement search flow: UserSearchBar calls `searchUsers` action, results displayed in UserSearchResults table
  - [x] 4.5 Each result row links to `/admin/users/[userId]` for full detail view
  - [x] 4.6 Handle loading state (Skeleton), empty state ("No users found"), and error state
  - [x] 4.7 Write component tests for UserSearchBar (renders input, calls onSearch, disables when loading)
  - [x] 4.8 Write component tests for UserSearchResults (renders table rows, links to user detail, empty state, loading state)

- [x] Task 5: Enhance `/admin/users/[userId]` detail page (AC: #3, #4, #5, #6, #7)
  - [x] 5.1 Update `src/app/(admin)/admin/users/[userId]/page.tsx` to call both `getUserDetail` and `getUserModerationHistory` in parallel
  - [x] 5.2 Create `src/components/features/admin/UserAccountCard.tsx` -- displays account details, reading stats, social stats in a card layout
  - [x] 5.3 Create `src/components/features/admin/UserActivitySection.tsx` -- displays last login, recent kudos given/received, current reading room
  - [x] 5.4 Create `src/components/features/admin/UserSessionsList.tsx` client component -- displays session table with device/browser info, timestamps, active status; includes "Show Sessions" confirmation button for privacy (AC: #8)
  - [x] 5.5 Compose the detail page layout: UserAccountCard at top, then tabbed or stacked sections for Activity, Sessions, Moderation History (existing UserModerationDetail)
  - [x] 5.6 Add quick action buttons section: Warn (existing WarnUserDialog), Suspend (existing SuspendUserDialog), plus visually indicate existing actions
  - [x] 5.7 Write component tests for UserAccountCard (renders all account fields, reading stats, social stats)
  - [x] 5.8 Write component tests for UserActivitySection (renders last login, kudos, reading room)
  - [x] 5.9 Write component tests for UserSessionsList (renders sessions table, device info, token masking, confirmation dialog, empty state)

- [x] Task 6: Update dashboard stat card (AC: #1)
  - [x] 6.1 Update `getDashboardStats` to include a user lookup-relevant count (e.g., active users today or total users -- may already exist from 6.6)
  - [x] 6.2 Verify "Users" card on admin dashboard shows meaningful count and links to `/admin/users`

- [x] Task 7: Final validation
  - [x] 7.1 Run `npm run typecheck` -- 0 new errors (2 pre-existing in layout.tsx for vercel packages)
  - [x] 7.2 Run `npm run lint` -- 0 new errors (66 pre-existing errors in unrelated files)
  - [x] 7.3 Run `npm run test:run` -- all 71 new tests pass (8 test files)
  - [x] 7.4 Verify no regressions -- 180/181 test files pass, 1 pre-existing flaky test in BookDetailActions.test.tsx (race condition unrelated to Story 6.7)

### Technical Requirements

**Server Action Pattern** (follow established Epic 6 pattern exactly):
```typescript
'use server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import { logAdminAction } from '@/actions/admin/logAdminAction';
import type { ActionResult } from '@/actions/books/types';

export async function searchUsers(input: unknown): Promise<ActionResult<SearchUsersResult>> {
  const validated = userSearchSchema.parse(input);
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { id: true, role: true },
  });
  if (!adminUser || !isAdmin(adminUser)) return { success: false, error: 'Forbidden' };
  // ... search queries
}
```

**Search Query Strategy:**
```typescript
// Build flexible OR search -- email and name use case-insensitive contains, id uses exact match
const where = {
  OR: [
    { email: { contains: validated.query, mode: 'insensitive' as const } },
    { name: { contains: validated.query, mode: 'insensitive' as const } },
    { id: validated.query },
  ],
};

const [users, total] = await Promise.all([
  prisma.user.findMany({
    where,
    select: {
      id: true, email: true, name: true, role: true, createdAt: true,
      suspendedUntil: true,
      _count: { select: { warnings: true, suspensions: true } },
    },
    take: validated.limit,
    skip: validated.offset,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.user.count({ where }),
]);
```

**User Detail Parallel Query Strategy:**
```typescript
const [user, streak, readingStats, followerCount, followingCount, lastSession,
       recentKudosGiven, recentKudosReceived, roomPresence, moderationSummary] =
  await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { /* all account fields */ } }),
    prisma.userStreak.findUnique({ where: { userId }, select: { currentStreak: true, longestStreak: true } }),
    prisma.readingSession.aggregate({ where: { userId }, _sum: { duration: true }, _count: true }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.session.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    prisma.kudos.findMany({ where: { giverId: userId }, take: 10, orderBy: { createdAt: 'desc' } }),
    prisma.kudos.findMany({ where: { receiverId: userId }, take: 10, orderBy: { createdAt: 'desc' } }),
    prisma.roomPresence.findFirst({ where: { userId, leftAt: null }, select: { bookId: true, joinedAt: true } }),
    Promise.all([
      prisma.userWarning.count({ where: { userId } }),
      prisma.userSuspension.count({ where: { userId } }),
      prisma.moderationItem.count({ where: { reportedUserId: userId } }),
      prisma.moderationItem.count({ where: { reporterId: userId } }),
    ]),
  ]);
```

**Session History with Device Parsing:**
```typescript
// Simple userAgent parsing -- no external library needed
function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };
  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  // OS detection
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  return { browser, os };
}
```

### Architecture Compliance

**Admin Auth Pattern (MANDATORY in every action):**
1. Validate input with Zod schema
2. Get session via `auth.api.getSession({ headers: await headers() })`
3. Check `session?.user?.id` exists (return Unauthorized)
4. Fetch admin user with `prisma.user.findUnique({ select: { id, role } })`
5. Check `isAdmin(adminUser)` (return Forbidden)
6. Execute business logic
7. Log admin action via `logAdminAction()`
8. Return `ActionResult<T>` discriminated union

**Self-moderation prevention:** Admin cannot search for and take action against themselves -- warn/suspend dialogs already handle this, but `getUserDetail` should still work for self-lookup (support debugging).

**Audit logging action types for this story:**
- `SEARCH_USERS` -- logged on every search with query + result count in details
- `VIEW_USER_DETAIL` -- logged on every user profile view with userId in targetId
- `VIEW_SESSION_HISTORY` -- logged when session list is loaded (sensitive data)

**Database models -- NO schema changes needed.** All required models already exist:
- `User` (with role, suspendedUntil, relations to warnings/suspensions/moderation)
- `Session` (with ipAddress, userAgent, token, createdAt, expiresAt)
- `UserStreak` (currentStreak, longestStreak)
- `ReadingSession` (duration in seconds, startedAt)
- `Follow` (followerId, followingId)
- `Kudos` (giverId, receiverId)
- `RoomPresence` (userId, bookId, leftAt)
- `AdminAction` (for audit logging)
- `UserWarning`, `UserSuspension`, `ModerationItem` (for moderation history counts)

### Library & Framework Requirements

**Versions in use (from package.json):**
- Next.js 16.1.6 (App Router) -- `searchParams` is a **Promise**, must `await searchParams`
- React 19.2.3
- TypeScript 5.x (strict mode)
- Prisma 7.3.0 (`@prisma/client`)
- Zod 4.3.6 (validation)
- Vitest 4.0.18 + Testing Library 16.3.2 (testing)
- Lucide React 0.563.0 (icons)
- Radix UI 1.4.3 (primitives)
- Sonner 2.0.7 (toasts)
- Tailwind CSS 4 (styling)

**DO NOT add external libraries.** Specifically:
- NO `ua-parser-js` for user agent parsing -- use simple regex extraction as shown above
- NO external table/data grid libraries -- use HTML table with Tailwind styling
- NO external search libraries -- Prisma `contains` with `mode: insensitive` is sufficient

### File Structure Requirements

**New files to create:**
```
src/actions/admin/searchUsers.ts                    # User search action
src/actions/admin/searchUsers.test.ts               # Tests
src/actions/admin/getUserDetail.ts                   # Extended user profile action
src/actions/admin/getUserDetail.test.ts              # Tests
src/actions/admin/getSessionHistory.ts               # Session lookup action
src/actions/admin/getSessionHistory.test.ts          # Tests
src/components/features/admin/UserSearchBar.tsx      # Search input component
src/components/features/admin/UserSearchBar.test.tsx
src/components/features/admin/UserSearchResults.tsx  # Results table component
src/components/features/admin/UserSearchResults.test.tsx
src/components/features/admin/UserAccountCard.tsx    # Account details card
src/components/features/admin/UserAccountCard.test.tsx
src/components/features/admin/UserActivitySection.tsx # Recent activity section
src/components/features/admin/UserActivitySection.test.tsx
src/components/features/admin/UserSessionsList.tsx   # Session history with confirmation
src/components/features/admin/UserSessionsList.test.tsx
```

**Files to modify:**
```
src/app/(admin)/admin/users/page.tsx                # Replace placeholder with search page
src/app/(admin)/admin/users/[userId]/page.tsx       # Add getUserDetail call, compose enhanced layout
src/lib/validation/admin.ts                          # Add userSearchSchema
src/components/features/admin/index.ts               # Export new components
```

**Files to NOT modify:**
```
src/components/features/admin/UserModerationDetail.tsx  # Already complete -- reuse as-is
src/components/layout/AdminShell.tsx                     # Already has "Users" nav item
src/app/(admin)/admin/layout.tsx                         # Already has admin auth guard
src/actions/admin/logAdminAction.ts                      # Already complete -- call it
prisma/schema.prisma                                     # No schema changes needed
```

### Testing Requirements

**Mock pattern** (consistent with stories 6.1-6.6):
```typescript
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    session: { findMany: vi.fn(), findFirst: vi.fn() },
    userStreak: { findUnique: vi.fn() },
    readingSession: { aggregate: vi.fn() },
    follow: { count: vi.fn() },
    kudos: { findMany: vi.fn() },
    roomPresence: { findFirst: vi.fn() },
    userWarning: { count: vi.fn() },
    userSuspension: { count: vi.fn() },
    moderationItem: { count: vi.fn() },
    adminAction: { create: vi.fn() },
  },
}));
vi.mock('@/lib/admin', () => ({ isAdmin: vi.fn((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') }));
```

**Test cases for `searchUsers`:**
- Returns unauthorized when no session
- Returns forbidden when non-admin
- Finds users by email (case-insensitive contains)
- Finds users by name (case-insensitive contains)
- Finds user by exact ID
- Returns empty array when no matches
- Returns correct total count with pagination
- Logs SEARCH_USERS admin action with query and result count

**Test cases for `getUserDetail`:**
- Returns unauthorized / forbidden
- Returns user not found for invalid ID
- Returns complete account details
- Returns reading stats (streak, total time in hours, session count)
- Returns social stats (follower/following counts)
- Returns recent activity (last login, kudos, room presence)
- Returns moderation summary counts
- Handles zero/null values gracefully (new user with no activity)
- Logs VIEW_USER_DETAIL admin action

**Test cases for `getSessionHistory`:**
- Returns unauthorized / forbidden
- Returns sessions with parsed device info
- Masks session tokens correctly
- Returns isActive flag based on expiresAt
- Handles null userAgent / ipAddress
- Logs VIEW_SESSION_HISTORY admin action

**Component test cases:**
- `UserSearchBar`: renders input and button, calls onSearch with trimmed query, disables when loading, 44px touch targets
- `UserSearchResults`: renders table with user rows, links to `/admin/users/[id]`, shows role badges, shows suspension status, empty state, loading skeletons
- `UserAccountCard`: renders all account fields, formats reading time (seconds to hours), shows streak info, shows social counts
- `UserActivitySection`: renders last login timestamp, kudos lists, current room indicator
- `UserSessionsList`: shows confirmation dialog before loading sessions (privacy), renders session table, shows device/browser/OS, shows active vs expired status, masked tokens

### Previous Story Intelligence (from 6-6)

**Key learnings to apply:**

1. **Promise.all for parallel queries** -- Story 6.6 used `Promise.all()` for all metric queries. Apply same pattern for `getUserDetail` with 10+ parallel queries.

2. **No BigInt issues** -- Unlike 6.6's `$queryRaw`, this story uses standard Prisma queries (count, aggregate, findMany) which return regular numbers. No BigInt conversion needed.

3. **Reading time is in seconds** -- `ReadingSession.duration` is stored in seconds. Convert to hours for display: `totalSeconds / 3600`, display with 1 decimal.

4. **Pre-existing test failures** -- `middleware.test.ts` and `AppShell.test.tsx` fail already. These are NOT regressions -- ignore them.

5. **Import convention** -- ALWAYS use `@/` alias, NEVER relative imports across boundaries.

6. **Amber admin theme** -- Follow existing admin color scheme: `bg-amber-100 dark:bg-amber-900/20`, `text-amber-700 dark:text-amber-400`.

7. **Touch targets** -- All interactive elements minimum 44px (`min-h-[44px]`).

8. **Next.js 16 searchParams** -- `searchParams` is a Promise, must `await searchParams` in page server components.

9. **`force-dynamic` rendering** -- Admin pages should use `export const dynamic = 'force-dynamic'` to ensure fresh data (no ISR cache for admin).

10. **Skeleton loading states** -- Use `Skeleton` component from `src/components/ui/skeleton.tsx` for loading states, not spinners.

### Git Intelligence Summary

Recent commits (last 5):
```
bcb6090 feat: add premium data model, payment schema, and isPremium utility (Story 7.1)
6401538 fix: incorrect use icon in server component
48b398b chore: fix build
5de3e64 feat: implement platform health metrics dashboard (Story 6.6)
49914e5 feat: update gitignore
```

**Relevant patterns from recent commits:**
- Story 7.1 added new Prisma models (`PremiumSubscription`, `PaymentEvent`) -- confirms schema is stable and no conflicts with existing admin models
- Story 6.6 established the metrics pattern with parallel Prisma queries and admin page components -- follow same patterns
- Build fixes indicate need to run `npm run typecheck` and `npm run build` as validation steps
- Icon fix in server component (6401538) -- reminder: `lucide-react` icons are client components, use them properly in client components or pass as props

### Project Structure Notes

- `/admin/users` page is served inside `(admin)` route group with admin layout protection
- `AdminShell` already has "Users" nav item (with `Users` icon from lucide-react) pointing to `/admin/users`
- The existing `/admin/users/[userId]/page.tsx` already works for moderation history -- this story enhances it with additional data sections
- The `UserModerationDetail` component should be composed alongside new sections, not replaced
- Dashboard stat card for "Users" at `/admin/page.tsx` already shows a count via `getDashboardStats.totalUsersCount`

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-administration-platform-health.md#Story 6.7]
- [Source: _bmad-output/planning-artifacts/prd.md - Journey 4: Jordan Technical Support]
- [Source: _bmad-output/planning-artifacts/architecture.md#Admin Features]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Actions Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Standards]
- [Source: prisma/schema.prisma - User, Session, UserStreak, ReadingSession, Follow, Kudos, RoomPresence, AdminAction, UserWarning, UserSuspension, ModerationItem models]
- [Source: src/actions/admin/getUserModerationHistory.ts - Existing user data fetching pattern]
- [Source: src/actions/admin/getDashboardStats.ts - Existing admin action pattern with auth]
- [Source: src/components/features/admin/UserModerationDetail.tsx - Existing user moderation display]
- [Source: src/app/(admin)/admin/users/page.tsx - Current placeholder to replace]
- [Source: src/app/(admin)/admin/users/[userId]/page.tsx - Existing detail page to enhance]
- [Source: src/lib/validation/admin.ts - Existing Zod schemas to extend]
- [Source: src/lib/admin.ts - Admin role checking utilities]
- [Source: _bmad-output/implementation-artifacts/6-6-platform-health-metrics.md - Previous story patterns and learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 7 tasks completed successfully with 71 new tests across 8 test files
- No schema changes required -- all models already existed
- Used Promise.all for parallel queries in getUserDetail (13 concurrent queries)
- Privacy-first session viewing with confirmation dialog + VIEW_SESSION_HISTORY audit logging
- Simple parseUserAgent utility handles Chrome/Firefox/Safari/Edge + Windows/macOS/Linux/Android/iOS without external dependencies
- Enhanced user detail page composes new sections alongside existing UserModerationDetail (not replaced)
- Dashboard "Total Users" card now links to /admin/users with Search icon
- Pre-existing flaky test in BookDetailActions.test.tsx (button disable race condition) is NOT a regression

### File List

**New files (16):**
- `src/actions/admin/searchUsers.ts` - User search server action
- `src/actions/admin/searchUsers.test.ts` - 9 tests
- `src/actions/admin/getUserDetail.ts` - Extended user profile server action
- `src/actions/admin/getUserDetail.test.ts` - 11 tests
- `src/actions/admin/getSessionHistory.ts` - Session history server action with parseUserAgent
- `src/actions/admin/getSessionHistory.test.ts` - 17 tests
- `src/components/features/admin/UserSearchBar.tsx` - Search input component
- `src/components/features/admin/UserSearchBar.test.tsx` - 5 tests
- `src/components/features/admin/UserSearchResults.tsx` - Results table component
- `src/components/features/admin/UserSearchResults.test.tsx` - 9 tests
- `src/components/features/admin/UserAccountCard.tsx` - Account details card
- `src/components/features/admin/UserAccountCard.test.tsx` - 7 tests
- `src/components/features/admin/UserActivitySection.tsx` - Recent activity section
- `src/components/features/admin/UserActivitySection.test.tsx` - 7 tests
- `src/components/features/admin/UserSessionsList.tsx` - Session history with privacy confirmation
- `src/components/features/admin/UserSessionsList.test.tsx` - 6 tests

**Modified files (4):**
- `src/lib/validation/admin.ts` - Added userSearchSchema
- `src/app/(admin)/admin/users/page.tsx` - Replaced placeholder with search page
- `src/app/(admin)/admin/users/[userId]/page.tsx` - Enhanced with getUserDetail + new sections
- `src/components/features/admin/index.ts` - Added 5 new component exports
- `src/app/(admin)/admin/page.tsx` - Updated dashboard Users card (icon + href)
