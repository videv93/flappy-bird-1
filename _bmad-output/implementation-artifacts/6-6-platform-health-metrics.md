# Story 6.6: Platform Health Metrics

Status: review

## Story

As an admin,
I want to view platform health metrics,
so that I can monitor growth and identify issues.

## Acceptance Criteria

1. **Metrics dashboard overview** - Given I am on the admin dashboard, When I navigate to Metrics, Then I see a dashboard with key platform metrics.

2. **User metrics** - Given I view the metrics dashboard, When the page loads, Then I see: Total registered users, New users (today, this week, this month), Daily active users (DAU), Monthly active users (MAU), DAU/MAU ratio.

3. **Engagement metrics** - I see: Total reading sessions logged, Total reading time (hours), Average session duration, Active streaks count, Average streak length.

4. **Social metrics** - I see: Total kudos given (today, all-time), Active reading rooms, Total follows.

5. **Content metrics** - I see: Books in system, Verified authors, Pending author claims.

6. **Trend visualization** - Given I want to see trends, When I view any metric, Then I see a sparkline showing 30-day trend and percentage change vs. previous period.

7. **Detailed breakdown and export** - Given I want detailed data, When I click on a metric category, Then I see a detailed breakdown, can filter by date range, and can export data as CSV.

8. **Anomaly detection** - Given there's an anomaly (spike or drop >2 standard deviations), Then I see a visual alert on that metric and can investigate further.

## Tasks / Subtasks

