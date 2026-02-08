# Story 4.3: Activity Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see what people I follow are reading**,
so that **I feel connected to my reading community**.

## Acceptance Criteria

1. **Navigate to Activity Tab:** Given I am logged in, When I navigate to the Activity tab (or equivalent feed section on Home), Then I see a chronological feed of activity from people I follow, And the feed loads the most recent 20 items initially, And I can pull-to-refresh to get new items.

2. **View Different Activity Types:** Given the feed contains activity, When I view feed items, Then I see different item types styled appropriately:
   - **Reading session**: "[User] read [Book] for [X] minutes" with book cover
   - **Finished book**: "[User] finished [Book]" with celebration icon
   - **Streak milestone**: "[User] hit a [X]-day streak!" with streak badge

3. **Reading Session Feed Items:** Given a feed item is a reading session, When I view it, Then I see: user avatar, username, book cover thumbnail, book title, formatted duration (e.g., "32 min"), relative timestamp (e.g., "2 hours ago"), And I see a KudosButton to give kudos (Story 4.4).

4. **Pagination with Load More:** Given I scroll to the bottom of the feed, When more items exist beyond the loaded items, Then I see a "Load More" button, And tapping it loads the next batch of 20 items, And newly loaded items append to the existing list seamlessly.

5. **Empty State - No Follows:** Given I follow no one, When I view the Activity tab, Then I see an empty state: "Follow readers to see their activity", And I see a CTA button: "Find Readers" linking to user search.

6. **Empty State - No Activity:** Given people I follow have no recent activity (in the last 30 days), When I view the feed, Then I see: "No recent activity from people you follow", And I see suggestions of active users to follow (optional for Story 4.3 - simple message is sufficient).

7. **Privacy Filtering:** Given a user I follow has set `showReadingActivity: false`, When the feed is generated, Then their reading sessions and finished books are NOT included in my feed, And their follow/unfollow actions also do not appear.

## Tasks / Subtasks

