# Story 5.7: Author Join Notification

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to be notified when an author joins a room I'm in**,
so that **I don't miss the magical moment**.

## Acceptance Criteria

1. **Given** I am in a reading room, **When** the verified author of that book joins, **Then** I receive a push notification via Pusher (< 5 seconds), **And** I see a special toast notification with golden styling: "[Author Name] just joined the reading room!", **And** the toast stays visible longer than normal (6 seconds), **And** the toast has a subtle sparkle animation.

2. **Given** the author joins, **When** I see the notification, **Then** the ReadingRoomPanel updates with author presence (golden border glow activates), **And** the PresenceAvatarStack shows the author with golden ring first in the stack.

3. **Given** I have notifications disabled (not subscribed to Pusher / polling-only mode), **When** the author joins, **Then** I don't receive the toast, **But** the UI still updates to show author presence on the next poll cycle, **And** I can discover it naturally when I look.

4. **Given** the author leaves the room, **When** they disconnect, **Then** I see a subtle update (no dramatic notification), **And** the AuthorShimmerBadge updates to "Author was here X minutes ago", **And** the golden glow fades (panel returns to normal border).

5. **Given** accessibility requirements, **When** the author join notification appears, **Then** screen readers announce: "[Author Name], the author, has joined the reading room", **And** the announcement uses `aria-live="polite"`.

## Tasks / Subtasks

