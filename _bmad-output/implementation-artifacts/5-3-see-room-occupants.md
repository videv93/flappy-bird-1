# Story 5.3: See Room Occupants

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see who else is in the reading room**,
so that **I feel connected to other readers**.

## Acceptance Criteria

1. **Avatar Stack Display:** When viewing the ReadingRoomPanel while joined, I see a `PresenceAvatarStack` showing current readers as overlapping avatar circles (max 5 visible), with a "+N more" indicator if more than 5 readers are present.

2. **Presence Pulse Animation:** Each avatar in the stack has a gentle pulse animation (presence indicator) using Framer Motion. Animations MUST respect `prefers-reduced-motion` — when reduced motion is preferred, the pulse is disabled entirely (no animation fallback).

3. **Real-time Join Animation:** When a new reader joins the room, their avatar slides into the stack smoothly using Framer Motion `AnimatePresence` + `layoutId`. A subtle indication of the new arrival is shown (brief scale-up or glow). The reader count updates in real-time.

4. **Real-time Leave Animation:** When a reader leaves the room, their avatar fades out smoothly using Framer Motion exit animation. The stack reorders without jarring jumps (layout animation).

5. **Occupant Detail View:** When I tap on the avatar stack, a detail view opens (Sheet/drawer from bottom on mobile) showing a list of all current readers with names and avatars. I can tap a reader to navigate to their profile (`/profile/{userId}`).

6. **Polling Fallback:** When Pusher is unavailable (polling mode), the avatar stack still updates every 30 seconds via the existing `getRoomMembers` REST fallback. The experience is slightly delayed but fully functional — same avatar stack, same detail view.

## Tasks / Subtasks