- [x] Task 1: Create `getActivityFeed` server action (AC: #1, #2, #3, #4, #7)
  - [x] 1.1: Create `src/actions/social/getActivityFeed.ts` following `ActionResult<T>` pattern
  - [x] 1.2: Accept input `{ limit?: number, offset?: number }` validated with Zod (limit: default 20, max 50; offset: default 0)
  - [x] 1.3: Authenticate via `auth.api.getSession({ headers: await headers() })`
  - [x] 1.4: Fetch list of users the current user follows: `prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } })`
  - [x] 1.5: Query ReadingSession records from followed users:
    - Where `userId IN followedUserIds`
    - AND `user.showReadingActivity = true` (via nested relation filter)
    - Select: id, userId, bookId, duration, startedAt, createdAt
    - Include: user (id, name, avatarUrl, image), book (id, title, coverUrl)
    - Order by: `startedAt DESC`
  - [x] 1.6: Query UserBook (finished) records from followed users:
    - Where `userId IN followedUserIds`, status = 'FINISHED', deletedAt = null
    - AND `user.showReadingActivity = true`
    - Select: id, userId, bookId, dateFinished, createdAt
    - Include: user (id, name, avatarUrl, image), book (id, title, coverUrl, author)
    - Order by: `dateFinished DESC`
  - [x] 1.7: Merge sessions + finished books into unified activity list, sorted by timestamp descending
  - [x] 1.8: Apply pagination: skip `offset`, take `limit`
  - [x] 1.9: Fetch total count for pagination (approximate via sum of sessions + finished books count)
  - [x] 1.10: Return `ActionResult<{ activities: ActivityItem[], total: number }>` with type discriminators: `{ type: 'session', ... } | { type: 'finished', ... }`

- [x] Task 2: Create `ActivityItem` types (AC: #2)
  - [x] 2.1: Define in `src/actions/social/getActivityFeed.ts` or `src/types/activity.ts`
  - [x] 2.2: `ActivityItem` union type:
    - `SessionActivity`: type='session', id, userId, userName, userAvatar, bookId, bookTitle, bookCover, duration (seconds), timestamp (Date)
    - `FinishedBookActivity`: type='finished', id, userId, userName, userAvatar, bookId, bookTitle, bookCover, bookAuthor, timestamp (Date)
  - [x] 2.3: Optionally: `StreakActivity` for future (Story 4.2 references streak milestones, defer to future if not in MVP)

- [x] Task 3: Create Activity tab/section in home or separate page (AC: #1)
  - [x] 3.1: Determine placement: `/home` tab enhancement OR new `/activity` route (check existing navigation structure)
  - [x] 3.2: If home tab: add ActivityFeed component to `src/app/(main)/home/page.tsx` or `HomeContent.tsx`
  - [x] 3.3: If separate route: create `src/app/(main)/activity/page.tsx` server component
  - [x] 3.4: Ensure route is in protected routes list in `src/middleware.ts`
  - [x] 3.5: Initial server-side fetch of first 20 activity items via `getActivityFeed({ limit: 20, offset: 0 })`
  - [x] 3.6: Pass data to client component `<ActivityFeed initialActivities={...} initialTotal={...} />`

- [x] Task 4: Create `ActivityFeed` client component (AC: #1, #4, #5, #6)
  - [x] 4.1: Create `src/components/features/social/ActivityFeed.tsx` as 'use client'
  - [x] 4.2: Accept props: `initialActivities: ActivityItem[]`, `initialTotal: number`
  - [x] 4.3: State: `activities` (initialized with initialActivities), `total`, `isLoadingMore`, `hasError`
  - [x] 4.4: Implement `loadMore()` function:
    - Call `getActivityFeed({ limit: 20, offset: activities.length })`
    - Append new results to existing activities list
    - Update total count
    - Handle errors with toast
  - [x] 4.5: Render list of ActivityFeedItem components, mapping over activities array
  - [x] 4.6: Show "Load More" button if `activities.length < total`, disabled during loading
  - [x] 4.7: Show loading skeleton while `isLoadingMore` (3-5 placeholder cards)
  - [x] 4.8: Empty state (AC #5): if `initialActivities.length === 0` and no follows, show "Follow readers..." with link to `/search?tab=users`
  - [x] 4.9: Empty state (AC #6): if user has follows but no activity, show "No recent activity..." message

- [x] Task 5: Create `ActivityFeedItem` component (AC: #2, #3)
  - [x] 5.1: Create `src/components/features/social/ActivityFeedItem.tsx` as client component (for future kudos interaction)
  - [x] 5.2: Accept props: `activity: ActivityItem`
  - [x] 5.3: Render based on `activity.type`:
    - If 'session': show user avatar, name, "read [book title] for [formatted duration]", book cover, timestamp, link to book
    - If 'finished': show user avatar, name, "finished [book title]", book cover, BookCheck icon, timestamp, link to book
  - [x] 5.4: Use `formatRelativeTime(activity.timestamp)` from `@/lib/utils` for timestamp display
  - [x] 5.5: Use `formatDuration(activity.duration)` for session duration
  - [x] 5.6: Style as card: `rounded-lg border p-3 hover:bg-muted/50 transition-colors`
  - [x] 5.7: User avatar: use `Avatar` from `@/components/ui/avatar` with `getInitials(userName)` fallback
  - [x] 5.8: Book cover: 48x72px thumbnail, link to `/book/[bookId]`
  - [x] 5.9: Add placeholder for KudosButton (Story 4.4 will implement) - just reserve space or add disabled button

- [x] Task 6: Update barrel exports (AC: all)
  - [x] 6.1: Update `src/actions/social/index.ts` to export `getActivityFeed` and its types
  - [x] 6.2: Update `src/components/features/social/index.ts` to export `ActivityFeed`, `ActivityFeedItem`

- [x] Task 7: Write comprehensive tests (AC: all)
  - [x] 7.1: Create `src/actions/social/getActivityFeed.test.ts` (16 tests):
    - Test: Returns activity from followed users only
    - Test: Filters out users with showReadingActivity = false
    - Test: Merges sessions and finished books, sorted by timestamp
    - Test: Returns paginated results (limit, offset work correctly)
    - Test: Returns correct total count
    - Test: Returns empty array when user follows no one
    - Test: Returns empty array when followed users have no activity
    - Test: Returns error when unauthenticated
    - Test: Handles Prisma errors gracefully
    - Test: Includes user and book data in each activity item
  - [x] 7.2: Create `src/components/features/social/ActivityFeed.test.tsx` (10 tests):
    - Test: Renders initial activities list
    - Test: Shows empty state when no activities and no follows
    - Test: Shows "No recent activity" when follows exist but no activity
    - Test: Load More button appears when activities.length < total
    - Test: Load More button hidden when all activities loaded
    - Test: Load More fetches next batch and appends to list
    - Test: Loading state shown while fetching more items
    - Test: Error handling shows toast on load more failure
  - [x] 7.3: Create `src/components/features/social/ActivityFeedItem.test.tsx` (15 tests):
    - Test: Renders session activity with user avatar, name, book, duration, timestamp
    - Test: Renders finished book activity with BookCheck icon
    - Test: Formats duration correctly for session type
    - Test: Formats relative timestamp correctly
    - Test: Links to book detail page
    - Test: User avatar shows image when available
    - Test: User avatar shows initials fallback when no image
    - Test: Handles missing book cover gracefully
    - Test: Activity card has hover effect
    - Test: Renders different activity types correctly
  - [x] 7.4: Verify 0 regressions across the full test suite (906 tests passed, 0 regressions)

- [x] Task 8: Add route protection and navigation (AC: #1)
  - [x] 8.1: Route already protected - `/activity` exists in `protectedRoutes` in `src/middleware.ts`
  - [x] 8.2: Activity navigation already exists in BottomNav
  - [x] 8.3: Navigation highlighting handled by existing navigation logic

## Dev Notes

### Critical Architecture Patterns (FROM STORIES 4-1 & 4-2)

- **Server Actions** use `ActionResult<T>` discriminated union — import from `@/actions/books/types.ts`
- **Auth pattern**: `const headersList = await headers(); const session = await auth.api.getSession({ headers: headersList });`
- **Import convention**: ALWAYS use `@/` alias for cross-boundary imports (NEVER relative imports)
- **Component naming**: PascalCase files, named exports (not default)
- **Test co-location**: `Component.test.tsx` next to `Component.tsx`
- **Barrel exports**: Every feature folder needs `index.ts` to re-export public APIs
- **Toast**: Use `import { toast } from 'sonner'` for error/success messages
- **Date formatting**: Use `formatRelativeTime()` from `@/lib/utils` (NO date-fns dependency)
- **Duration formatting**: Use `formatDuration()` from `@/lib/utils`

### Data Fetching & Query Strategy (CRITICAL)

**Activity feed requires joining data from multiple sources:**

1. **First, get followed users:**
```typescript
const followedUserIds = (await prisma.follow.findMany({
  where: { followerId: currentUserId },
  select: { followingId: true },
})).map(f => f.followingId);
```

2. **Then fetch their activity (two queries):**
```typescript
const [sessions, finishedBooks] = await Promise.all([
  prisma.readingSession.findMany({
    where: {
      userId: { in: followedUserIds },
      user: { showReadingActivity: true }, // Privacy filter
    },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      bookId: true,
      duration: true,
      startedAt: true,
      user: {
        select: { id: true, name: true, avatarUrl: true, image: true },
      },
      book: {
        select: { id: true, title: true, coverUrl: true },
      },
    },
  }),
  prisma.userBook.findMany({
    where: {
      userId: { in: followedUserIds },
      status: 'FINISHED',
      deletedAt: null,
      user: { showReadingActivity: true }, // Privacy filter
    },
    orderBy: { dateFinished: 'desc' },
    select: {
      id: true,
      userId: true,
      bookId: true,
      dateFinished: true,
      user: {
        select: { id: true, name: true, avatarUrl: true, image: true },
      },
      book: {
        select: { id: true, title: true, author: true, coverUrl: true },
      },
    },
  }),
]);
```

3. **Merge and sort unified activity list:**
```typescript
const activities = [
  ...sessions.map(s => ({
    type: 'session' as const,
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userAvatar: s.user.avatarUrl || s.user.image || null,
    bookId: s.bookId,
    bookTitle: s.book.title,
    bookCover: s.book.coverUrl,
    duration: s.duration,
    timestamp: s.startedAt,
  })),
  ...finishedBooks.map(fb => ({
    type: 'finished' as const,
    id: fb.id,
    userId: fb.userId,
    userName: fb.user.name,
    userAvatar: fb.user.avatarUrl || fb.user.image || null,
    bookId: fb.bookId,
    bookTitle: fb.book.title,
    bookCover: fb.book.coverUrl,
    bookAuthor: fb.book.author,
    timestamp: fb.dateFinished || fb.createdAt,
  })),
].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

// Apply pagination
const paginatedActivities = activities.slice(offset, offset + limit);
const total = activities.length;
```

**OPTIMIZATION NOTE:** For MVP, this approach is acceptable. For scale (1000+ follows), consider:
- Database-level sorting with UNION query (raw SQL)
- Caching layer for active feeds
- Cursor-based pagination instead of offset

### Pagination Pattern (FROM STORY 4-2)

Stories 4-1 and 4-2 use **offset-based pagination** with "Load More" button:

```typescript
const PAGE_SIZE = 20;

// Client component state
const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
const [total, setTotal] = useState(initialTotal);
const [isLoadingMore, setIsLoadingMore] = useState(false);

const loadMore = async () => {
  setIsLoadingMore(true);
  const result = await getActivityFeed({
    limit: PAGE_SIZE,
    offset: activities.length, // Use current length as offset
  });

  if (result.success) {
    setActivities(prev => [...prev, ...result.data.activities]); // Append
    setTotal(result.data.total);
  } else {
    toast.error(result.error);
  }
  setIsLoadingMore(false);
};

const hasMore = activities.length < total;

// Render:
{hasMore && (
  <Button onClick={loadMore} disabled={isLoadingMore}>
    {isLoadingMore ? 'Loading...' : 'Load More'}
  </Button>
)}
```

### Privacy & Filtering (CRITICAL)

**User privacy settings MUST be respected:**

- `User.showReadingActivity` (boolean, default true) controls whether their reading sessions and finished books appear in other users' feeds
- Filter at query level using Prisma nested relation: `user: { showReadingActivity: true }`
- Even if a user follows someone, their activity won't show if privacy is disabled

**Implementation:**
```typescript
where: {
  userId: { in: followedUserIds },
  user: { showReadingActivity: true }, // ✅ Privacy filter
}
```

### Empty States (FROM STORIES 4-1 & 4-2)

Story 4.3 has **two distinct empty states:**

1. **User follows no one:**
```typescript
{activities.length === 0 && followCount === 0 && (
  <div className="py-12 text-center">
    <p className="text-sm text-muted-foreground mb-4">
      Follow readers to see their activity
    </p>
    <Button asChild>
      <Link href="/search?tab=users">Find Readers</Link>
    </Button>
  </div>
)}
```

2. **User has follows but they have no activity:**
```typescript
{activities.length === 0 && followCount > 0 && (
  <div className="py-12 text-center">
    <p className="text-sm text-muted-foreground">
      No recent activity from people you follow
    </p>
  </div>
)}
```

**Implementation detail:** To differentiate these states, the component needs to know if the user follows anyone. Options:
- Pass `followCount` as prop from server component
- Fetch follow count in the action and include in result
- Check if `followedUserIds.length === 0` in action and return metadata

### Existing Code to Reuse (DO NOT REINVENT)

| Component/Action | Location | How to Use |
|---|---|---|
| `ActionResult<T>` | `@/actions/books/types.ts` | Return type for getActivityFeed |
| `Avatar` | `@/components/ui/avatar` | User avatar display with fallback |
| `Button` | `@/components/ui/button` | Load More button |
| `Skeleton` | `@/components/ui/skeleton` | Loading placeholders |
| `getInitials()` | `@/lib/utils.ts` | Avatar fallback initials |
| `formatRelativeTime()` | `@/lib/utils.ts` | "2 hours ago" formatting |
| `formatDuration()` | `@/lib/utils.ts` | "32 min" formatting |
| `FollowButton` | `@/components/features/social/FollowButton.tsx` | (not directly in feed, but follow pattern) |
| `UserCard` | `@/components/features/social/UserCard.tsx` | Possible reuse for user info display |
| `prisma` | `@/lib/prisma` | Prisma client singleton |
| `auth` | `@/lib/auth` | Auth API |
| `toast` | `sonner` | Error/success notifications |
| Icons | `lucide-react` | Use `BookCheck`, `Clock`, `Users` |

### Component Structure Pattern (FROM STORY 4-2)

**File structure order (follow exactly):**
```typescript
// 1. 'use client' directive (if client component)
'use client';

// 2. External imports
import { useState } from 'react';

// 3. Internal imports with @/ alias
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getActivityFeed } from '@/actions/social/getActivityFeed';
import { formatRelativeTime, getInitials } from '@/lib/utils';

// 4. Type definitions
interface ActivityFeedProps {
  initialActivities: ActivityItem[];
  initialTotal: number;
}

// 5. Component function (named export)
export function ActivityFeed({ initialActivities, initialTotal }: ActivityFeedProps) {
  // hooks first
  const [activities, setActivities] = useState(initialActivities);

  // handlers
  const loadMore = async () => { ... };

  // render
  return ( ... );
}
```

### Styling & UX Patterns (FROM STORIES 4-1 & 4-2)

**Activity card styling:**
```typescript
<div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
  <Avatar className="h-10 w-10 shrink-0">
    <AvatarImage src={userAvatar || undefined} alt={userName} />
    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
  </Avatar>

  <div className="flex-1 min-w-0">
    <p className="text-sm">
      <span className="font-medium">{userName}</span>{' '}
      {activity.type === 'session' && (
        <>read <span className="font-medium">{bookTitle}</span> for {formatDuration(duration)}</>
      )}
      {activity.type === 'finished' && (
        <>finished <span className="font-medium">{bookTitle}</span></>
      )}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {formatRelativeTime(timestamp)}
    </p>
  </div>

  <Link href={`/book/${bookId}`} className="shrink-0">
    <img
      src={bookCover || '/placeholder-book.png'}
      alt={bookTitle}
      className="h-16 w-10 object-cover rounded"
    />
  </Link>
</div>
```

**List container:**
```typescript
<div className="space-y-3">
  {activities.map(activity => (
    <ActivityFeedItem key={activity.id} activity={activity} />
  ))}
</div>
```

**Load More button:**
```typescript
<Button
  onClick={loadMore}
  disabled={isLoadingMore}
  variant="outline"
  className="w-full mt-4"
>
  {isLoadingMore ? 'Loading...' : 'Load More'}
</Button>
```

### Testing Standards (FROM STORIES 4-1 & 4-2)

**Framework:** Vitest + React Testing Library (NOT Jest)

**Mock patterns:**
```typescript
// At top of test file
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    follow: { findMany: vi.fn() },
    readingSession: { findMany: vi.fn() },
    userBook: { findMany: vi.fn() },
  },
}));

// In tests
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;
const mockFollowFindMany = prisma.follow.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
});
```

**Component test pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/actions/social/getActivityFeed');

describe('ActivityFeed', () => {
  const defaultProps = {
    initialActivities: [],
    initialTotal: 0,
  };

  it('renders empty state when no activities', () => {
    render(<ActivityFeed {...defaultProps} />);
    expect(screen.getByText(/Follow readers to see their activity/i)).toBeInTheDocument();
  });
});
```

**Test coverage goals (from Stories 4-1/4-2):**
- Server actions: 9-10 tests per action
- Components: 7-10 tests per component
- Utility functions: test all edge cases
- **CRITICAL:** Run full test suite after implementation — must maintain 0 regressions (865+ tests passing)

### Scope Boundaries

**Story 4.3 DOES:**
- Create activity feed for users to see followed users' reading activity
- Display reading sessions and finished books in chronological order
- Implement offset-based pagination with "Load More" button
- Filter activity based on privacy settings (`showReadingActivity`)
- Show distinct empty states for "no follows" vs "no activity"
- Reserve space for KudosButton (placeholder or disabled state)
- Add all tests with 0 regressions

**Story 4.3 does NOT:**
- Implement Kudos functionality (Story 4.4)
- Add kudos notifications (Story 4.5)
- Display kudos received (Story 4.6)
- Show streak milestones in feed (could be future enhancement)
- Implement infinite scroll (uses "Load More" button per established pattern)
- Add user suggestions for empty state (simple message is sufficient)
- Create new database tables (reuses existing Follow, ReadingSession, UserBook)

### Previous Story Intelligence (Stories 4-1 & 4-2)

**Key learnings from Story 4-1 (Follow/Unfollow) implementation:**
- Follow model created with bidirectional relations: `follower` and `following`
- `getFollowStatus` action returns follower/following counts efficiently
- Optimistic UI pattern: update state immediately, revert on error
- `useTransition()` for server action calls with loading state
- Toast notifications for errors via `sonner`

**Key learnings from Story 4-2 (View User Profiles) implementation:**
- Server component fetches data, passes to client component for interactivity
- `Promise.all()` for parallel queries reduces latency
- Privacy filtering via `showReadingActivity` boolean field
- Pagination with offset: `skip` and `take` in Prisma queries
- Empty states with helpful CTAs increase engagement
- Recent sessions and finished books displayed with relative timestamps and formatted durations

**Code review learnings from Epic 3:**
- Parallel queries with `Promise.all()` for better latency
- Use `select` in Prisma queries to minimize data transfer
- Always handle nullable return values gracefully
- Add error logging in catch blocks (don't swallow errors silently)
- Prefer server actions over duplicating Prisma queries in page components

### Git Intelligence

Recent commits follow pattern: `feat: [Description] (Story N.N)` — all files + tests in single commit.

**Current work in Epic 4:**
- Story 4-1: Follow/Unfollow completed (uncommitted or recently committed)
- Story 4-2: View Other User Profiles completed (uncommitted or recently committed)
- Story 4-3: Next in sequence

**Recent Epic 3 commits show patterns:**
- Commit includes story doc, all source files, all test files in single atomic commit
- Test suite validation before commit: 862-865+ tests passing
- Type check and lint run before committing

**Story 4-3 should follow same pattern:**
- Create story doc first (this file)
- Implement all tasks
- Run full test suite to verify 0 regressions
- Run type check and lint
- Commit with message: `feat: Implement activity feed (Story 4.3)`

### Architecture Compliance

- **Social & Activity maps to FR23-FR27** per architecture doc — Story 4.3 specifically addresses FR25 (activity feed)
- **Server component pattern** for page/route level — data fetching server-side, pass to client component
- **Component location:** `src/components/features/social/` for all social components
- **Action location:** `src/actions/social/` for all social-related server actions
- **No new Zustand store needed** — activity feed is per-user, fetched on demand
- **Date handling:** Use utility functions in `@/lib/utils`, NOT date-fns
- **Prisma queries:** Use `select` for minimal data, `orderBy` for sorting, `take`/`skip` for pagination

### Library & Framework Requirements

**Existing dependencies (NO new packages needed):**
- `@prisma/client` — database ORM
- `zod` — input validation
- `sonner` — toast notifications
- `lucide-react` — icons (BookCheck, Clock, Users)
- `@radix-ui/react-avatar` (via shadcn/ui) — avatar component
- Vitest + @testing-library/react — testing

**Icons to use:**
- `BookCheck` — finished book icon
- `Clock` — reading session duration
- `Users` — empty state (find readers)

### File Structure Requirements

**New files to create:**
```
src/
├── actions/social/
│   ├── getActivityFeed.ts
│   └── getActivityFeed.test.ts
├── components/features/social/
│   ├── ActivityFeed.tsx
│   ├── ActivityFeed.test.tsx
│   ├── ActivityFeedItem.tsx
│   └── ActivityFeedItem.test.tsx
└── app/(main)/
    └── [activity route or home enhancement]
```

**Modified files:**
```
src/
├── actions/social/index.ts (add exports)
├── components/features/social/index.ts (add exports)
└── middleware.ts (if new route created)
```

### Testing Requirements

**Test files to create:**
1. `src/actions/social/getActivityFeed.test.ts` — 10+ tests
2. `src/components/features/social/ActivityFeed.test.tsx` — 8+ tests
3. `src/components/features/social/ActivityFeedItem.test.tsx` — 10+ tests

**Test scenarios (MUST cover):**
- Auth: unauthorized user receives error
- Privacy: users with `showReadingActivity: false` excluded
- Pagination: offset and limit work correctly
- Empty states: no follows vs no activity
- Data merging: sessions + finished books sorted by timestamp
- Load more: appends new results
- Errors: handles Prisma errors gracefully
- Rendering: all activity types render correctly
- Formatting: durations and timestamps formatted correctly
- Navigation: links to book pages work

**After implementation, run:**
```bash
npm test              # All tests must pass
npm run typecheck     # 0 new errors
npm run lint          # 0 new warnings/errors
```

**Expected outcome:** 865+ tests still passing, 0 regressions

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-social-connections-activity-feed.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - Server Actions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns - Pagination, Privacy]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries - Social FR23-FR27]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25 - Activity feed]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Activity Feed Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty State Patterns]
- [Source: _bmad-output/implementation-artifacts/4-1-follow-unfollow-users.md#All patterns and learnings]
- [Source: _bmad-output/implementation-artifacts/4-2-view-other-user-profiles.md#Data Fetching, Pagination, Privacy]
- [Source: prisma/schema.prisma#Follow model, ReadingSession model, UserBook model]
- [Source: src/actions/social/getFollowStatus.ts#Follow status pattern]
- [Source: src/actions/social/followUser.ts#Server action pattern]
- [Source: src/components/features/social/FollowButton.tsx#Optimistic UI pattern]
- [Source: src/components/features/social/RecentSessionsList.tsx#List component pattern]
- [Source: src/lib/utils.ts#formatRelativeTime, formatDuration, getInitials]
- [Source: CLAUDE.md#Import conventions, Server Actions pattern, Component patterns]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

- Initial test run: All 41 new tests passed (16 action + 10 feed + 15 item)
- Test iterations: Fixed test mocks for Avatar and Skeleton components, resolved text matching issues
- Full suite after implementation: 906 tests passed across 89 files (41 new tests added, 0 regressions)
- Type check: 0 new TypeScript errors
- Lint: All files follow project conventions

### Completion Notes List

**Implemented Activity Feed (Story 4.3):**

1. **Created `getActivityFeed` server action** with complete functionality:
   - Accepts pagination parameters (limit: 20 default/50 max, offset: 0 default)
   - Authenticates user via Better Auth session
   - Fetches followed users and their activity (sessions + finished books)
   - Privacy-aware: filters by `showReadingActivity: true` at query level
   - Merges and sorts activity by timestamp descending
   - Returns paginated results with total count and hasFollows flag
   - Handles edge cases: no follows, no activity, Prisma errors

2. **Defined comprehensive TypeScript types**:
   - `ActivityItem` union type with discriminator
   - `SessionActivity`: session details with duration
   - `FinishedBookActivity`: finished book details with author
   - `ActivityFeedData`: response type with activities, total, hasFollows

3. **Implemented ActivityFeed container component**:
   - Server-side initial data fetch via `/activity` page
   - Client component with state management (activities, total, loading)
   - "Load More" pagination with offset-based approach
   - Two distinct empty states: no follows vs no activity
   - Loading skeleton with 3 placeholder cards
   - Error handling with toast notifications
   - Links to user search for finding readers

4. **Created ActivityFeedItem presentational component**:
   - Renders session activity: user, "read [book] for [duration]", timestamp
   - Renders finished activity: user, "finished [book]", author, timestamp
   - User avatars with initials fallback via `getInitials()`
   - Book covers (48x72px) with placeholder for missing covers
   - Relative timestamps via `formatRelativeTime()` utility
   - Duration formatting via `formatDuration()` utility
   - Links to book detail pages
   - Hover effects and card styling per design system

5. **Updated `/activity` route** from placeholder to full implementation:
   - Server component with auth check and redirect
   - Server-side data fetching with error handling
   - PageHeader with "Activity" title
   - Passes initial data to ActivityFeed client component

6. **Updated barrel exports**:
   - Added `getActivityFeed` and all types to `src/actions/social/index.ts`
   - Added `ActivityFeed` and `ActivityFeedItem` to `src/components/features/social/index.ts`

7. **Comprehensive test coverage (41 new tests)**:
   - 16 tests for `getActivityFeed` action covering all scenarios
   - 10 tests for `ActivityFeed` component including pagination and empty states
   - 15 tests for `ActivityFeedItem` component with all rendering cases
   - All tests use proper mocks for Next.js, auth, Prisma, UI components
   - 906 total tests passing (865 + 41 new), 0 regressions

8. **Architecture compliance**:
   - Followed `ActionResult<T>` pattern from existing stories
   - Used `@/` import alias throughout (0 relative imports)
   - Privacy filtering at database query level
   - Parallel data fetching with `Promise.all()`
   - Optimistic UI ready for future kudos feature (Story 4.4)
   - No new database tables created (reuses existing models)

9. **Route protection verified**:
   - `/activity` already in `protectedRoutes` in middleware
   - Auth check and redirect in page component
   - Navigation already configured in BottomNav

### File List

**New files:**
- src/actions/social/getActivityFeed.ts
- src/actions/social/getActivityFeed.test.ts
- src/components/features/social/ActivityFeed.tsx
- src/components/features/social/ActivityFeed.test.tsx
- src/components/features/social/ActivityFeedItem.tsx
- src/components/features/social/ActivityFeedItem.test.tsx

**Modified files:**
- src/app/(main)/activity/page.tsx
- src/actions/social/index.ts
- src/components/features/social/index.ts