- [x] Task 1: Add `room:author-joined` event binding in `usePresenceChannel` (AC: #1, #2)
  - [x] 1.1 In `src/hooks/usePresenceChannel.ts`, bind a new `room:author-joined` event on the presence channel after subscribing
  - [x] 1.2 The event payload shape: `{ authorId: string; authorName: string }`
  - [x] 1.3 Add a new `onAuthorJoin` callback option to `UsePresenceChannelOptions` interface: `onAuthorJoin?: (data: { authorId: string; authorName: string }) => void`
  - [x] 1.4 Store callback in a ref (like existing `onEventRef`) to avoid stale closures
  - [x] 1.5 When `room:author-joined` fires, call `onAuthorJoin` if provided
  - [x] 1.6 Also emit a `PresenceEvent` with `type: 'author_joined'` through existing `onEvent` callback
  - [x] 1.7 Add `'room:author-joined'` to the `unbind_all()` cleanup (already handled by `unbind_all()`)

- [x] Task 2: Trigger `room:author-joined` server-side in `joinRoom` action (AC: #1)
  - [x] 2.1 In `src/actions/presence/joinRoom.ts`, after successfully creating the `RoomPresence` record, check if the joining user is a verified author for this book (the `isAuthor` flag is already computed there)
  - [x] 2.2 If `isAuthor === true`, trigger a Pusher event on `presence-room-{bookId}` channel: `pusherServer.trigger(channelName, 'room:author-joined', { authorId: userId, authorName: userName })`
  - [x] 2.3 Use the fire-and-forget pattern (try/catch, log error, don't block): same pattern as `giveKudos.ts`
  - [x] 2.4 The author's name comes from the session: `session.user.name || 'The author'`

- [x] Task 3: Show golden toast notification in `ReadingRoomPanel` (AC: #1, #3, #5)
  - [x] 3.1 In `ReadingRoomPanel.tsx`, pass `onAuthorJoin` callback to `usePresenceChannel`
  - [x] 3.2 In the callback, use `toast()` from sonner with golden author styling:
    ```typescript
    toast(`✨ ${data.authorName} just joined the reading room!`, {
      duration: 6000,
      className: 'border-l-4 border-l-[var(--author-shimmer,#eab308)]',
    });
    ```
  - [x] 3.3 Also update `authorPresence` state to reflect author is now present: `setAuthorPresence({ isCurrentlyPresent: true, authorName: data.authorName, authorId: data.authorId, lastSeenAt: new Date() })`
  - [x] 3.4 Add an `aria-live="polite"` visually-hidden announcement element that gets text set to `"${data.authorName}, the author, has joined the reading room"` when the event fires (screen reader support)
  - [x] 3.5 If `connectionMode === 'polling'`, do NOT show the toast (user discovers author presence naturally on next poll update per AC #3)

- [x] Task 4: Handle author leave gracefully (AC: #4)
  - [x] 4.1 In `usePresenceChannel`'s existing `pusher:member_removed` handler, add logic: when a removed member has `isAuthor === true`, emit a new event type `'author_left'` and call a new optional `onAuthorLeave?: (data: { authorId: string }) => void` callback
  - [x] 4.2 In `ReadingRoomPanel.tsx`, pass `onAuthorLeave` callback to `usePresenceChannel`
  - [x] 4.3 In the callback: update `authorPresence` state to `{ isCurrentlyPresent: false, lastSeenAt: new Date(), authorName: authorPresence.authorName, authorId: data.authorId }`
  - [x] 4.4 Do NOT show a toast for author leaving (per AC #4: "subtle update, no dramatic notification")
  - [x] 4.5 The UI will automatically update: golden glow fades because `authorInRoom` becomes `false`, and `AuthorShimmerBadge` switches to "Was Here" state showing the timestamp

- [x] Task 5: Write tests for `usePresenceChannel` changes (AC: #1, #4)
  - [x] 5.1 Test: `room:author-joined` event calls `onAuthorJoin` callback with correct payload
  - [x] 5.2 Test: `room:author-joined` event emits `PresenceEvent` with `type: 'author_joined'`
  - [x] 5.3 Test: author removal (member_removed where `isAuthor === true`) calls `onAuthorLeave` callback
  - [x] 5.4 Test: cleanup unbinds `room:author-joined` event (covered by `unbind_all()`)

- [x] Task 6: Write tests for `joinRoom` server-side trigger (AC: #1)
  - [x] 6.1 Test: when verified author joins, Pusher `trigger` is called with `room:author-joined` event and correct payload
  - [x] 6.2 Test: when non-author joins, Pusher `trigger` is NOT called with `room:author-joined`
  - [x] 6.3 Test: Pusher trigger failure doesn't prevent successful join (fire-and-forget pattern)

- [x] Task 7: Write tests for `ReadingRoomPanel` notification behavior (AC: #1, #3, #4, #5)
  - [x] 7.1 Test: when `onAuthorJoin` fires, `toast()` is called with golden styling and 6s duration
  - [x] 7.2 Test: when `onAuthorJoin` fires, `authorPresence` state updates to show author as currently present
  - [x] 7.3 Test: when in polling mode, `onAuthorJoin` does NOT show toast
  - [x] 7.4 Test: when `onAuthorLeave` fires, no toast is shown
  - [x] 7.5 Test: when `onAuthorLeave` fires, `authorPresence` updates to "was here" state
  - [x] 7.6 Test: aria-live announcement is rendered with correct text when author joins

## Dev Notes

### Critical Architecture Patterns

**Server Actions Pattern (MUST FOLLOW):**
All server actions return `ActionResult<T>` discriminated union:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```
[Source: src/actions/books/types.ts]

**Pusher Event Pattern (Fire-and-forget):**
```typescript
try {
  await pusherServer?.trigger(channel, event, payload);
} catch (e) {
  console.error('Pusher trigger failed:', e);
}
```
[Source: src/actions/social/giveKudos.ts]

**Toast Pattern (Sonner):**
```typescript
import { toast } from 'sonner';
toast('Message', {
  duration: 6000,
  className: 'border-l-4 border-l-[#eab308]',
});
```
[Source: src/components/providers/NotificationProvider.tsx:55-62]

**Pusher Event Naming Convention:**
| Event | Channel | Payload |
|-------|---------|---------|
| `room:author-joined` | `presence-room-{bookId}` | `{ authorId, authorName }` |
[Source: architecture.md, Pusher Event Naming table]

### Existing Infrastructure (DO NOT recreate)

The following already exists and MUST be reused:

| Component/File | What It Does | Location |
|---|---|---|
| `usePresenceChannel` hook | Manages Pusher presence subscription + polling fallback | `src/hooks/usePresenceChannel.ts` |
| `usePresenceStore` (Zustand) | Stores members Map with `isAuthor` flag | `src/stores/usePresenceStore.ts` |
| `PresenceMember.isAuthor` | Already exists on the interface | `src/stores/usePresenceStore.ts:7` |
| `ReadingRoomPanel` | Already handles golden border, "Author is here!", AuthorShimmerBadge | `src/components/features/presence/ReadingRoomPanel.tsx` |
| `AuthorShimmerBadge` | Already renders "Was Here" and "Live" states | `src/components/features/presence/AuthorShimmerBadge.tsx` |
| `getAuthorPresence` action | Queries author's latest presence for a book | `src/actions/authors/getAuthorPresence.ts` |
| `NotificationProvider` | Subscribes to `private-user-{userId}` for kudos/claims | `src/components/providers/NotificationProvider.tsx` |
| Pusher auth route | Already includes `isAuthor` in presence `user_info` | `src/app/api/pusher/auth/route.ts` |
| `joinRoom` action | Creates RoomPresence record, already computes `isAuthor` | `src/actions/presence/joinRoom.ts` |
| `leaveRoom` action | Sets `leftAt` timestamp on RoomPresence | `src/actions/presence/leaveRoom.ts` |
| Sonner `toast()` | Toast library already mounted in root layout | `sonner` package |
| CSS `--author-shimmer` variable | Golden color token `#eab308` (light) / `#facc15` (dark) | `src/app/globals.css` |
| `motion-safe:animate-shimmer` | CSS shimmer animation already in Tailwind config | `tailwind.config.ts` |

### Key Design Decisions

1. **Notification Channel**: Use `room:author-joined` custom event on the PRESENCE channel (`presence-room-{bookId}`), NOT a private user channel. This way only users currently in the room get notified. This matches the architecture doc's event naming table.

2. **Server-side trigger vs. client-side detection**: The `member_added` Pusher event already fires when anyone joins. However, we need a SEPARATE `room:author-joined` event triggered server-side from `joinRoom` because:
   - The `member_added` event goes to ALL members including the author themselves
   - We want a dedicated event with author name in the payload
   - It follows the architecture convention of server-triggered custom events

3. **Toast NOT in NotificationProvider**: The author-join toast is triggered in `ReadingRoomPanel` (the component that owns the presence channel subscription), NOT in `NotificationProvider`. This is because:
   - The event fires on the presence channel, not the private user channel
   - Only users who are IN the room should see it
   - `ReadingRoomPanel` already has the `usePresenceChannel` hook

4. **No toast in polling mode**: Per AC #3, if the user is in polling-only mode (Pusher unavailable), they don't get the toast. The author presence will be picked up on the next polling cycle and the UI will update naturally (golden border, "Author is here!" text).

5. **No notification for author leaving**: Per AC #4, author leaving should be subtle. The existing `member_removed` handler will remove them from the members map, which will flip `authorInRoom` to `false`, which will naturally remove golden border and show "Author was here" badge.

6. **Sparkle in toast**: Use Unicode sparkle character `✨` in the toast message text for the sparkle effect (matches UX spec "sparkle icon" but in toast context). The golden left border provides the visual distinction.

### File Modifications Summary

| File | Change | Why |
|------|--------|-----|
| `src/hooks/usePresenceChannel.ts` | Add `onAuthorJoin` and `onAuthorLeave` callbacks, bind `room:author-joined` event | Receive and propagate author join/leave events |
| `src/actions/presence/joinRoom.ts` | Add Pusher trigger for `room:author-joined` when `isAuthor === true` | Server-side notification to room occupants |
| `src/components/features/presence/ReadingRoomPanel.tsx` | Pass `onAuthorJoin`/`onAuthorLeave` to hook, show toast, update state, add aria-live | Toast notification and accessible announcement |

### New Files

None — this story only modifies existing files.

### Test File Modifications

| File | Changes |
|------|---------|
| `src/hooks/usePresenceChannel.test.ts` (existing or new) | Add tests for `room:author-joined` binding, `onAuthorJoin`/`onAuthorLeave` callbacks |
| `src/actions/presence/joinRoom.test.ts` | Add tests for Pusher `room:author-joined` trigger |
| `src/components/features/presence/ReadingRoomPanel.test.tsx` | Add tests for toast, aria-live, polling mode suppression, author leave behavior |

### Previous Story Intelligence

**From Story 5.6 (Author Presence Display) — just completed, in review:**
- `isAuthor` data already flows through 3 paths: server polling, Pusher `user_info`, and `getAuthorPresence` action
- `authorInRoom` is derived from both live member data AND server-fetched data for robustness
- `ReadingRoomPanel` already fetches `getAuthorPresence` on mount and manages `authorPresence` state
- `AuthorShimmerBadge` already has "Live" and "Was Here" states working
- Custom `formatTimeAgo` function used instead of `date-fns` (not installed)
- All tests use co-located `.test.tsx` pattern with Vitest + Testing Library
[Source: _bmad-output/implementation-artifacts/5-6-author-presence-display.md]

**From Story 5.5 (Author Claim & Verification):**
- `NotificationProvider` handles `author:claim-approved` events on `private-user-{userId}` channel
- Toast styling uses `className: 'border-l-4 border-l-[#eab308]'` and `duration: 6000`
- `isAuthor` flag is already set in `joinRoom` by checking `AuthorClaim` status
[Source: _bmad-output/implementation-artifacts/5-5-author-claim-verification.md]

**From Story 5.4 (Leave Reading Room):**
- `leaveRoom` action sets `leftAt` timestamp
- Idle timeout auto-leaves after 30 min
- `tryLeaveRoom` uses fire-and-forget pattern
[Source: _bmad-output/implementation-artifacts/5-4-leave-reading-room.md]

### Git Intelligence

Recent commits show the codebase actively working on Epic 5:
- `6dae837` — Story 5.5 code review fixes (16 files, defensive patterns)
- `78960fe` — Story 5.5 implementation (33 files, Prisma schema + AuthorClaim)
- `a63cab1` — Story 5.4 implementation (idle timeout, heartbeat)

**Working tree has uncommitted Story 5.6 changes** affecting the exact files this story will modify:
- `src/hooks/usePresenceChannel.ts` — already modified for `isAuthor` mapping
- `src/stores/usePresenceStore.ts` — already has `isAuthor` on `PresenceMember`
- `src/components/features/presence/ReadingRoomPanel.tsx` — already has golden border + author presence fetch
- `src/app/api/pusher/auth/route.ts` — already includes `isAuthor` in `user_info`

**CRITICAL**: Story 5.6 changes MUST be committed before starting this story, or the developer must build on top of the uncommitted changes.

### Project Structure Notes

- All imports use `@/` alias for cross-boundary imports [Source: CLAUDE.md]
- Tests co-located with source files (`Component.test.tsx` next to `Component.tsx`)
- Barrel exports in `index.ts` for each feature folder
- Zustand stores named `use{Domain}Store` pattern
- Server actions in `src/actions/{domain}/` folders

### Anti-Patterns to Avoid

- **DO NOT** create a new component for the toast — use sonner's `toast()` function directly
- **DO NOT** listen for author join on `private-user-{userId}` channel — use the presence channel
- **DO NOT** create a separate Pusher event for author leaving — the existing `member_removed` event suffices
- **DO NOT** add sound effects or browser notifications — this is toast-only ("Gentle over loud" UX principle)
- **DO NOT** duplicate the `isAuthor` check in the client — rely on the server-side trigger in `joinRoom`
- **DO NOT** show the toast to the author themselves — only other room occupants should see it
- **DO NOT** install `date-fns` — project uses custom `formatTimeAgo` utility in AuthorShimmerBadge

### UX Design References

- Toast type: "Author" with Sparkle icon, Gold accent + shimmer, Top center position [Source: ux-design-specification.md]
- Author presence reveal sequence: Toast slides down (gold border) → Avatar gets shimmer → Panel border animates gold glow [Source: ux-design-specification.md]
- Author toast duration: 6 seconds (longer than standard 4s) [Source: epics.md, AC #1]
- Reduced motion: Static gold border only, no animation [Source: ux-design-specification.md]
- Screen reader: `aria-live="polite"` for dynamic updates [Source: ux-design-specification.md]
- WCAG 2.1 AA compliance: 4.5:1 contrast ratio [Source: ux-design-specification.md]
- Minimum 44px touch targets on interactive elements [Source: ux-design-specification.md]

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.7]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pusher Event Naming, API Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Toast Patterns, Author Presence Reveal, Accessibility]
- [Source: src/hooks/usePresenceChannel.ts — Current hook implementation]
- [Source: src/stores/usePresenceStore.ts — PresenceMember interface]
- [Source: src/components/features/presence/ReadingRoomPanel.tsx — Current panel with author presence]
- [Source: src/components/features/presence/AuthorShimmerBadge.tsx — Shimmer badge component]
- [Source: src/components/providers/NotificationProvider.tsx — Existing Pusher notification patterns]
- [Source: src/app/api/pusher/auth/route.ts — Pusher auth with isAuthor]
- [Source: src/actions/presence/joinRoom.ts — Room join with isAuthor computation]
- [Source: _bmad-output/implementation-artifacts/5-6-author-presence-display.md — Previous story intelligence]
- [Source: _bmad-output/implementation-artifacts/5-5-author-claim-verification.md — Author claim patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

### Completion Notes List

- All 7 tasks and all subtasks completed successfully
- 15 new tests added across 3 test files (5 in usePresenceChannel, 3 in joinRoom, 7 in ReadingRoomPanel)
- Full test suite: 1294 tests pass, 0 regressions (2 pre-existing file-level failures unrelated to this story)
- TypeScript clean for all modified files (1 pre-existing TS error in presence-test page fixed as bonus)
- `usePresenceChannel` extended with `onAuthorJoin` and `onAuthorLeave` callbacks plus `AuthorJoinData` type export
- `joinRoom` server action triggers `room:author-joined` Pusher event using fire-and-forget pattern when verified author joins
- `ReadingRoomPanel` shows golden toast (6s, gold border) via sonner, updates `authorPresence` state, and renders `aria-live="polite"` screen reader announcement
- Polling mode correctly suppresses toast per AC #3 (uses `connectionModeRef` to avoid circular dependency with hook)
- Author leave handled gracefully: no toast, `authorPresence` transitions to "was here" state, UI updates automatically
- Updated existing test assertion to use `expect.objectContaining` for forward compatibility with new callback props

### File List

**Modified:**
- src/hooks/usePresenceChannel.ts
- src/hooks/usePresenceChannel.test.ts
- src/actions/presence/joinRoom.ts
- src/actions/presence/joinRoom.test.ts
- src/components/features/presence/ReadingRoomPanel.tsx
- src/components/features/presence/ReadingRoomPanel.test.tsx
- src/app/(main)/dev/presence-test/page.tsx