- [x] Task 1: Create `getPlatformMetrics` server action (AC: #1-5)
  - [x] 1.1 Define `PlatformMetrics` TypeScript interfaces for all metric categories
  - [x] 1.2 Implement user metrics queries (total, new today/week/month, DAU, MAU, DAU/MAU)
  - [x] 1.3 Implement engagement metrics queries (sessions, reading time, avg duration, streaks)
  - [x] 1.4 Implement social metrics queries (kudos today/all-time, active rooms, follows)
  - [x] 1.5 Implement content metrics queries (books, verified authors, pending claims)
  - [x] 1.6 Use `Promise.all()` for parallel query execution
  - [x] 1.7 Write unit tests for `getPlatformMetrics`

- [x] Task 2: Create `getMetricsTrends` server action (AC: #6, #8)
  - [x] 2.1 Implement 30-day daily time-series queries using `$queryRaw` with `DATE_TRUNC`
  - [x] 2.2 Calculate percentage change vs previous 30-day period
  - [x] 2.3 Implement anomaly detection (mean + 2 standard deviations flagging)
  - [x] 2.4 Write unit tests for `getMetricsTrends`

- [x] Task 3: Create `/admin/metrics` page and components (AC: #1-6, #8)
  - [x] 3.1 Create `MetricsPage` server component at `src/app/(admin)/admin/metrics/page.tsx`
  - [x] 3.2 Create `MetricsCategoryCard` component for metric group display
  - [x] 3.3 Create `SparklineChart` client component (lightweight inline SVG)
  - [x] 3.4 Create `AnomalyBadge` component for >2 SD deviation alerts
  - [x] 3.5 Create `TrendIndicator` component (percentage change with up/down arrow)
  - [x] 3.6 Write component tests for all new components

- [x] Task 4: Create detailed breakdown with date range filter (AC: #7)
  - [x] 4.1 Create `getMetricsBreakdown` server action with date range params
  - [x] 4.2 Create `MetricsBreakdownView` client component with category tabs
  - [x] 4.3 Create `DateRangeFilter` client component using URL search params
  - [x] 4.4 Write tests for breakdown action and components

- [x] Task 5: Create CSV export API route (AC: #7)
  - [x] 5.1 Create `/api/admin/export/metrics/route.ts` GET handler
  - [x] 5.2 Create `ExportMetricsButton` client component
  - [x] 5.3 Write tests for export functionality

- [x] Task 6: Update dashboard stat card to show live metric count (AC: #1)
  - [x] 6.1 Update `getDashboardStats` to include a total metrics summary count
  - [x] 6.2 Update admin dashboard "Metrics" card to show meaningful count

- [x] Task 7: Final validation
  - [x] 7.1 Run `npm run typecheck` - 0 new errors
  - [x] 7.2 Run `npm run lint` - 0 new errors (1 pre-existing warning on ExportMetricsButton resolved)
  - [x] 7.3 Run `npm run test:run` - all new tests pass
  - [x] 7.4 Verify no regressions in existing tests (171 files, 1611 tests pass)

## Dev Notes

### Architecture & Implementation Strategy

**Server Action Pattern** (follow established Epic 6 pattern):
```typescript
'use server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import type { ActionResult } from '@/actions/books/types';

export async function getPlatformMetrics(): Promise<ActionResult<PlatformMetrics>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { id: true, role: true },
  });
  if (!adminUser || !isAdmin(adminUser)) return { success: false, error: 'Forbidden' };
  // ... queries with Promise.all()
}
```

**Query Strategy:**
- Use Prisma ORM `.count()` and `.aggregate()` for simple metrics (fast, type-safe)
- Use `prisma.$queryRaw` with `DATE_TRUNC('day', ...)` for 30-day time-series trends (PostgreSQL-specific)
- Wrap all queries in single `Promise.all()` for parallel execution
- DO NOT use Prisma `groupBy` for date-based aggregation - it lacks DATE_TRUNC support

**Key Prisma Queries:**

| Metric | Query approach |
|--------|---------------|
| Total users | `prisma.user.count()` |
| New users today | `prisma.user.count({ where: { createdAt: { gte: startOfDay } } })` |
| DAU (users with session today) | `prisma.readingSession.findMany({ where: { startedAt: gte today }, distinct: ['userId'] })` then `.length`, OR use `$queryRaw` with `COUNT(DISTINCT user_id)` |
| MAU | Same pattern with 30-day window |
| Total reading time | `prisma.readingSession.aggregate({ _sum: { duration: true } })` - duration is in seconds, convert to hours |
| Avg session duration | `prisma.readingSession.aggregate({ _avg: { duration: true } })` |
| Active streaks | `prisma.userStreak.count({ where: { currentStreak: { gt: 0 } } })` |
| Avg streak length | `prisma.userStreak.aggregate({ _avg: { currentStreak: true } })` |
| Kudos today | `prisma.kudos.count({ where: { createdAt: { gte: startOfDay } } })` |
| Active rooms | `prisma.roomPresence.findMany({ where: { leftAt: null }, distinct: ['bookId'] })` then `.length` |
| Total follows | `prisma.follow.count()` |
| Books in system | `prisma.book.count()` |
| Verified authors | `prisma.user.count({ where: { role: 'AUTHOR' } })` + `prisma.authorClaim.count({ where: { status: 'APPROVED' } })` |
| Pending claims | `prisma.authorClaim.count({ where: { status: 'PENDING' } })` |

**30-Day Trend Query Pattern (raw SQL):**
```typescript
const dailyNewUsers = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
  SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
  FROM users
  WHERE created_at >= ${thirtyDaysAgo}
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date ASC
`;
// Convert bigint to number: dailyNewUsers.map(r => ({ ...r, count: Number(r.count) }))
```

**Anomaly Detection Algorithm:**
```
mean = sum(dailyCounts) / 30
stdDev = sqrt(sum((x - mean)^2) / 30)
isAnomaly = |todayCount - mean| > 2 * stdDev
```

### Component Architecture

**Page Structure:**
```
/admin/metrics/page.tsx (Server Component)
├── Fetches getPlatformMetrics() + getMetricsTrends()
├── MetricsDashboard (Server Component wrapper)
│   ├── Grid of MetricsCategoryCard (4 categories)
│   │   ├── MetricRow (label, value, sparkline, trend)
│   │   │   ├── SparklineChart (Client - inline SVG)
│   │   │   ├── TrendIndicator (% change + arrow)
│   │   │   └── AnomalyBadge (conditional)
│   ├── MetricsBreakdownView (Client Component)
│   │   ├── Tabs for category selection
│   │   ├── DateRangeFilter (URL search params)
│   │   └── Detailed data table
│   └── ExportMetricsButton (Client Component)
```

**SparklineChart** - Lightweight inline SVG, NO external chart library:
```typescript
'use client';
// Renders a simple SVG polyline from array of numbers
// Width ~120px, height ~32px, stroke color based on trend direction
```

**DateRangeFilter** - Uses URL search params (Next.js 16 pattern):
```typescript
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
// Two date inputs, updates ?startDate=...&endDate=... via router.push
// Page server component reads searchParams (await searchParams in Next.js 16)
```

**CSV Export** - Use API Route (NOT server action - server actions use POST, not suitable for file downloads):
```typescript
// src/api/admin/export/metrics/route.ts
export async function GET(request: Request) {
  // Auth check, query metrics, generate CSV string, return Response with Content-Disposition header
}
```

### Existing Code to Reuse - DO NOT RECREATE

| What | Where | How to use |
|------|-------|-----------|
| Admin auth check pattern | `src/actions/admin/getDashboardStats.ts` | Copy exact auth + isAdmin pattern |
| `ActionResult<T>` type | `src/actions/books/types.ts` | Import and use |
| `isAdmin()` utility | `src/lib/admin.ts` | Import directly |
| `DashboardStatCard` | `src/components/features/admin/DashboardStatCard.tsx` | Reuse for overview cards if needed |
| `Card`, `CardContent` | `src/components/ui/card.tsx` | Use for metric category cards |
| `Tabs`, `TabsContent` | `src/components/ui/tabs.tsx` | Use for breakdown category tabs |
| Admin layout + protection | `src/app/(admin)/admin/layout.tsx` | Already wraps `/admin/metrics` |
| `AdminShell` navigation | Already has "Metrics" nav item pointing to `/admin/metrics` | No changes needed |
| `Skeleton` component | `src/components/ui/skeleton.tsx` | Use for loading states |

### File Structure

**New files to create:**
```
src/actions/admin/getPlatformMetrics.ts          # Main metrics server action
src/actions/admin/getPlatformMetrics.test.ts      # Tests
src/actions/admin/getMetricsTrends.ts             # Trend data server action
src/actions/admin/getMetricsTrends.test.ts        # Tests
src/actions/admin/getMetricsBreakdown.ts          # Detailed breakdown action
src/actions/admin/getMetricsBreakdown.test.ts     # Tests
src/app/(admin)/admin/metrics/page.tsx            # Metrics page (Server Component)
src/app/api/admin/export/metrics/route.ts         # CSV export API route
src/components/features/admin/MetricsCategoryCard.tsx      # Metric group card
src/components/features/admin/MetricsCategoryCard.test.tsx
src/components/features/admin/SparklineChart.tsx            # SVG sparkline
src/components/features/admin/SparklineChart.test.tsx
src/components/features/admin/TrendIndicator.tsx            # % change display
src/components/features/admin/TrendIndicator.test.tsx
src/components/features/admin/AnomalyBadge.tsx              # Anomaly alert
src/components/features/admin/AnomalyBadge.test.tsx
src/components/features/admin/MetricsBreakdownView.tsx      # Detailed view
src/components/features/admin/MetricsBreakdownView.test.tsx
src/components/features/admin/DateRangeFilter.tsx            # Date filter
src/components/features/admin/DateRangeFilter.test.tsx
src/components/features/admin/ExportMetricsButton.tsx        # CSV export button
src/components/features/admin/ExportMetricsButton.test.tsx
```

**Files to modify:**
```
src/actions/admin/getDashboardStats.ts  # Add metric summary count to dashboard
```

### Testing Strategy

**Mock pattern** (consistent with stories 6.3-6.5):
```typescript
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: vi.fn(), findUnique: vi.fn() },
    readingSession: { aggregate: vi.fn(), findMany: vi.fn() },
    userStreak: { count: vi.fn(), aggregate: vi.fn() },
    kudos: { count: vi.fn() },
    roomPresence: { findMany: vi.fn() },
    follow: { count: vi.fn() },
    book: { count: vi.fn() },
    authorClaim: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock('@/lib/admin', () => ({ isAdmin: vi.fn((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') }));
```

**Test cases for `getPlatformMetrics`:**
- Returns unauthorized when no session
- Returns forbidden when non-admin
- Returns all metric categories with correct values
- Handles empty database (zero counts)
- Handles query errors gracefully

**Test cases for `getMetricsTrends`:**
- Returns 30-day daily data points
- Calculates correct percentage change
- Detects anomalies correctly (>2 SD)
- Handles sparse data (missing days = 0)
- Converts bigint from raw queries to number

**Component tests:**
- `SparklineChart` renders SVG with correct data points
- `TrendIndicator` shows green up arrow for positive, red down for negative
- `AnomalyBadge` only renders when anomaly flag is true
- `MetricsCategoryCard` renders all metric rows
- `DateRangeFilter` updates URL search params on change
- `ExportMetricsButton` triggers download on click

### Critical Implementation Notes

1. **BigInt handling**: `$queryRaw` returns `bigint` for COUNT - always convert with `Number()` before returning to client components (BigInt is not JSON serializable)

2. **Date boundaries**: Use UTC midnight for day boundaries:
   ```typescript
   const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
   const startOfWeek = new Date(startOfDay); startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());
   const startOfMonth = new Date(startOfDay); startOfMonth.setUTCDate(1);
   ```

3. **DAU definition**: A user is "active" if they have a `ReadingSession` with `startedAt` on that day. Do NOT count mere logins.

4. **Active rooms**: Count distinct `bookId` from `RoomPresence` where `leftAt IS NULL`. Do NOT count individual presence records.

5. **Verified authors**: Count `AuthorClaim` where `status = 'APPROVED'` (not User role, since role can be ADMIN too).

6. **Reading time conversion**: `ReadingSession.duration` is in **seconds**. Convert to hours: `totalSeconds / 3600`. Display with 1 decimal.

7. **Next.js 16 searchParams**: `searchParams` is a **Promise** - must `await searchParams` in page component.

8. **No external chart libraries**: Use inline SVG polyline for sparklines. Keep the bundle minimal.

9. **Amber admin theme**: Follow existing admin color scheme - `bg-amber-100 dark:bg-amber-900/20`, `text-amber-700 dark:text-amber-400`.

10. **Touch targets**: All interactive elements must be minimum 44px (min-h-[44px]).

### Previous Story Learnings (from 6.3-6.5)

- **Transaction pattern**: Not needed here (read-only queries), but use `Promise.all()` for parallel execution
- **Self-moderation prevention**: N/A for metrics (read-only)
- **Router cache**: If navigating from dashboard to metrics, ensure fresh data via dynamic rendering (no ISR cache for admin metrics)
- **Pre-existing test failures**: `middleware.test.ts` and `AppShell.test.tsx` fail - these are NOT regressions, ignore them
- **Import convention**: ALWAYS use `@/` alias, NEVER relative imports

### Project Structure Notes

- `/admin/metrics` page is served inside `(admin)` route group with admin layout protection
- `AdminShell` already has "Metrics" nav item pointing to `/admin/metrics`
- The dashboard stat card for "Metrics" at `/admin/page.tsx` currently shows `count={0}` - update this to show a meaningful summary number (e.g., total active users or total sessions today)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-administration-platform-health.md#Story 6.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Admin Features]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Actions Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Standards]
- [Source: prisma/schema.prisma - ReadingSession, UserStreak, Kudos, Follow, RoomPresence, AuthorClaim, Book models]
- [Source: src/actions/admin/getDashboardStats.ts - Existing admin action pattern]
- [Source: src/components/features/admin/DashboardStatCard.tsx - Existing stat card component]
- [Source: src/app/(admin)/admin/page.tsx - Dashboard with metrics placeholder]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Implemented `getPlatformMetrics` server action with 18 parallel Prisma queries for user/engagement/social/content metrics (8 tests)
- Implemented `getMetricsTrends` server action with 30-day time-series via `$queryRaw` DATE_TRUNC, percentage change calculation, and anomaly detection at >2 standard deviations (18 tests)
- Created `/admin/metrics` page as Server Component with `force-dynamic` rendering
- Created `MetricsCategoryCard` component with metric rows, sparklines, trend indicators, and anomaly badges (5 tests)
- Created `SparklineChart` client component using lightweight inline SVG polyline (6 tests)
- Created `TrendIndicator` component with directional arrows and color coding (4 tests)
- Created `AnomalyBadge` component with red alert styling and ARIA status role (3 tests)
- Created `getMetricsBreakdown` server action with `$queryRawUnsafe` for per-category daily breakdown with date range filtering (7 tests)
- Created `MetricsBreakdownView` client component with category tabs and data table (4 tests)
- Created `DateRangeFilter` client component using URL search params via `useRouter`/`useSearchParams` (4 tests)
- Created CSV export via API Route at `/api/admin/export/metrics/route.ts` with auth protection
- Created `ExportMetricsButton` client component with blob download pattern (3 tests)
- Updated `getDashboardStats` to include `totalUsersCount` and updated dashboard "Metrics" card to show live user count
- All 171 test files pass (1611 total tests), 0 typecheck errors, 0 new lint errors

### File List

New files:
- src/actions/admin/getPlatformMetrics.ts
- src/actions/admin/getPlatformMetrics.test.ts
- src/actions/admin/getMetricsTrends.ts
- src/actions/admin/getMetricsTrends.test.ts
- src/actions/admin/getMetricsBreakdown.ts
- src/actions/admin/getMetricsBreakdown.test.ts
- src/app/(admin)/admin/metrics/page.tsx
- src/app/api/admin/export/metrics/route.ts
- src/components/features/admin/MetricsCategoryCard.tsx
- src/components/features/admin/MetricsCategoryCard.test.tsx
- src/components/features/admin/SparklineChart.tsx
- src/components/features/admin/SparklineChart.test.tsx
- src/components/features/admin/TrendIndicator.tsx
- src/components/features/admin/TrendIndicator.test.tsx
- src/components/features/admin/AnomalyBadge.tsx
- src/components/features/admin/AnomalyBadge.test.tsx
- src/components/features/admin/MetricsBreakdownView.tsx
- src/components/features/admin/MetricsBreakdownView.test.tsx
- src/components/features/admin/DateRangeFilter.tsx
- src/components/features/admin/DateRangeFilter.test.tsx
- src/components/features/admin/ExportMetricsButton.tsx
- src/components/features/admin/ExportMetricsButton.test.tsx

Modified files:
- src/actions/admin/getDashboardStats.ts
- src/actions/admin/getDashboardStats.test.ts
- src/app/(admin)/admin/page.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/6-6-platform-health-metrics.md
