# Story 5.4: Leave Reading Room

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to leave a reading room when I'm done**,
so that **my presence is accurate and I'm not shown as reading when I'm not**.

## Acceptance Criteria

1. **Manual Leave:** When I am in a reading room and I tap "Leave Room" or end my session, I am unsubscribed from the presence channel, my avatar is removed from the PresenceAvatarStack, other users see me leave (within 5 seconds via Pusher or 30 seconds via polling), and my RoomPresence record is updated with a `leftAt` timestamp.

2. **Automatic Leave on Session End:** When I stop my reading timer and save or discard the session via SessionSummary, I am automatically removed from the room. I see a toast: "Session saved! You've left the reading room." (or "Session discarded. You've left the reading room." if discarded).

3. **Idle Timeout (30 minutes):** When I've been idle for 30 minutes (no mouse/keyboard/touch activity), I am automatically removed from the room. My presence record is marked with `leftAt`. If I return and interact with the page, I can rejoin easily via the "Join Room" button.

4. **Browser/Tab Close Cleanup:** When I close the browser or tab while in a reading room, Pusher removes me from the presence channel after its disconnect timeout (~30 seconds). A `navigator.sendBeacon()` call fires on `beforeunload` to trigger server-side `leaveRoom` cleanup, ensuring the RoomPresence database record is updated even if the tab closes before a normal fetch completes.

5. **Last Person Leaves - Empty Room:** When I leave a room and I was the last person, the room shows the empty state gracefully with the message: "Be the first to return!" Other users who navigate to this book see the standard preview state with "0 readers".

## Tasks / Subtasks

