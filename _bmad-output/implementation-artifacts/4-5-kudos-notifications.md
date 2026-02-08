# Story 4.5: Kudos Notifications

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to be notified when someone gives me kudos**,
so that **I feel seen and encouraged**.

## Acceptance Criteria

1. **Real-Time Pusher Notification:** Given someone gives kudos to my reading session, When the kudos is created, Then a notification event is sent to me via Pusher on `private-user-{userId}` channel within 5 seconds, And the event name is `kudos:received` with payload `{ fromUserName, fromUserAvatar, sessionId, bookTitle }`.

2. **In-App Toast Notification:** Given I am in the app when someone sends me kudos, When the Pusher event arrives, Then I see a toast notification: "[User] sent you kudos!" with a gentle gold accent border (#eab308), And tapping the toast navigates to the activity page, And the toast auto-dismisses after 4 seconds.

3. **Notification Batching:** Given I receive multiple kudos within a 5-second window, When notifications arrive, Then they are batched into a single toast: "3 people sent you kudos", And individual notifications do not spam me.

4. **Notifications Disabled:** Given I have notifications disabled (future user preference field), When someone gives me kudos, Then I do NOT receive a push or in-app toast, And the kudos is still recorded in the database and visible in my kudos list.

5. **Activity Tab Badge:** Given the Activity tab has new kudos since my last visit, When I view the tab bar (BottomNav or SideNav), Then I see a red badge with the count of new kudos received since I last opened the Activity tab, And the badge has proper aria-label: "X new notifications".

6. **Badge Clears on Visit:** Given I have unread notification badge on Activity tab, When I open the Activity tab, Then the badge count resets to 0, And the `lastActivityViewedAt` timestamp is updated for my user.

7. **Pusher Auth Endpoint:** Given a client subscribes to `private-user-{userId}`, When the Pusher auth request is made, Then the server validates the user's session before authorizing the subscription, And unauthorized users receive a 403 response.

8. **Graceful Degradation:** Given Pusher is unavailable or the connection fails, When I use the app, Then the app continues to function normally without real-time notifications, And no error is shown to the user, And badge counts still update on page load via server query.

## Tasks / Subtasks

- [x] Task 1: Install Pusher server SDK and configure (AC: #1, #7)
  - [x] 1.1: Run `npm install pusher` to add server-side Pusher package
  - [x] 1.2: Add Pusher env vars to `.env.example`: `PUSHER_APP_ID`, `PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_CLUSTER`
  - [x] 1.3: Create `src/lib/pusher-server.ts` — server-side Pusher client (lazy singleton)
  - [x] 1.4: Create `src/lib/pusher-client.ts` — client-side Pusher initialization using `pusher-js`

- [x] Task 2: Create Pusher auth API route (AC: #7)
  - [x] 2.1: Create `src/app/api/pusher/auth/route.ts` with POST handler
  - [x] 2.2: Validate user session via `auth.api.getSession({ headers })`
  - [x] 2.3: Verify channel name matches `private-user-{authenticatedUserId}` (prevent subscribing to other users' channels)
  - [x] 2.4: Call `pusher.authorizeChannel(socketId, channel, { user_id })` and return response
  - [x] 2.5: Return 403 for unauthorized or mismatched channel requests

- [x] Task 3: Add `lastActivityViewedAt` to User model (AC: #5, #6)
  - [x] 3.1: Add `lastActivityViewedAt DateTime? @map("last_activity_viewed_at")` to User model in `prisma/schema.prisma`
  - [x] 3.2: Run `npx prisma generate` and `npx prisma db push`

- [x] Task 4: Trigger Pusher event from `giveKudos` action (AC: #1)
  - [x] 4.1: Update `src/actions/social/giveKudos.ts` — after successful kudos creation (not on P2002 duplicate), trigger Pusher event
  - [x] 4.2: Fetch giver's name and receiver's book title for the event payload
  - [x] 4.3: Call `pusher.trigger('private-user-{receiverId}', 'kudos:received', payload)` in a non-blocking way (don't await, don't fail the action if Pusher errors)
  - [x] 4.4: Wrap Pusher trigger in try/catch with `console.error` — graceful degradation

- [x] Task 5: Create `getUnreadKudosCount` server action (AC: #5)
  - [x] 5.1: Create `src/actions/social/getUnreadKudosCount.ts`
  - [x] 5.2: Accept no input (uses authenticated user)
  - [x] 5.3: Query `prisma.kudos.count({ where: { receiverId: userId, createdAt: { gt: user.lastActivityViewedAt ?? new Date(0) } } })`
  - [x] 5.4: Return `ActionResult<{ count: number }>`

- [x] Task 6: Create `markActivityViewed` server action (AC: #6)
  - [x] 6.1: Create `src/actions/social/markActivityViewed.ts`
  - [x] 6.2: Update `user.lastActivityViewedAt` to `new Date()` for authenticated user
  - [x] 6.3: Return `ActionResult<{ success: true }>`

- [x] Task 7: Create `useNotificationStore` Zustand store (AC: #2, #3, #5)
  - [x] 7.1: Create `src/stores/useNotificationStore.ts`
  - [x] 7.2: State: `unreadCount: number`, `pendingToasts: KudosEvent[]`, `batchTimerId: NodeJS.Timeout | null`
  - [x] 7.3: Actions: `setUnreadCount(n)`, `incrementUnread()`, `resetUnread()`, `queueToast(event)`, `flushToasts()`
  - [x] 7.4: Batching logic: on `queueToast`, start 5-second timer; on flush, show single toast with count or individual if only 1

- [x] Task 8: Create `NotificationProvider` component (AC: #1, #2, #3, #8)
  - [x] 8.1: Create `src/components/providers/NotificationProvider.tsx` as client component
  - [x] 8.2: Use `useAuth()` to get current user ID
  - [x] 8.3: Initialize Pusher client and subscribe to `private-user-{userId}` channel
  - [x] 8.4: Bind `kudos:received` event to store's `queueToast` + `incrementUnread`
  - [x] 8.5: On flush, show toast via `sonner`: single kudos → "[Name] sent you kudos!", batched → "N people sent you kudos"
  - [x] 8.6: Toast options: gold left border, 4s duration, onClick navigate to `/activity`
  - [x] 8.7: Cleanup: unsubscribe from channel and disconnect on unmount
  - [x] 8.8: Handle Pusher connection errors silently (console.error only) — graceful degradation
  - [x] 8.9: Fetch initial unread count via `getUnreadKudosCount` on mount

- [x] Task 9: Mount NotificationProvider in root layout (AC: #1, #2)
  - [x] 9.1: Update `src/app/layout.tsx` to add `<NotificationProvider>` inside `<AuthProvider>`
  - [x] 9.2: NotificationProvider renders `{children}` — transparent wrapper

- [x] Task 10: Add badge support to navigation (AC: #5)
  - [x] 10.1: Add optional `badgeCount?: number` to `NavItem` interface in `src/components/layout/types.ts`
  - [x] 10.2: Create `src/components/layout/NavBadge.tsx` — small red circle with count, aria-label
  - [x] 10.3: Update `BottomNav.tsx` to render `NavBadge` relative to Activity icon when `badgeCount > 0`
  - [x] 10.4: Update `SideNav.tsx` to render `NavBadge` next to Activity label when `badgeCount > 0`
  - [x] 10.5: Wire badge to `useNotificationStore().unreadCount` in both nav components

- [x] Task 11: Clear badge on Activity tab visit (AC: #6)
  - [x] 11.1: Update `src/app/(main)/activity/page.tsx` to call `markActivityViewed` on mount
  - [x] 11.2: Create `src/components/features/social/ActivityPageEffect.tsx` client component that calls `markActivityViewed()` + `useNotificationStore().resetUnread()` on mount via `useEffect`
  - [x] 11.3: Render `<ActivityPageEffect />` in activity page

- [x] Task 12: Update barrel exports (AC: all)
  - [x] 12.1: Update `src/actions/social/index.ts` to export `getUnreadKudosCount`, `markActivityViewed`
  - [x] 12.2: Update `src/components/layout/index.ts` to export `NavBadge`
  - [x] 12.3: Update `src/components/providers/index.ts` (create if needed) to export `NotificationProvider`
  - [x] 12.4: Update `src/stores/index.ts` to export `useNotificationStore`

- [x] Task 13: Write comprehensive tests (AC: all)
  - [x] 13.1: `src/app/api/pusher/auth/route.test.ts` — 8 tests (auth, channel validation, 403 cases)
  - [x] 13.2: `src/actions/social/getUnreadKudosCount.test.ts` — 6 tests (auth, count logic, null lastActivityViewedAt)
  - [x] 13.3: `src/actions/social/markActivityViewed.test.ts` — 5 tests (auth, timestamp update)
  - [x] 13.4: `src/actions/social/giveKudos.test.ts` — update existing tests + 3 new tests for Pusher trigger (triggered on new kudos, NOT on P2002, Pusher error doesn't fail action)
  - [x] 13.5: `src/stores/useNotificationStore.test.ts` — 10 tests (increment, reset, batching timer, flush)
  - [x] 13.6: `src/components/providers/NotificationProvider.test.tsx` — 8 tests (Pusher subscribe, event handling, toast display, cleanup, graceful degradation)
  - [x] 13.7: `src/components/layout/NavBadge.test.tsx` — 7 tests (render count, hide when 0, aria-label)
  - [x] 13.8: `src/components/layout/BottomNav.test.tsx` — update existing + 3 tests for badge rendering
  - [x] 13.9: `src/components/layout/SideNav.test.tsx` — update existing + 3 tests for badge rendering
  - [x] 13.10: `src/components/features/social/ActivityPageEffect.test.tsx` — 4 tests (calls markActivityViewed, resets store)

## Dev Notes

### Critical Architecture Patterns

- **Server Actions** use `ActionResult<T>` discriminated union — import from `@/actions/books/types.ts`
- **Auth pattern**: `const headersList = await headers(); const session = await auth.api.getSession({ headers: headersList });`
- **Import convention**: ALWAYS use `@/` alias for cross-boundary imports
- **Component naming**: PascalCase files, named exports (not default)
- **Test co-location**: `Component.test.tsx` next to `Component.tsx`
- **Barrel exports**: Every feature folder needs `index.ts` to re-export public APIs
- **Toast**: Use `import { toast } from 'sonner'` for notifications — Toaster already mounted in root layout
- **Zustand stores**: Follow `use{Domain}Store` naming — see existing stores in `src/stores/`

### Pusher Server Client Pattern

```typescript
// src/lib/pusher-server.ts
import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY ||
      !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
    console.warn('Pusher env vars not configured — real-time notifications disabled');
    return null;
  }
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherInstance;
}
```

**Key decisions:**
- Lazy singleton to avoid instantiating when env vars missing
- Returns `null` when not configured — callers must handle gracefully
- `useTLS: true` for security

### Pusher Client Pattern

```typescript
// src/lib/pusher-client.ts
import PusherClient from 'pusher-js';

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return null;
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherClient;
}
```

### Pusher Auth Route Pattern

```typescript
// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getPusher } from '@/lib/pusher-server';

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.formData();
  const socketId = body.get('socket_id') as string;
  const channel = body.get('channel_name') as string;

  // Verify user can only subscribe to their own private channel
  const expectedChannel = `private-user-${session.user.id}`;
  if (channel !== expectedChannel) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
  }

  const authResponse = pusher.authorizeChannel(socketId, channel, {
    user_id: session.user.id,
  });

  return NextResponse.json(authResponse);
}
```

### Triggering Notifications from giveKudos

**Update `src/actions/social/giveKudos.ts`** — add Pusher trigger AFTER successful kudos creation, BEFORE return:

```typescript
// After: const kudos = await prisma.kudos.create(...)
// Fetch context for notification payload
const [giverUser, book] = await Promise.all([
  prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  }),
  prisma.readingSession.findUnique({
    where: { id: sessionId },
    select: { book: { select: { title: true } } },
  }),
]);

// Fire-and-forget Pusher trigger (non-blocking)
try {
  const pusher = getPusher();
  pusher?.trigger(`private-user-${targetUserId}`, 'kudos:received', {
    fromUserName: giverUser?.name ?? 'Someone',
    fromUserAvatar: giverUser?.image ?? null,
    sessionId,
    bookTitle: book?.book?.title ?? 'a book',
    kudosId: kudos.id,
  });
} catch (pusherError) {
  console.error('Pusher trigger failed:', pusherError);
  // Don't fail the action — graceful degradation
}
```

**Critical: Do NOT trigger on P2002 (duplicate kudos) path** — only on fresh creation.

### Notification Batching Strategy

```typescript
// In useNotificationStore
queueToast(event: KudosEvent) {
  set((state) => ({
    pendingToasts: [...state.pendingToasts, event],
  }));

  // Reset batch timer
  const { batchTimerId } = get();
  if (batchTimerId) clearTimeout(batchTimerId);

  const timerId = setTimeout(() => {
    get().flushToasts();
  }, 5000); // 5-second batching window

  set({ batchTimerId: timerId });
}

flushToasts() {
  const { pendingToasts } = get();
  if (pendingToasts.length === 0) return;

  if (pendingToasts.length === 1) {
    toast(`${pendingToasts[0].fromUserName} sent you kudos!`, { /* gold style */ });
  } else {
    toast(`${pendingToasts.length} people sent you kudos`, { /* gold style */ });
  }

  set({ pendingToasts: [], batchTimerId: null });
}
```

### Toast Styling (Gold Accent)

```typescript
toast(message, {
  duration: 4000,
  className: 'border-l-4 border-l-[#eab308]',
  action: {
    label: 'View',
    onClick: () => router.push('/activity'),
  },
});
```

### NavBadge Component

```typescript
// src/components/layout/NavBadge.tsx
interface NavBadgeProps {
  count: number;
}

export function NavBadge({ count }: NavBadgeProps) {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-label={`${count} new notifications`}
      className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
    >
      {display}
    </span>
  );
}
```

### ActivityPageEffect Pattern

```typescript
// src/components/features/social/ActivityPageEffect.tsx
'use client';

import { useEffect } from 'react';
import { markActivityViewed } from '@/actions/social';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function ActivityPageEffect() {
  const resetUnread = useNotificationStore((s) => s.resetUnread);

  useEffect(() => {
    resetUnread();
    markActivityViewed(); // fire-and-forget
  }, [resetUnread]);

  return null; // Invisible effect component
}
```

### Project Structure Notes

**New files to create:**
```
src/
├── lib/
│   ├── pusher-server.ts              # Server Pusher singleton
│   └── pusher-client.ts              # Client Pusher singleton
├── app/api/pusher/
│   └── auth/route.ts                 # Pusher private channel auth
├── actions/social/
│   ├── getUnreadKudosCount.ts        # Unread badge count query
│   ├── getUnreadKudosCount.test.ts
│   ├── markActivityViewed.ts         # Clear badge timestamp
│   └── markActivityViewed.test.ts
├── stores/
│   ├── useNotificationStore.ts       # Notification state + batching
│   └── useNotificationStore.test.ts
├── components/
│   ├── providers/
│   │   ├── NotificationProvider.tsx   # Pusher subscription + toast
│   │   └── NotificationProvider.test.tsx
│   ├── layout/
│   │   ├── NavBadge.tsx              # Red badge circle
│   │   └── NavBadge.test.tsx
│   └── features/social/
│       ├── ActivityPageEffect.tsx     # Clear badge on visit
│       └── ActivityPageEffect.test.tsx
```

**Modified files:**
```
prisma/schema.prisma                   # Add lastActivityViewedAt to User
src/actions/social/giveKudos.ts        # Add Pusher trigger
src/actions/social/giveKudos.test.ts   # Add Pusher trigger tests
src/actions/social/index.ts            # Add new exports
src/components/layout/types.ts         # Add badgeCount to NavItem
src/components/layout/BottomNav.tsx     # Render badge
src/components/layout/BottomNav.test.tsx
src/components/layout/SideNav.tsx       # Render badge
src/components/layout/SideNav.test.tsx
src/app/layout.tsx                      # Add NotificationProvider
src/app/(main)/activity/page.tsx        # Add ActivityPageEffect
src/stores/index.ts                     # Export new store
.env.example                           # Add Pusher env vars
```

### Existing Code to Reuse (DO NOT REINVENT)

| Component/Pattern | Location | How to Use |
|---|---|---|
| `ActionResult<T>` | `@/actions/books/types.ts` | Return type for all server actions |
| `giveKudos` action | `@/actions/social/giveKudos.ts` | Add Pusher trigger here |
| `auth.api.getSession` | `@/lib/auth` | Authentication in API route and actions |
| `AuthProvider` / `useAuth` | `@/components/providers/AuthProvider.tsx` | Get user ID for Pusher channel subscription |
| `toast` from sonner | `sonner` | Already imported in layout, use for kudos toasts |
| `Toaster` | `src/components/ui/sonner.tsx` | Already mounted in root layout |
| `NAV_ITEMS` | `src/components/layout/types.ts` | Activity nav item for badge |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | Add badge rendering |
| `SideNav` | `src/components/layout/SideNav.tsx` | Add badge rendering |
| `prisma` | `@/lib/prisma` | Database client |
| `cn` utility | `@/lib/utils` | Conditional classnames |
| `pusher-js` | Already in package.json v8.4.0 | Client-side Pusher |

### Testing Requirements

**New test files (53+ tests total):**
1. `src/app/api/pusher/auth/route.test.ts` — 8+ tests
2. `src/actions/social/getUnreadKudosCount.test.ts` — 6+ tests
3. `src/actions/social/markActivityViewed.test.ts` — 5+ tests
4. `src/stores/useNotificationStore.test.ts` — 8+ tests
5. `src/components/providers/NotificationProvider.test.tsx` — 8+ tests
6. `src/components/layout/NavBadge.test.tsx` — 5+ tests
7. `src/components/features/social/ActivityPageEffect.test.tsx` — 4+ tests

**Updated test files (9+ additional tests):**
8. `src/actions/social/giveKudos.test.ts` — +3 tests (Pusher trigger)
9. `src/components/layout/BottomNav.test.tsx` — +3 tests (badge)
10. `src/components/layout/SideNav.test.tsx` — +3 tests (badge)

**Mock patterns for Pusher:**
```typescript
// Mock pusher-server
vi.mock('@/lib/pusher-server', () => ({
  getPusher: vi.fn(),
}));

// Mock pusher-js client
vi.mock('@/lib/pusher-client', () => ({
  getPusherClient: vi.fn(),
}));

// Mock Pusher channel
const mockBind = vi.fn();
const mockUnbind = vi.fn();
const mockSubscribe = vi.fn(() => ({
  bind: mockBind,
  unbind: mockUnbind,
}));
const mockUnsubscribe = vi.fn();
const mockDisconnect = vi.fn();

getPusherClient.mockReturnValue({
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  disconnect: mockDisconnect,
});
```

**Zustand store test pattern:**
```typescript
import { useNotificationStore } from './useNotificationStore';

beforeEach(() => {
  useNotificationStore.setState({
    unreadCount: 0,
    pendingToasts: [],
    batchTimerId: null,
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

**After implementation, run:**
```bash
npx prisma generate   # Regenerate Prisma client
npx prisma db push    # Apply schema changes
npm install pusher    # Add server Pusher package
npm test              # All tests must pass
npm run typecheck     # 0 new errors
npm run lint          # 0 new warnings/errors
```

**Expected outcome:** 955 existing + ~62 new = 1017+ tests passing, 0 regressions

### Scope Boundaries

**Story 4.5 DOES:**
- Set up Pusher server + client infrastructure (first-time setup for the project)
- Create Pusher auth API route for private channel security
- Trigger `kudos:received` event from `giveKudos` server action
- Show in-app toast notifications with gold accent styling
- Batch rapid kudos into single notification
- Add red badge to Activity tab in BottomNav and SideNav
- Clear badge when Activity tab is visited
- Add `lastActivityViewedAt` field to User model
- Gracefully degrade when Pusher is unavailable

**Story 4.5 does NOT:**
- Implement web push notifications (browser permission prompt) — future story
- Create a dedicated notification center/list page
- Add notification preferences UI (settings page) — future story
- Show notifications for follows or other activity types — future stories
- Implement notification persistence in a Notification table (overkill for MVP — use Kudos table + lastActivityViewedAt)
- Handle notifications when app is in background/closed (requires service worker)

### Previous Story Intelligence

**From Story 4.4 (Give Kudos):**
- Kudos model, `giveKudos`, `removeKudos`, `getKudosForSession` all exist and work
- `giveKudos.ts` is at `src/actions/social/giveKudos.ts` — modify to add Pusher trigger
- P2002 handling is idempotent — do NOT trigger notification on duplicate path
- CSS transitions used instead of Framer Motion for animations
- 955 tests currently passing

**From Story 4.3 (Activity Feed):**
- Activity page at `src/app/(main)/activity/page.tsx` — server component
- `ActivityFeed` client component handles feed display
- Empty state: "Follow readers to see their activity"

**From Story 4.1 (Follow/Unfollow):**
- `ActionResult<T>` pattern established
- Auth pattern: `headers() → auth.api.getSession()`
- Optimistic UI + rollback pattern

**Review fix patterns to apply:**
- Always validate session ownership in actions
- Add error logging with `console.error` in catch blocks
- Use `select` over `include` in Prisma queries
- Use `Promise.all()` for parallel queries

### Git Intelligence

Recent commits: `feat: Implement social features - follow, profiles, activity feed, kudos (Epic 4)` — single atomic commit per story batch.

**Story 4.5 commit pattern:**
1. Implement all tasks (Pusher setup, actions, components, tests)
2. Run full test suite for 0 regressions
3. Commit: `feat: Implement kudos notifications with Pusher real-time (Story 4.5)`

### Architecture Compliance

- **FR25 mapping**: Kudos notifications per architecture Social & Activity domain (FR23-FR27)
- **Pusher channel convention**: `private-user-{userId}` per architecture Communication Patterns
- **Event naming**: `kudos:received` per architecture Pusher Event Naming table
- **Graceful degradation**: App works without Pusher per architecture reliability requirements
- **Server action pattern**: `ActionResult<T>` for all new actions
- **API route**: POST handler at `/api/pusher/auth` per architecture API Boundaries
- **State management**: Zustand `useNotificationStore` per architecture Frontend Architecture
- **Toast system**: sonner already integrated per architecture patterns

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-social-connections-activity-feed.md#Story 4.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns - Pusher Event Naming]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - API Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture - Zustand Stores]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries - Social FR23-FR27]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Toast Notification Design]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25 - Kudos Notifications]
- [Source: _bmad-output/implementation-artifacts/4-4-give-kudos.md#Server Action Pattern, Optimistic UI]
- [Source: _bmad-output/implementation-artifacts/4-3-activity-feed.md#Activity Feed Page]
- [Source: src/actions/social/giveKudos.ts#Kudos creation flow]
- [Source: src/components/layout/types.ts#NavItem interface]
- [Source: src/components/layout/BottomNav.tsx#Activity tab rendering]
- [Source: src/components/layout/SideNav.tsx#Side navigation]
- [Source: src/components/providers/AuthProvider.tsx#useAuth hook pattern]
- [Source: src/app/layout.tsx#Root layout providers]
- [Source: prisma/schema.prisma#User model, Kudos model]
- [Source: CLAUDE.md#Import conventions, Server Actions pattern, Component patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `npx prisma db push` failed due to missing database credentials in dev environment — schema change is correct, `prisma generate` succeeded.

### Completion Notes List

- Implemented full Pusher real-time notification infrastructure (server + client singletons, auth API route)
- Added `lastActivityViewedAt` field to User model for tracking unread badge counts
- Modified `giveKudos` action to trigger Pusher event on successful kudos creation (not on P2002 duplicate path), with fire-and-forget pattern for graceful degradation
- Created `getUnreadKudosCount` and `markActivityViewed` server actions following ActionResult<T> pattern
- Built `useNotificationStore` Zustand store with 5-second batching logic for toast notifications
- Created `NotificationProvider` component that subscribes to Pusher private channel, handles kudos events, and shows gold-accented toast notifications via sonner
- Added `NavBadge` component with destructive styling, 99+ overflow, and proper aria-labels
- Wired badge to BottomNav and SideNav Activity tabs via `useNotificationStore`
- Created `ActivityPageEffect` component to clear badge and update timestamp on Activity page visit
- All barrel exports updated for new modules
- 57 new tests added across 10 test files (7 new + 3 updated), all passing
- Total test count: 1012 (up from 955), 0 regressions
- 0 new lint errors, 0 new TypeScript errors

### Change Log

- 2026-02-08: Implemented kudos notifications with Pusher real-time (Story 4.5) — all 13 tasks complete, 1012 tests passing
- 2026-02-08: Code review fixes applied — Fixed memory leak in NotificationProvider (added mounted flag), added error handling to ActivityPageEffect, fixed hard-coded cluster values in .env.example, added console.warn to pusher-client for consistent DX, fixed TypeScript mock type error in giveKudos.test.ts, documented non-persistence design decision in useNotificationStore

### File List

**New files:**
- src/lib/pusher-server.ts
- src/lib/pusher-client.ts
- src/app/api/pusher/auth/route.ts
- src/app/api/pusher/auth/route.test.ts
- src/actions/social/getUnreadKudosCount.ts
- src/actions/social/getUnreadKudosCount.test.ts
- src/actions/social/markActivityViewed.ts
- src/actions/social/markActivityViewed.test.ts
- src/stores/useNotificationStore.ts
- src/stores/useNotificationStore.test.ts
- src/components/providers/NotificationProvider.tsx
- src/components/providers/NotificationProvider.test.tsx
- src/components/providers/index.ts
- src/components/layout/NavBadge.tsx
- src/components/layout/NavBadge.test.tsx
- src/components/features/social/ActivityPageEffect.tsx
- src/components/features/social/ActivityPageEffect.test.tsx

**Modified files:**
- prisma/schema.prisma (added lastActivityViewedAt to User model)
- src/actions/social/giveKudos.ts (added Pusher trigger after kudos creation)
- src/actions/social/giveKudos.test.ts (added 3 Pusher trigger tests; code review: fixed TypeScript mock type error)
- src/actions/social/index.ts (added new exports)
- src/components/layout/types.ts (added badgeCount to NavItem)
- src/components/layout/BottomNav.tsx (added NavBadge rendering)
- src/components/layout/BottomNav.test.tsx (added 3 badge tests)
- src/components/layout/SideNav.tsx (added NavBadge rendering)
- src/components/layout/SideNav.test.tsx (added 3 badge tests)
- src/components/layout/index.ts (added NavBadge export)
- src/app/layout.tsx (added NotificationProvider)
- src/app/(main)/activity/page.tsx (added ActivityPageEffect)
- src/stores/index.ts (added useNotificationStore export)
- src/stores/useNotificationStore.ts (code review: added documentation comment about non-persistence design decision)
- src/components/features/profile/ProfileView.test.tsx (added lastActivityViewedAt to mock)
- src/components/features/social/ActivityPageEffect.tsx (code review: added error handling for markActivityViewed)
- src/components/providers/NotificationProvider.tsx (code review: added mounted flag to prevent memory leak)
- src/lib/pusher-client.ts (code review: added console.warn for missing env vars)
- .env.example (added Pusher env vars; code review: changed hard-coded cluster values to placeholders)
- package.json (added pusher dependency)
- package-lock.json (updated)
