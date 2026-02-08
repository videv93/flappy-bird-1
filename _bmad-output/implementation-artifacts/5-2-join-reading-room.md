# Story 5.2: Join Reading Room

Status: done

## Story

As a user,
I want to join a reading room for the book I'm reading,
so that I feel the ambient presence of other readers.

## Acceptance Criteria

1. **Room Discovery & Entry:** When the book detail page loads for a book the user has in their library, the user sees a `ReadingRoomPanel` showing current room state (reader count, "Join Room" button or current membership status).

2. **Joining the Room:** Upon tapping "Join Room", the user is subscribed to the `presence-room-{bookId}` Pusher channel (or polling fallback). The user's avatar appears in a `PresenceAvatarStack`. A `RoomPresence` record is created/updated via the existing `joinRoom` server action. Other users see the new join within 5 seconds.

3. **Auto-Join via Reading Session:** When the user starts a reading session (timer), they are automatically joined to the book's reading room. A confirmation message shows: "You're reading with X others" (or "You're the first reader here!" if solo).

4. **Background Presence:** When the user navigates away from the book page, presence is maintained for 30 minutes (via `lastActiveAt` in `RoomPresence`). The user can return and still be "in" the room.

5. **Empty Room Experience:** When joining an empty room, the user sees an encouraging warm message: "You're the first reader here!" The room UI feels warm and inviting even when solo.

6. **Leave Room (Manual):** A "Leave Room" button unsubscribes from the presence channel and calls the existing `leaveRoom` server action. The user's avatar is removed from the stack.

7. **Graceful Degradation:** If Pusher is unavailable, the room panel falls back to polling-only mode (30-second intervals via `getRoomMembers`) with a subtle "delayed updates" indicator. All room functionality works in polling mode.

## Tasks / Subtasks