- [x] Task 1: Enhance `PresenceAvatarStack` with Framer Motion animations (AC: #2, #3, #4)
  - [x] 1.1 Add Framer Motion `AnimatePresence` wrapper around avatar list for enter/exit animations
  - [x] 1.2 Add `motion.div` to each avatar with `initial`, `animate`, `exit` variants (fade+scale for enter, fade for exit)
  - [x] 1.3 Add `layout` prop for smooth reordering when members change
  - [x] 1.4 Add gentle pulse animation to avatars using `motion.div` with `animate` keyframes (scale 1→1.05→1, opacity 0.8→1→0.8) on a 3s loop
  - [x] 1.5 Detect `prefers-reduced-motion` via `useReducedMotion()` from Framer Motion (or `window.matchMedia`) and disable ALL animations when true
  - [x] 1.6 Make avatar stack clickable (add `onClick` prop, `cursor-pointer`, `role="button"`, `aria-expanded`)
  - [x] 1.7 Update `PresenceAvatarStack.test.tsx` for new animation and click behavior

- [x] Task 2: Create `OccupantDetailSheet` component (AC: #5)
  - [x] 2.1 Create `src/components/features/presence/OccupantDetailSheet.tsx` using shadcn/ui `Sheet` (side="bottom")
  - [x] 2.2 Accept props: `{ open: boolean; onOpenChange: (open: boolean) => void; members: Map<string, PresenceMember> }`
  - [x] 2.3 Render scrollable list of all members with avatar (40px), display name, and chevron-right icon
  - [x] 2.4 Each member row is a link/button navigating to `/profile/${member.id}` (use Next.js `Link`)
  - [x] 2.5 Show total reader count in sheet header: "N readers in this room"
  - [x] 2.6 Add `aria-label` on each row: "{name}'s profile"
  - [x] 2.7 44px minimum touch target for each member row
  - [x] 2.8 Create `OccupantDetailSheet.test.tsx` co-located tests

- [x] Task 3: Integrate `OccupantDetailSheet` into `ReadingRoomPanel` (AC: #1, #5)
  - [x] 3.1 Add `useState` for sheet open/close in `ReadingRoomPanel`
  - [x] 3.2 Pass `onClick` handler from `ReadingRoomPanel` to `PresenceAvatarStack` to open the sheet
  - [x] 3.3 Render `OccupantDetailSheet` within `ReadingRoomPanel` (only when joined and members > 0)
  - [x] 3.4 Update `ReadingRoomPanel.test.tsx` for sheet open/close integration

- [x] Task 4: Verify polling fallback works with animations (AC: #6)
  - [x] 4.1 Ensure that when `usePresenceChannel` is in polling mode, member changes from polling still trigger Framer Motion animations (members Map updates → AnimatePresence re-renders)
  - [x] 4.2 Test that `PresenceAvatarStack` animates correctly regardless of whether updates come from Pusher events or polling
  - [x] 4.3 No additional code needed if AnimatePresence keys on member IDs (which it should)

- [x] Task 5: Update barrel exports and run full test suite (AC: all)
  - [x] 5.1 Add `OccupantDetailSheet` export to `src/components/features/presence/index.ts`
  - [x] 5.2 Run `npm run test:run` to verify zero regressions
  - [x] 5.3 Run `npm run typecheck` to verify no TypeScript errors (pre-existing errors only, none in modified files)
  - [x] 5.4 Run `npm run lint` to verify no ESLint errors (0 errors, warnings only)

## Dev Notes

### Architecture Constraints

- **Hybrid presence model**: Database (PostgreSQL) is source of truth. Pusher provides real-time overlay. Polling (30s) is fallback. Both paths update the same `usePresenceStore` members Map, so animations work identically regardless of data source.
- **Pusher presence channel limit**: Hard 100 members per channel. The "+N more" overflow indicator on `PresenceAvatarStack` already handles this gracefully.
- **usePresenceStore is memory-only** (volatile, NOT persisted to IndexedDB). Resets on page refresh. This is by design.
- **Channel naming**: `presence-room-{bookId}` (standardized in Story 5.1).
- **Framer Motion v12.31.0** is installed. Use `AnimatePresence`, `motion.div`, `useReducedMotion()`. Do NOT install any additional animation packages.

### Existing Code to REUSE (Do NOT Recreate)

| What | Path | Notes |
|------|------|-------|
| `PresenceAvatarStack` | `src/components/features/presence/PresenceAvatarStack.tsx` | **MODIFY IN PLACE** - add Framer Motion, click handler, pulse |
| `ReadingRoomPanel` | `src/components/features/presence/ReadingRoomPanel.tsx` | **MODIFY IN PLACE** - add sheet state and integration |
| `usePresenceChannel` hook | `src/hooks/usePresenceChannel.ts` | Already handles Pusher subscription + polling fallback. Do NOT modify. |
| `usePresenceStore` (Zustand) | `src/stores/usePresenceStore.ts` | Members map, connectionMode. Do NOT modify. |
| `PresenceMember` type | `src/stores/usePresenceStore.ts` | `{ id: string; name: string; avatarUrl: string \| null }` - use as-is |
| `joinRoom` / `leaveRoom` actions | `src/actions/presence/` | Already complete from Story 5.1/5.2. Do NOT modify. |
| `getRoomMembers` action | `src/actions/presence/getRoomMembers.ts` | Returns `RoomMember[]` with user data. Used by polling fallback. |
| Barrel export | `src/components/features/presence/index.ts` | Update to add `OccupantDetailSheet` |

### Key Integration Points

- **PresenceAvatarStack** (`src/components/features/presence/PresenceAvatarStack.tsx`): This is the primary file to enhance. Currently renders static overlapping circles. Needs Framer Motion wrapping for enter/exit/layout animations and pulse. Add `onClick` prop for opening detail sheet.
- **ReadingRoomPanel** (`src/components/features/presence/ReadingRoomPanel.tsx`): Already renders `PresenceAvatarStack` when joined with multiple members. Add state for `OccupantDetailSheet` open/close and wire `onClick` from avatar stack to sheet open.
- **Profile navigation**: The occupant detail sheet links to `/profile/{userId}`. This route already exists (Epic 4, Story 4.2 - View Other User Profiles). Use Next.js `Link` component.

### Component Specifications

**Enhanced PresenceAvatarStack (modifications to existing):**
- Add `onClick?: () => void` prop
- Wrap avatar list in `<AnimatePresence mode="popLayout">`
- Each avatar becomes `<motion.div>` with:
  - `key={member.id}` (critical for AnimatePresence)
  - `layout` prop for smooth reordering
  - `initial={{ opacity: 0, scale: 0.8 }}`
  - `animate={{ opacity: 1, scale: 1 }}`
  - `exit={{ opacity: 0, scale: 0.8 }}`
  - `transition={{ duration: 0.3, ease: "easeOut" }}`
- Pulse animation on each avatar (when not `prefers-reduced-motion`):
  - Use `motion.div` wrapper with `animate={{ scale: [1, 1.05, 1] }}` on `transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}`
  - Stagger: each avatar offset by 0.5s to avoid synchronized pulsing
- When `onClick` is provided: add `role="button"`, `tabIndex={0}`, `cursor-pointer`, `aria-expanded` (tied to sheet state), keyboard handler for Enter/Space
- `aria-label` unchanged: "N readers in room"

**OccupantDetailSheet (new component):**
- Uses shadcn/ui `Sheet` component (bottom drawer)
- Props: `{ open: boolean; onOpenChange: (open: boolean) => void; members: Map<string, PresenceMember> }`
- Header: "N readers in this room" with close button
- Body: Scrollable list of members, each row contains:
  - Avatar (40px circle, with initials fallback matching `PresenceAvatarStack` pattern)
  - Display name (text-sm, font-medium)
  - Chevron-right icon (lucide-react `ChevronRight`)
- Each row wrapped in `<Link href={/profile/${member.id}}>`
- 44px min-height per row for touch targets
- Empty state: should never happen (sheet only opens when members > 0)

### Animation Guidelines (CRITICAL)

**Framer Motion v12 API:**
```typescript
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Reduced motion check - MUST use this
const shouldReduceMotion = useReducedMotion();

// AnimatePresence for enter/exit
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    />
  ))}
</AnimatePresence>
```

**Pulse animation:**
```typescript
// Only when shouldReduceMotion is false
<motion.div
  animate={shouldReduceMotion ? {} : {
    scale: [1, 1.05, 1]
  }}
  transition={{
    repeat: Infinity,
    duration: 3,
    ease: "easeInOut",
    delay: index * 0.5 // Stagger per avatar
  }}
>
```

**UX principles for animations:**
- **Ambient, not active**: Pulse should be subtle (1→1.05 scale, not 1→1.2)
- **No jarring movements**: Use `layout` prop for smooth reordering
- **Entry is welcoming**: New avatars scale up gently
- **Exit is quiet**: Leaving avatars fade out, don't bounce
- **Staggered pulse**: Avatars pulse at different times for organic feel

### Previous Story Learnings (from 5.1 and 5.2)

1. **PostgreSQL NULL uniqueness gotcha**: `@@unique([userId, bookId, leftAt])` doesn't prevent duplicate active presences. The `joinRoom` action handles this with `$transaction`. Do NOT bypass or create alternative join logic.
2. **Multi-tab Pusher behavior**: `member_added` only fires on FIRST connection, `member_removed` only on LAST disconnection for same `user_id`. This means the avatar stack correctly shows a user once even with multiple tabs.
3. **Presence store is volatile**: Do NOT persist to IndexedDB. On page refresh, the hook re-subscribes and repopulates members.
4. **usePresenceChannel cleanup**: The hook handles unsubscribe on unmount. Do NOT manually unsubscribe — let the hook handle lifecycle.
5. **Connection mode timing**: Only set to `'realtime'` after `pusher:subscription_succeeded` fires, NOT on initial subscribe attempt.
6. **Mock patterns established**: `PresenceAvatarStack` tests mock `usePresenceStore`. `ReadingRoomPanel` tests mock `usePresenceChannel`. Follow the same pattern.
7. **Presence mocks in BookDetailActions.test.tsx**: Already includes mocks for presence server actions and components to prevent import chain issues (ReadingRoomPanel → server actions → prisma → DATABASE_URL).

### Git Intelligence (Recent Commits)

Last relevant commit: `6b74f6c feat: implement Pusher presence channel spike with code review fixes (Story 5.1)`

Story 5.2 work is in the working tree (not yet committed) — all files from Story 5.2 are already present:
- `src/components/features/presence/ReadingRoomPanel.tsx` (exists, modify)
- `src/components/features/presence/PresenceAvatarStack.tsx` (exists, modify)
- `src/components/features/presence/PresenceAvatarStack.test.tsx` (exists, update)
- `src/components/features/presence/ReadingRoomPanel.test.tsx` (exists, update)
- `src/components/features/presence/index.ts` (exists, update)

**The dev MUST build on top of the Story 5.2 working tree state, not the committed state.**

### Testing Standards

- Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Mock `framer-motion` partially: `AnimatePresence` and `motion.div` should render children; test that correct props/keys are passed
- Mock `useReducedMotion`: Test both `true` and `false` return values
- Use `@testing-library/react` with `userEvent` for click interactions
- Test `OccupantDetailSheet`: verify member list renders, links navigate correctly, accessibility labels present
- Test `PresenceAvatarStack`: verify `onClick` fires, `role="button"` present, keyboard handler (Enter/Space), animation props applied
- Test polling mode: verify avatar stack updates when members Map changes (regardless of source)
- Run full suite with `npm run test:run` after implementation to verify zero regressions

### shadcn/ui Sheet Component

Check if `Sheet` is already installed:
```bash
ls src/components/ui/sheet.tsx
```
If not present, install with:
```bash
npx shadcn@latest add sheet
```

The Sheet component provides `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetClose`. Use `side="bottom"` for mobile-friendly bottom drawer.

### UX Guidelines

- **Emotional goal**: Belonging ("I'm not reading alone") — the avatar stack is the visual proof of connection
- **Warm Hearth palette**: Amber `#d97706`, Soft Amber `#fbbf24` for presence pulse
- **Pulse animation**: Gentle, organic, not synchronized — use staggered delays
- **Avatar entry**: Welcoming slide-in (scale from 0.8 → 1.0)
- **Avatar exit**: Quiet fade-out (scale from 1.0 → 0.8, opacity → 0)
- **Detail sheet**: Clean, simple list — not overwhelming. Focus on names and faces.
- **44px minimum touch targets** for detail sheet member rows and avatar stack click area
- **Respect `prefers-reduced-motion`** — disable ALL motion when set (pulse, enter/exit, layout)
- **WCAG 2.1 AA**: 4.5:1 contrast for text, 3:1 for UI elements

### Project Structure Notes

Files to modify:
```
src/components/features/presence/PresenceAvatarStack.tsx      (add Framer Motion + click)
src/components/features/presence/PresenceAvatarStack.test.tsx  (update tests)
src/components/features/presence/ReadingRoomPanel.tsx           (add sheet integration)
src/components/features/presence/ReadingRoomPanel.test.tsx      (update tests)
src/components/features/presence/index.ts                       (add OccupantDetailSheet export)
```

New files to create:
```
src/components/features/presence/OccupantDetailSheet.tsx
src/components/features/presence/OccupantDetailSheet.test.tsx
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-reading-rooms-author-presence.md#Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] - Pusher event naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] - usePresenceStore specification (memory-only)
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] - Component file structure, naming
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Presence Indicators] - Mini avatars (not dots), gentle pulse
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Reading Room Flow] - Step 2: "4 readers here" with mini avatars pulse gently
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components Strategy] - Framer Motion for presence animations
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Design] - Ambient over active, presence should comfort not demand
- [Source: _bmad-output/planning-artifacts/prd.md#FR29] - Users can see who else is currently in a reading room
- [Source: _bmad-output/implementation-artifacts/5-1-pusher-presence-channel-spike.md] - Foundation code, gotchas, architecture decisions
- [Source: _bmad-output/implementation-artifacts/5-2-join-reading-room.md] - ReadingRoomPanel, PresenceAvatarStack existing code, integration points

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Tests: 112/113 suites passed (1 pre-existing AppShell failure due to missing DATABASE_URL in test env)
- 1164/1164 individual tests passed
- TypeScript: pre-existing errors in streaks/social test files only, none in modified files
- ESLint: 0 errors, 46 warnings (all pre-existing patterns: no-img-element, no-unused-vars in mocks)

### Completion Notes List

- Installed shadcn/ui Sheet component (`npx shadcn@latest add sheet`)
- Enhanced PresenceAvatarStack with Framer Motion AnimatePresence, motion.div, layout animations, pulse with staggered delays, useReducedMotion
- Created OccupantDetailSheet bottom drawer with member list, profile links, 44px touch targets, accessibility labels
- Integrated OccupantDetailSheet into ReadingRoomPanel with state management and click handler
- Updated framer-motion mocks across 7 test files to use function-based pattern (prevents DOM prop warnings from framer-motion-specific props)
- Polling fallback verified: AnimatePresence keys on member.id, so member Map changes from any source (Pusher or polling) trigger animations identically

### File List

Modified:
- `src/components/features/presence/PresenceAvatarStack.tsx` - Added Framer Motion animations, click handler, pulse, useReducedMotion
- `src/components/features/presence/PresenceAvatarStack.test.tsx` - Rewritten with animation, click, keyboard, reduced motion tests
- `src/components/features/presence/ReadingRoomPanel.tsx` - Added sheet state, OccupantDetailSheet integration
- `src/components/features/presence/ReadingRoomPanel.test.tsx` - Rewritten with sheet integration tests, updated mocks
- `src/components/features/presence/index.ts` - Added OccupantDetailSheet export
- `src/components/features/books/BookDetailActions.test.tsx` - Updated framer-motion mock to function-based pattern
- `src/components/features/sessions/SessionTimer.test.tsx` - Updated framer-motion mock
- `src/components/features/sessions/integration.test.tsx` - Updated framer-motion mock
- `src/components/features/sessions/SessionSummary.test.tsx` - Updated framer-motion mock
- `src/components/features/sessions/ActiveSessionIndicator.test.tsx` - Updated framer-motion mock

New:
- `src/components/features/presence/OccupantDetailSheet.tsx` - Bottom drawer component for viewing room occupants
- `src/components/features/presence/OccupantDetailSheet.test.tsx` - Tests for OccupantDetailSheet
- `src/components/ui/sheet.tsx` - shadcn/ui Sheet component (installed via CLI)