- [x] Task 1: Add auto-leave on session end (AC: #2)
  - [x] 1.1 In `SessionSummary.tsx`, after successful save (`handleSave`) or discard (`handleDiscard`), call `leaveRoom(bookId)` server action
  - [x] 1.2 Show toast after leave: "Session saved! You've left the reading room." (save) or "Session discarded. You've left the reading room." (discard)
  - [x] 1.3 Only call `leaveRoom` if user is currently in a room (check `usePresenceStore.getState().currentChannel`)
  - [x] 1.4 Update `SessionSummary.test.tsx` to verify leaveRoom is called on save and discard

- [x] Task 2: Add idle timeout to ReadingRoomPanel (AC: #3)
  - [x] 2.1 Create `useIdleTimeout` hook in `src/hooks/useIdleTimeout.ts` that tracks user activity (mousemove, keydown, touchstart, scroll) and fires a callback after a configurable timeout (default 30 minutes)
  - [x] 2.2 In `ReadingRoomPanel.tsx`, when joined, use `useIdleTimeout` with 30-minute timeout that calls `leaveRoom(bookId)` and shows toast: "You've been idle for 30 minutes and left the reading room."
  - [x] 2.3 Reset the idle timer whenever the heartbeat runs (heartbeat already fires every 5 minutes, confirming activity)
  - [x] 2.4 When idle timeout fires, also call `leaveChannel()` from `usePresenceStore` and unsubscribe from Pusher via the hook cleanup
  - [x] 2.5 Write `useIdleTimeout.test.ts` co-located tests with fake timers
  - [x] 2.6 Update `ReadingRoomPanel.test.tsx` with idle timeout integration tests

- [x] Task 3: Browser/tab close cleanup (AC: #4) — SKIPPED by user decision
  - [x] 3.1 Pusher already handles real-time member removal on disconnect (~30s). Idle timeout (Task 2) handles database cleanup when heartbeats stop. sendBeacon API route adds complexity for marginal gain and causes multi-tab edge case issues. Relying on Pusher disconnect + idle timeout instead.

- [x] Task 4: Verify manual leave and empty room transitions (AC: #1, #5)
  - [x] 4.1 Verify existing "Leave Room" button in `ReadingRoomPanel` works correctly (already implemented in Story 5.2 — verify no regressions)
  - [x] 4.2 Verify that when the last user leaves, the `ReadingRoomPanel` transitions to the empty/preview state showing "Be the first to return!" (this should already work from Story 5.2's empty state handling — verify)
  - [x] 4.3 Add test case: last person leaves → panel shows preview state with 0 readers
  - [x] 4.4 Verify `PresenceAvatarStack` exit animation fires correctly when user leaves (Framer Motion AnimatePresence from Story 5.3)

- [x] Task 5: Update barrel exports and run full test suite (AC: all)
  - [x] 5.1 Add `useIdleTimeout` export to `src/hooks/index.ts` (`useBeforeUnloadLeave` skipped with Task 3)
  - [x] 5.2 Run `npm run test:run` — 113 suites passed, 1190 tests passed (2 pre-existing failures in AppShell unrelated to this story)
  - [x] 5.3 Run `npm run typecheck` — no new TypeScript errors (pre-existing errors in useOfflineStore.test.ts only)
  - [x] 5.4 Run `npm run lint` — no new ESLint errors (fixed callbackRef render access in useIdleTimeout; 2 pre-existing errors remain)

## Dev Notes

### Architecture Constraints

- **Hybrid presence model**: Database (PostgreSQL) is source of truth. Pusher provides real-time overlay. Polling (30s) is fallback. Both paths update the same `usePresenceStore` members Map. When a user leaves, the database record is updated (`leftAt` set) AND Pusher fires `member_removed`.
- **Pusher disconnect timeout**: When a user closes their tab/browser, Pusher detects the disconnect and fires `member_removed` to other subscribers within ~30 seconds. However, this does NOT update the database. The `sendBeacon` approach and/or stale record cleanup handles database consistency.
- **usePresenceStore is memory-only** (volatile, NOT persisted to IndexedDB). Resets on page refresh. This is by design.
- **Channel naming**: `presence-room-{bookId}` (standardized in Story 5.1).
- **30-minute idle timeout**: This matches the "background presence" window from Story 5.2 (AC #4). After 30 minutes with no user activity AND no heartbeat, presence should end.
- **Heartbeat interval**: 5 minutes (already implemented in ReadingRoomPanel, Story 5.2). The heartbeat updates `lastActiveAt` in the database. The idle timeout should NOT fire while heartbeats are running (user has the page open and is interacting).

### Existing Code to REUSE (Do NOT Recreate)

| What | Path | Notes |
|------|------|-------|
| `leaveRoom` server action | `src/actions/presence/leaveRoom.ts` | Already complete. Sets `leftAt` on RoomPresence record. Auth-protected. |
| `ReadingRoomPanel` | `src/components/features/presence/ReadingRoomPanel.tsx` | Has manual "Leave Room" button, heartbeat, join state. **MODIFY IN PLACE** for idle timeout + beforeunload. |
| `usePresenceChannel` hook | `src/hooks/usePresenceChannel.ts` | Manages Pusher subscription, polling fallback, cleanup on unmount. Do NOT modify. |
| `usePresenceStore` (Zustand) | `src/stores/usePresenceStore.ts` | `leaveChannel()` resets client state. Memory-only. Do NOT modify. |
| `PresenceAvatarStack` | `src/components/features/presence/PresenceAvatarStack.tsx` | Has Framer Motion exit animations from Story 5.3. Do NOT modify. |
| `OccupantDetailSheet` | `src/components/features/presence/OccupantDetailSheet.tsx` | Bottom drawer for viewing occupants. Do NOT modify. |
| `SessionTimer` | `src/components/features/sessions/SessionTimer.tsx` | Auto-joins room on start (Story 5.2). Do NOT modify — leave logic goes in SessionSummary. |
| `SessionSummary` | `src/components/features/sessions/SessionSummary.tsx` | Shows after timer stops. **MODIFY** to add leaveRoom on save/discard. |
| `joinRoom` server action | `src/actions/presence/joinRoom.ts` | Transaction-wrapped join. Do NOT modify. |
| `getRoomMembers` server action | `src/actions/presence/getRoomMembers.ts` | Polling fallback data source. Do NOT modify. |
| `updatePresenceHeartbeat` | `src/actions/presence/updatePresenceHeartbeat.ts` | Updates `lastActiveAt`. Do NOT modify. |
| Barrel export | `src/actions/presence/index.ts` | Already exports all presence actions. |
| Pusher auth endpoint | `src/app/api/pusher/auth/route.ts` | Handles `presence-room-*` channels. Do NOT modify. |

### Key Integration Points

- **SessionSummary** (`src/components/features/sessions/SessionSummary.tsx`): This is where auto-leave on session end goes. After the user saves or discards their session, call `leaveRoom(bookId)`. The `SessionSummary` component receives `bookId` prop (passed through from `SessionTimer`). Verify this prop exists; if not, thread it through.
- **ReadingRoomPanel** (`src/components/features/presence/ReadingRoomPanel.tsx`): Add idle timeout and beforeunload hooks here. The component already knows if the user is joined (has `isJoined` state). Use conditional hooks or guard the hook callbacks.
- **No changes to SessionTimer**: The timer's `handleStop()` shows `SessionSummary`. The leave logic fires from `SessionSummary`, not from `SessionTimer`, because the user should complete the save/discard flow before leaving.

### Component Specifications

**`useIdleTimeout` hook (new):**
- Signature: `useIdleTimeout(callback: () => void, timeoutMs: number, enabled: boolean)`
- Tracks: `mousemove`, `keydown`, `touchstart`, `scroll` events on `document`
- Starts timeout on mount (if enabled). Resets on any activity event.
- Fires `callback` once when timeout expires. Does NOT repeat.
- Returns `{ reset: () => void }` to allow external reset (e.g., on heartbeat).
- Cleans up event listeners and timer on unmount or when disabled.
- Does NOT fire if `enabled` is false.

**`useBeforeUnloadLeave` hook (new):**
- Signature: `useBeforeUnloadLeave(bookId: string, enabled: boolean)`
- Registers `beforeunload` event listener when `enabled` is true.
- On `beforeunload`, calls `navigator.sendBeacon('/api/presence/leave', JSON.stringify({ bookId }))`.
- Cleans up event listener on unmount or when `enabled` changes to false.
- Note: `sendBeacon` is fire-and-forget. The API route handles the actual database update. No response is expected.

**`/api/presence/leave` API route (new):**
- Method: POST only
- Body: `{ bookId: string }` (JSON)
- Authentication: Read session from cookies (same approach as `/api/pusher/auth`)
- Logic: Find active RoomPresence record for user+book (leftAt IS NULL), set `leftAt = now()`
- Response: 200 OK (body not read by sendBeacon, but return JSON for testability)
- Error handling: Return 401 if unauthenticated, 400 if missing bookId, 404 if no active presence
- IMPORTANT: This duplicates `leaveRoom` server action logic but as an API route because `sendBeacon` cannot call server actions directly. Keep logic minimal — just the database update.

### Server Action Pattern

Follow the established pattern from Stories 5.1-5.3:

```typescript
'use server';
// leaveRoom already exists — no new server action needed
// New API route follows API route pattern from architecture doc
```

**API Route Pattern (for beacon endpoint):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  // Validate bookId, update RoomPresence...
}
```

### Testing Standards

- Co-locate tests: `hookName.test.ts` next to `hookName.ts`
- **useIdleTimeout tests**: Use `vi.useFakeTimers()` to control time. Test: activity resets timer, callback fires after timeout, cleanup removes listeners, disabled state prevents timeout.
- **useBeforeUnloadLeave tests**: Mock `navigator.sendBeacon` with `vi.fn()`. Simulate `beforeunload` event. Verify beacon URL and payload. Test enabled/disabled toggle.
- **API route tests**: Mock Prisma and auth. Test auth check, bookId validation, successful leave, missing presence record.
- **SessionSummary tests**: Mock `leaveRoom` server action. Verify it's called on save and discard. Verify toast messages.
- **ReadingRoomPanel tests**: Verify idle timeout integration — mock `useIdleTimeout` or use fake timers. Verify beforeunload hook is active when joined.
- Mock patterns established in Stories 5.1-5.3: mock `usePresenceChannel`, `usePresenceStore`, server actions with `vi.mock`.
- Run full suite with `npm run test:run` after implementation to verify zero regressions.

### Previous Story Learnings (from 5.1, 5.2, 5.3)

1. **PostgreSQL NULL uniqueness gotcha**: `@@unique([userId, bookId, leftAt])` doesn't prevent duplicate active presences. The `joinRoom` action handles this with `$transaction`. The `leaveRoom` action queries `leftAt: null` to find the active record. The beacon API route must use the same pattern.
2. **Multi-tab Pusher behavior**: `member_removed` only fires on LAST disconnection for same `user_id`. If user has 2 tabs, closing one does NOT trigger member_removed. This means `sendBeacon` on one tab should NOT close presence if another tab is still open. IMPORTANT: The beacon API route should check if the user still has an active Pusher connection before updating `leftAt`. Alternative: Accept that the database might briefly show the user as left, but the next heartbeat from the other tab will re-join them.
3. **Presence store is volatile**: On page refresh, the hook re-subscribes and repopulates members. Leaving via idle timeout or beforeunload should call both the server action AND reset the store.
4. **usePresenceChannel cleanup**: The hook handles Pusher unsubscribe on unmount. Do NOT manually unsubscribe from Pusher — let the hook handle lifecycle.
5. **Framer Motion exit animations**: Already implemented in Story 5.3 on `PresenceAvatarStack`. When a member is removed from the store's `members` Map, `AnimatePresence` handles the fade-out. No additional animation work needed.
6. **Mock patterns**: `ReadingRoomPanel` tests mock `usePresenceChannel`. `PresenceAvatarStack` tests mock `usePresenceStore`. Follow the same patterns. The framer-motion mock uses function-based pattern to prevent DOM prop warnings.
7. **Presence mocks in BookDetailActions.test.tsx**: Already includes mocks for presence server actions and components to prevent import chain issues (ReadingRoomPanel -> server actions -> prisma -> DATABASE_URL). If new imports are added to `SessionSummary`, similar mocks may be needed in `SessionSummary.test.tsx`.

### Multi-Tab Edge Case (CRITICAL)

When a user has multiple tabs open:
- Tab A and Tab B are both on the same book page, both joined to `presence-room-{bookId}`
- User closes Tab A → `beforeunload` fires → `sendBeacon` calls `/api/presence/leave`
- But Tab B is still open and sending heartbeats

**Solution**: The beacon API route should still set `leftAt` (database consistency). But Tab B's next heartbeat call to `updatePresenceHeartbeat` will fail (no active record). Tab B should detect this and re-join automatically. Alternatively: the beacon API route could check if the user still has other active Pusher connections — but Pusher doesn't expose this easily server-side.

**Simpler approach**: Let `sendBeacon` fire. If the other tab's heartbeat fails, show a "You were disconnected. Rejoin?" prompt. This is simpler and handles the edge case without over-engineering.

**Simplest approach (recommended)**: Do NOT call `sendBeacon` at all if `navigator.sendBeacon` is unreliable. Instead, rely on the combination of:
1. Pusher's built-in disconnect detection (~30s) for real-time member list updates
2. The idle timeout (30 min) for database cleanup if heartbeats stop
3. A stale presence cleanup query that could run periodically (optional, for future stories)

**Decision for this story**: Implement `sendBeacon` as a best-effort optimization. If the multi-tab edge case causes issues during testing, simplify to Pusher disconnect + idle timeout only.

### Git Intelligence (Recent Commits)

```
bab7023 feat: replace Next.js placeholder with public landing page (Story 1.6)
0f42908 chore: migrate middleware.ts to proxy.ts for Next.js 16
6d16efe feat: added migration
42c1ad5 fix: resolve HIGH and MEDIUM code review issues across stories 3-3, 3-4, 3-5, 4-3, 5-2, 5-3
```

Key insights:
- Stories 5.2 and 5.3 had code review fixes applied in commit `42c1ad5` — the current codebase includes these fixes
- Next.js 16 migration happened (middleware.ts -> proxy.ts) — ensure any new middleware or route handlers follow Next.js 16 patterns
- All presence-related code from Stories 5.1-5.3 is committed and reviewed

### UX Guidelines

- **Emotional goal**: Accuracy without surveillance — presence should be accurate but leaving should feel gentle, not punitive
- **No shame or guilt**: Leaving is normal. Don't show "You abandoned the room" — just quietly update.
- **Gentle transitions**: Avatar fade-out on leave (already implemented in Story 5.3)
- **Toast on auto-leave**: Brief, informative, not alarming. Auto-dismiss after 4 seconds.
- **Empty room**: "Be the first to return!" — encouraging, warm, not lonely. Already handled by ReadingRoomPanel's empty state from Story 5.2.
- **Warm Hearth palette**: Amber `#d97706`, Soft Amber `#fbbf24` for presence UI elements
- **44px minimum touch targets** for Leave Room button (already implemented)
- **Respect `prefers-reduced-motion`** — exit animations disabled when set (already handled by Story 5.3)
- **WCAG 2.1 AA**: 4.5:1 contrast for text, 3:1 for UI elements

### Project Structure Notes

Files to modify:
```
src/components/features/sessions/SessionSummary.tsx           (add leaveRoom on save/discard)
src/components/features/sessions/SessionSummary.test.tsx       (add leaveRoom tests)
src/components/features/presence/ReadingRoomPanel.tsx           (add idle timeout + beforeunload hooks)
src/components/features/presence/ReadingRoomPanel.test.tsx      (add idle + beforeunload tests)
```

New files to create:
```
src/hooks/useIdleTimeout.ts                                    (idle detection hook)
src/hooks/useIdleTimeout.test.ts                               (idle hook tests)
src/hooks/useBeforeUnloadLeave.ts                              (beforeunload + sendBeacon hook)
src/hooks/useBeforeUnloadLeave.test.ts                         (beforeunload hook tests)
src/app/api/presence/leave/route.ts                            (sendBeacon API endpoint)
src/app/api/presence/leave/route.test.ts                       (API endpoint tests)
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-reading-rooms-author-presence.md#Story 5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] - Pusher event naming, channel patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] - usePresenceStore specification (memory-only)
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] - API Route vs Server Action decision tree
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] - Component file structure, naming conventions
- [Source: _bmad-output/planning-artifacts/prd.md#FR32] - Users can leave a reading room
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Reading Room Flow] - Leave room UX, empty states, emotional design
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Design] - Ambient over active, gentle over loud
- [Source: _bmad-output/implementation-artifacts/5-1-pusher-presence-channel-spike.md] - Pusher gotchas, disconnect behavior, multi-tab edge cases
- [Source: _bmad-output/implementation-artifacts/5-2-join-reading-room.md] - ReadingRoomPanel, heartbeat, auto-join, leaveRoom integration
- [Source: _bmad-output/implementation-artifacts/5-3-see-room-occupants.md] - Framer Motion exit animations, OccupantDetailSheet, mock patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — no blocking issues encountered during implementation.

### Completion Notes List

1. **Task 3 (Browser/tab close cleanup) was SKIPPED** by user decision. Pusher already handles real-time member removal on disconnect (~30s). The idle timeout (Task 2) handles database cleanup when heartbeats stop. Adding a `sendBeacon` API route would introduce complexity for marginal gain and cause multi-tab edge case issues. Relying on Pusher disconnect + idle timeout instead.
2. **ESLint fix applied** to `useIdleTimeout.ts` — wrapped `callbackRef.current = callback` in a `useEffect` to comply with the `react-hooks/refs` rule (no ref access during render).
3. **Pre-existing test failures** (not from this story): `AppShell.test.tsx` fails due to missing `DATABASE_URL` env var in test environment. `useOfflineStore.test.ts` has TypeScript errors related to `PendingSession` type.
4. **Heartbeat + idle timer coordination**: The heartbeat reset callback also resets the idle timer via a combined `startHeartbeatWithIdleReset` function in `ReadingRoomPanel.tsx`.
5. **Code review fixes applied** (2026-02-09):
   - [HIGH] Added "Be the first to return!" message in ReadingRoomPanel preview state when last person leaves (AC #5)
   - [MEDIUM] Made toast messages conditional — only mentions leaving room when user was actually in a room
   - [MEDIUM] Added try/catch in `tryLeaveRoom()` so leaveRoom failures don't block session save/discard flow
   - [MEDIUM] Added 4 new tests: plain discard toast, leaveRoom error on save, leaveRoom error on discard, no return message on initial render
   - ESLint fix: wrapped `memberCountRef.current` sync in useEffect

### File List

**Modified:**
- `src/components/features/sessions/SessionSummary.tsx` — Auto-leave on session save/discard, conditional toast, error-safe tryLeaveRoom
- `src/components/features/sessions/SessionSummary.test.tsx` — 8 new tests for leave behavior, conditional toasts, error handling
- `src/components/features/presence/ReadingRoomPanel.tsx` — Idle timeout integration, combined heartbeat+idle reset, "Be the first to return!" message, showReturnMessage state
- `src/components/features/presence/ReadingRoomPanel.test.tsx` — 5 new tests for idle timeout + last-person-leaves + return message
- `src/hooks/index.ts` — Added useIdleTimeout barrel export

**Created:**
- `src/hooks/useIdleTimeout.ts` — Custom hook for idle detection (mousemove/keydown/touchstart/scroll)
- `src/hooks/useIdleTimeout.test.ts` — 12 tests with fake timers