- [x] Task 1: Create `ReadingRoomPanel` component (AC: #1, #5, #6, #7)
  - [x] 1.1 Create `src/components/features/presence/ReadingRoomPanel.tsx` client component
  - [x] 1.2 Integrate `usePresenceChannel` hook with `bookId` as `channelId`
  - [x] 1.3 Implement three states: not-joined (preview), joined (active), empty-room
  - [x] 1.4 Show reader count badge and "Join Room" / "Leave Room" button
  - [x] 1.5 Call existing `joinRoom`/`leaveRoom` server actions on button press
  - [x] 1.6 Show connection mode indicator (real-time vs polling vs disconnected)
  - [x] 1.7 Show warm empty-room message when user is sole reader
  - [x] 1.8 Create `src/components/features/presence/index.ts` barrel export
  - [x] 1.9 Write `ReadingRoomPanel.test.tsx` co-located tests

- [x] Task 2: Create `PresenceAvatarStack` component (AC: #2)
  - [x] 2.1 Create `src/components/features/presence/PresenceAvatarStack.tsx`
  - [x] 2.2 Render overlapping avatar circles (28px, max 5 visible, "+N more" overflow)
  - [x] 2.3 Use `members` from `usePresenceStore` for avatar data
  - [x] 2.4 Handle missing avatars with initials fallback
  - [x] 2.5 Add `aria-label` with reader count (singular/plural)
  - [x] 2.6 Write `PresenceAvatarStack.test.tsx` co-located tests

- [x] Task 3: Integrate `ReadingRoomPanel` into book detail page (AC: #1)
  - [x] 3.1 Import `ReadingRoomPanel` into `BookDetailActions.tsx`
  - [x] 3.2 Render below progress bar, above `SessionTimer`, when `isInLibrary` is true
  - [x] 3.3 Pass `bookId` prop to `ReadingRoomPanel`

- [x] Task 4: Auto-join on reading session start (AC: #3)
  - [x] 4.1 Modify `SessionTimer.tsx` to call `joinRoom(bookId)` when timer starts
  - [x] 4.2 Show toast: "You're reading with X others" or "You're the first reader here!"
  - [x] 4.3 Auto-join should NOT auto-leave when timer stops (presence maintained per AC #4)
  - [x] 4.4 Update `SessionTimer.test.tsx` for auto-join behavior

- [x] Task 5: Background presence heartbeat (AC: #4)
  - [x] 5.1 Create `updatePresenceHeartbeat` server action in `src/actions/presence/`
  - [x] 5.2 Action updates `lastActiveAt` on the active `RoomPresence` record
  - [x] 5.3 Call heartbeat every 5 minutes while user has the app open (via `useEffect` interval in `ReadingRoomPanel`)
  - [x] 5.4 Export from `src/actions/presence/index.ts`
  - [x] 5.5 Write `updatePresenceHeartbeat.test.ts`

- [x] Task 6: Comprehensive testing (AC: all)
  - [x] 6.1 Unit tests for `ReadingRoomPanel` (join/leave, states, connection modes)
  - [x] 6.2 Unit tests for `PresenceAvatarStack` (rendering, overflow, a11y)
  - [x] 6.3 Test auto-join integration in `SessionTimer`
  - [x] 6.4 Test heartbeat server action
  - [x] 6.5 Verify zero regressions: run full suite (`npm run test:run`)

## Dev Notes

### Architecture Constraints

- **Hybrid presence model**: Database (PostgreSQL) is source of truth. Pusher provides real-time overlay. Polling (30s) is fallback.
- **Pusher presence channel limit**: Hard 100 members per channel. For rooms with 100+ concurrent readers, system degrades to polling-only. This is acceptable for MVP.
- **usePresenceStore is memory-only** (volatile, NOT persisted to IndexedDB). Resets on page refresh. This is by design per architecture spec.
- **Channel naming**: `presence-room-{bookId}` (standardized in Story 5.1).
- **1KB user_info limit** in Pusher: Only send `{ name, avatarUrl }`. Do not add fields.

### Existing Code to REUSE (Do NOT Recreate)

| What | Path | Notes |
|------|------|-------|
| `usePresenceChannel` hook | `src/hooks/usePresenceChannel.ts` | Manages subscription lifecycle, polling fallback, cleanup. Already complete. |
| `usePresenceStore` (Zustand) | `src/stores/usePresenceStore.ts` | Members map, connectionMode, isConnected. Memory-only. |
| `joinRoom` server action | `src/actions/presence/joinRoom.ts` | Transaction-wrapped, handles re-join. Returns `RoomPresence`. |
| `leaveRoom` server action | `src/actions/presence/leaveRoom.ts` | Sets `leftAt` timestamp. |
| `getRoomMembers` server action | `src/actions/presence/getRoomMembers.ts` | Auth-protected. Returns `RoomMember[]` with user data. |
| `getPusherClient` | `src/lib/pusher-client.ts` | Singleton. Returns `null` if not configured. |
| `getPusher` (server) | `src/lib/pusher-server.ts` | Singleton. Returns `null` if not configured. |
| Pusher auth endpoint | `src/app/api/pusher/auth/route.ts` | Handles `presence-room-*` channels with user_info. |
| `RoomPresence` Prisma model | `prisma/schema.prisma` | Fields: userId, bookId, joinedAt, lastActiveAt, leftAt, isAuthor. |

### Key Integration Points

- **BookDetailActions** (`src/components/features/books/BookDetailActions.tsx`): Insert `ReadingRoomPanel` between the progress bar section and the `SessionTimer`. Only render when `isInLibrary === true` (not just `CURRENTLY_READING` - show room for all library statuses).
- **SessionTimer** (`src/components/features/sessions/SessionTimer.tsx`): Add `joinRoom(bookId)` call in the `start()` handler. Import from `@/actions/presence`. The timer already has `bookId` prop.
- **SessionSummary** (`src/components/features/sessions/SessionSummary.tsx`): Do NOT auto-leave on session save. Presence persists independently of timer per AC #4.

### Component Specifications

**ReadingRoomPanel:**
- Props: `{ bookId: string; className?: string }`
- Uses `usePresenceChannel({ channelId: bookId })` internally
- States: `preview` (not joined, shows count + Join button), `joined` (shows avatars + Leave button), `empty` (warm message)
- Connection mode badge: green dot "Live" for realtime, amber dot "Delayed" for polling, gray dot "Offline" for disconnected
- Warm amber color palette per UX spec (`#d97706` primary, `#fbbf24` presence pulse)

**PresenceAvatarStack:**
- Props: `{ members: Map<string, PresenceMember>; maxVisible?: number; size?: number }`
- Default `maxVisible: 5`, default `size: 28` (px)
- Avatar circles overlap with slight offset (-8px margin-left after first)
- "+N more" pill when overflow
- Initials fallback: first letter of `name`, neutral background
- `aria-label="N readers in room"` (singular for 1)

### Server Action Pattern

Follow the established pattern from Story 5.1:

```typescript
'use server';
export async function updatePresenceHeartbeat(bookId: string): Promise<ActionResult<{ updated: boolean }>> {
  // 1. Validate with Zod
  // 2. Check authentication via auth.api.getSession()
  // 3. Update RoomPresence.lastActiveAt where userId + bookId + leftAt is null
  // 4. Return { success: true, data: { updated: true } }
}
```

### Testing Standards

- Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Mock `usePresenceChannel` hook for component tests (don't test Pusher integration)
- Mock `usePresenceStore` for isolated store state testing
- Mock server actions (`joinRoom`, `leaveRoom`, `getRoomMembers`) with `vi.mock`
- Use `@testing-library/react` with `userEvent` for interactions
- Check accessibility: `aria-label`, `role`, touch targets (44px min)
- Test all three states of `ReadingRoomPanel`: preview, joined, empty
- Test `PresenceAvatarStack` overflow rendering
- Run full suite with `npm run test:run` after implementation to verify zero regressions

### Project Structure Notes

New files to create:
```
src/components/features/presence/
  ReadingRoomPanel.tsx
  ReadingRoomPanel.test.tsx
  PresenceAvatarStack.tsx
  PresenceAvatarStack.test.tsx
  index.ts
src/actions/presence/
  updatePresenceHeartbeat.ts       (new)
  updatePresenceHeartbeat.test.ts  (new)
```

Files to modify:
```
src/components/features/books/BookDetailActions.tsx  (add ReadingRoomPanel)
src/components/features/sessions/SessionTimer.tsx    (add auto-join on start)
src/components/features/sessions/SessionTimer.test.tsx (update tests)
src/actions/presence/index.ts                        (add export)
```

### Gotchas from Story 5.1

1. **PostgreSQL NULL uniqueness**: The `@@unique([userId, bookId, leftAt])` constraint does NOT prevent duplicate active presences (leftAt=NULL) because `NULL != NULL`. The `joinRoom` action handles this with a `$transaction` wrapping `findFirst + create`. Do NOT bypass this.
2. **Multi-tab behavior**: Pusher fires `member_added` only on FIRST connection and `member_removed` only on LAST disconnection for the same `user_id`. Multiple tabs = closing one tab does NOT remove user. This is desired behavior.
3. **Presence store is volatile**: Do not persist to IndexedDB. On page refresh, the hook re-subscribes and repopulates members.
4. **usePresenceChannel cleanup**: The hook handles unsubscribe on unmount. Do NOT manually unsubscribe from Pusher in `ReadingRoomPanel` - let the hook handle lifecycle.
5. **Connection mode**: Only set to `'realtime'` after `pusher:subscription_succeeded` fires, NOT on initial subscribe attempt.

### UX Guidelines

- **Emotional goal**: Belonging ("Reading rooms") per UX hierarchy
- **Warm Hearth palette**: Amber `#d97706`, Soft Amber `#fbbf24` for presence pulse
- **Empty room message**: Warm, encouraging - "You're the first reader here!" not "No one is reading"
- **Connection indicator**: Subtle, not alarming - small dot + text, not a banner
- **44px minimum touch targets** for Join/Leave buttons
- **Respect `prefers-reduced-motion`** - disable any pulse animations if set
- **WCAG 2.1 AA**: 4.5:1 contrast for text, 3:1 for UI elements

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-reading-rooms-author-presence.md#Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Reading Rooms UX Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components Strategy]
- [Source: _bmad-output/planning-artifacts/prd.md#Reading Rooms Specification]
- [Source: _bmad-output/implementation-artifacts/5-1-pusher-presence-channel-spike.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

1. Created `ReadingRoomPanel` component with three states: preview (Join button), joined (avatars + Leave button + connection indicator), and empty-room ("You're the first reader here!"). Uses warm amber color palette per UX spec.
2. Created `PresenceAvatarStack` component with overlapping 28px avatars, max 5 visible with "+N more" overflow, initials fallback for missing avatars, and accessible aria-label with singular/plural reader count.
3. Integrated `ReadingRoomPanel` into `BookDetailActions.tsx` between progress bar and `SessionTimer`. Renders for all library statuses (not just CURRENTLY_READING).
4. Added auto-join to `SessionTimer.tsx`: when user starts a reading session, `joinRoom(bookId)` is called and a toast shows reader count ("You're reading with X others" or "You're the first reader here!"). Timer stop does NOT auto-leave (presence maintained per AC #4).
5. Created `updatePresenceHeartbeat` server action following established pattern (Zod validation, auth check, `prisma.roomPresence.updateMany`). Called every 5 minutes via `setInterval` in `ReadingRoomPanel` while joined.
6. Added presence mocks to `BookDetailActions.test.tsx` and `integration.test.tsx` to fix import chain (ReadingRoomPanel → server actions → prisma → DATABASE_URL).
7. All reusable code from Story 5.1 was properly reused: `usePresenceChannel` hook, `usePresenceStore`, `joinRoom`/`leaveRoom`/`getRoomMembers` server actions. No wheel reinvention.

### Change Log

- 2026-02-08: Story 5.2 implementation complete - all 6 tasks, 45 new tests, 0 regressions

### File List

**New files:**
- src/components/features/presence/ReadingRoomPanel.tsx
- src/components/features/presence/ReadingRoomPanel.test.tsx
- src/components/features/presence/PresenceAvatarStack.tsx
- src/components/features/presence/PresenceAvatarStack.test.tsx
- src/components/features/presence/index.ts
- src/actions/presence/updatePresenceHeartbeat.ts
- src/actions/presence/updatePresenceHeartbeat.test.ts

**Modified files:**
- src/components/features/books/BookDetailActions.tsx (added ReadingRoomPanel import and rendering)
- src/components/features/books/BookDetailActions.test.tsx (added presence mocks)
- src/components/features/sessions/SessionTimer.tsx (added auto-join on start)
- src/components/features/sessions/SessionTimer.test.tsx (added auto-join tests)
- src/components/features/sessions/integration.test.tsx (added presence mocks)
- src/actions/presence/index.ts (added updatePresenceHeartbeat export)
