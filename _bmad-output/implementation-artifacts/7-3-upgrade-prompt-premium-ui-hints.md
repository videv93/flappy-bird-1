# Story 7.3: Upgrade Prompt & Premium UI Hints

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a free tier user who has hit the 3-book limit,
I want to see a celebratory upgrade prompt and visual cues about premium,
so that I feel encouraged (not punished) to upgrade.

## Acceptance Criteria

1. **Given** a free tier user attempts to add a 4th book **When** the book limit error is returned **Then** an upgrade prompt dialog is displayed with celebratory tone ("You're a power reader!") **And** the prompt explains premium benefits (unlimited books, $9.99 one-time) **And** the prompt includes a CTA button for upgrade (placeholder link until Epic 8 implements Polar Payment) **And** the prompt includes a dismiss/close option
2. **Given** a free tier user on the Library page **When** the page renders **Then** a book limit indicator shows "X/3 books" for free users (e.g., "2/3 books") **And** premium users see no limit indicator
3. **Given** a free tier user viewing the upgrade prompt **When** they dismiss the prompt **Then** they return to their current view without data loss **And** no navigation or state change occurs

## Tasks / Subtasks

- [x] Task 1: Create `getBookLimitInfo` server action for premium status + book count (AC: 2)
  - [x] 1.1: Create `src/actions/books/getBookLimitInfo.ts` — server action returning `{ isPremium: boolean; currentBookCount: number; maxBooks: number }`
  - [x] 1.2: Action queries `isPremium(userId)` from `@/lib/premium` and `prisma.userBook.count({ where: { userId, deletedAt: null } })`
  - [x] 1.3: Return `ActionResult<BookLimitInfo>` following the standard pattern
  - [x] 1.4: Export from `src/actions/books/index.ts`

- [x] Task 2: Create `UpgradePromptDialog` component (AC: 1, 3)
  - [x] 2.1: Create `src/components/features/books/UpgradePromptDialog.tsx`
  - [x] 2.2: Use existing `AlertDialog` from `@/components/ui/alert-dialog` (already installed)
  - [x] 2.3: Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `currentBookCount: number`, `maxBooks: number`
  - [x] 2.4: Title with celebratory tone: "You're a power reader!" (use Sparkles icon from lucide-react)
  - [x] 2.5: Description: explain premium benefits — unlimited books for $9.99 one-time payment
  - [x] 2.6: Show current count: "{currentBookCount}/{maxBooks} books used"
  - [x] 2.7: Primary CTA button "Upgrade to Premium" — links to `/upgrade` placeholder page (Epic 8 will replace)
  - [x] 2.8: Secondary "Maybe Later" cancel button that closes dialog (returns user to current view, no state change)
  - [x] 2.9: Minimum 44px touch targets on all buttons per UX accessibility requirements
  - [x] 2.10: Use warm amber color palette for celebratory feel (primary button default variant is amber)

- [x] Task 3: Create `/upgrade` placeholder page (AC: 1)
  - [x] 3.1: Create `src/app/(main)/upgrade/page.tsx` — simple page with "Coming Soon" message
  - [x] 3.2: Show message: "Premium upgrades are coming soon! You'll be able to track unlimited books for a one-time payment of $9.99."
  - [x] 3.3: Include a "Back to Library" link using `<Link href="/library">`
  - [x] 3.4: This is temporary — Epic 8 (Polar Payment) will replace with actual checkout flow

- [x] Task 4: Modify `AddToLibraryButton` to show upgrade prompt on book limit error (AC: 1, 3)
  - [x] 4.1: Add state: `const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)` and `const [limitInfo, setLimitInfo] = useState<{ currentBookCount: number; maxBooks: number } | null>(null)`
  - [x] 4.2: In `handleStatusSelect`, detect `BOOK_LIMIT_REACHED` error: check `result.success === false && 'code' in result && result.code === 'BOOK_LIMIT_REACHED'`
  - [x] 4.3: On book limit error: set `limitInfo` from `result.currentBookCount` and `result.maxBooks`, then `setShowUpgradePrompt(true)` — do NOT show toast.error for this case
  - [x] 4.4: For other errors: keep existing `toast.error(result.error)` behavior
  - [x] 4.5: Render `<UpgradePromptDialog>` in component JSX, controlled by `showUpgradePrompt` state
  - [x] 4.6: On dialog dismiss (`onOpenChange(false)`): clear state, no other side effects

- [x] Task 5: Create `BookLimitBadge` component for "X/3 books" display (AC: 2)
  - [x] 5.1: Create `src/components/features/books/BookLimitBadge.tsx`
  - [x] 5.2: Props: `currentBookCount: number`, `maxBooks: number`, `isPremium: boolean`
  - [x] 5.3: If `isPremium` is true: render nothing (`return null`)
  - [x] 5.4: Render a small inline badge/pill: "{currentBookCount}/{maxBooks} books"
  - [x] 5.5: Style with muted foreground text, small font size (text-xs), subtle background
  - [x] 5.6: At limit (count >= maxBooks): change to warning color (amber/orange) to signal limit reached
  - [x] 5.7: Add `data-testid="book-limit-badge"` for testing

- [x] Task 6: Integrate `BookLimitBadge` into `LibraryView` (AC: 2)
  - [x] 6.1: In `LibraryView`, call `getBookLimitInfo()` alongside existing `getUserLibrary()` fetch
  - [x] 6.2: Store result in component state
  - [x] 6.3: Render `BookLimitBadge` in the header area (next to the Refresh button, in the `flex justify-end` container)
  - [x] 6.4: Only render badge after data loads (not during loading/error states)

- [x] Task 7: Write tests for UpgradePromptDialog (AC: 1, 3)
  - [x] 7.1: Create `src/components/features/books/UpgradePromptDialog.test.tsx`
  - [x] 7.2: Test renders celebratory title "You're a power reader!" when open
  - [x] 7.3: Test displays book count "X/3 books used"
  - [x] 7.4: Test renders "Upgrade to Premium" CTA button with link to `/upgrade`
  - [x] 7.5: Test "Maybe Later" button closes dialog (calls onOpenChange(false))
  - [x] 7.6: Test does not render when open=false
  - [x] 7.7: Test premium benefits text is present

- [x] Task 8: Write tests for AddToLibraryButton book limit handling (AC: 1, 3)
  - [x] 8.1: In existing `AddToLibraryButton.test.tsx`, add test: shows upgrade dialog when BOOK_LIMIT_REACHED error returned
  - [x] 8.2: Test that toast.error is NOT called for book limit error (dialog shown instead)
  - [x] 8.3: Test dismissing dialog returns to normal state (button still functional)
  - [x] 8.4: Test that generic errors still show toast.error (regression)

- [x] Task 9: Write tests for BookLimitBadge (AC: 2)
  - [x] 9.1: Create `src/components/features/books/BookLimitBadge.test.tsx`
  - [x] 9.2: Test renders "2/3 books" for free user with 2 books
  - [x] 9.3: Test renders with warning style when at limit (3/3)
  - [x] 9.4: Test renders nothing for premium user (isPremium=true)
  - [x] 9.5: Test renders nothing when isPremium is true regardless of book count

- [x] Task 10: Write tests for getBookLimitInfo server action (AC: 2)
  - [x] 10.1: Create `src/actions/books/getBookLimitInfo.test.ts`
  - [x] 10.2: Test returns correct count and isPremium=false for free user
  - [x] 10.3: Test returns isPremium=true for premium user
  - [x] 10.4: Test returns unauthorized error when no session

## Dev Notes

### Architecture Requirements

- **Server Action Pattern:** All new server actions MUST use `ActionResult<T>` discriminated union return type. The `getBookLimitInfo` action follows the same pattern as `getUserLibrary` — authenticate via `auth.api.getSession()`, then query DB.
- **Component Architecture:** The `UpgradePromptDialog` is a domain component in `features/books/`. It wraps the shadcn/ui `AlertDialog` primitive. Per architecture doc: feature components handle their own states; base components come from `ui/`.
- **Import Convention:** ALWAYS use `@/` alias for cross-boundary imports. Relative imports OK within same feature folder (e.g., `./UpgradePromptDialog` from `AddToLibraryButton`).
- **Error Discrimination:** The `BookLimitError` type from Story 7.2 includes `code: 'BOOK_LIMIT_REACHED'` specifically for this story. Use TypeScript type narrowing: `'code' in result && result.code === 'BOOK_LIMIT_REACHED'` to discriminate from generic `{ success: false; error: string }`.
- **No Prisma Schema Changes:** All schema work was done in Story 7.1 (PremiumStatus enum, premiumStatus field on User). This story is purely UI + one new server action.
- **Placeholder CTA:** The upgrade button links to `/upgrade` (a placeholder page). Epic 8 stories (8-1, 8-2, 8-3) will implement actual Polar checkout. Do NOT install `@polar-sh/sdk` or create billing logic in this story.

### Technical Specifications

- **AlertDialog Component:** Already installed at `src/components/ui/alert-dialog.tsx`. Exports: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogMedia`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`.
- **BookLimitError Type:** Defined in `src/actions/books/types.ts`:
  ```typescript
  type BookLimitError = {
    success: false;
    error: string;
    code: 'BOOK_LIMIT_REACHED';
    premiumStatus: string;
    currentBookCount: number;
    maxBooks: number;
  };
  ```
- **FREE_TIER_BOOK_LIMIT:** Constant defined in `src/lib/config/constants.ts` (value: 3). Import from `@/lib/config/constants` for server action; the dialog receives the value via props from the error response.
- **isPremium Utility:** `src/lib/premium.ts` — `isPremium(userId): Promise<boolean>`. Returns false for non-existent users or DB errors.
- **Testing Framework:** Vitest + React Testing Library. Mock `@/lib/prisma`, `@/lib/premium`, `next/headers` for server action tests. Mock `@/actions/books` for component tests.
- **Toast Library:** `sonner` — use `toast.error()` for generic errors, but NOT for book limit errors (dialog shown instead).

### Critical Implementation Details

1. **Error detection in AddToLibraryButton:** The `addToLibrary` return type is `AddToLibraryResult` which is a union of three branches. To detect the book limit case:
   ```typescript
   if (!result.success) {
     if ('code' in result && result.code === 'BOOK_LIMIT_REACHED') {
       // Show upgrade dialog with result.currentBookCount, result.maxBooks
     } else {
       toast.error(result.error);
     }
   }
   ```
   This preserves backward compatibility — existing error handling for generic failures unchanged.

2. **Dialog controlled state pattern:** The `UpgradePromptDialog` MUST be a controlled component (open/onOpenChange props). It is rendered inside `AddToLibraryButton` and controlled by local state. When the user dismisses via "Maybe Later" or clicks outside, `onOpenChange(false)` fires, resetting state — no navigation or data loss occurs.

3. **BookLimitBadge data source:** The `LibraryView` component already fetches `getUserLibrary()` which returns `books` array. The `books.length` gives current active book count. However, we also need `isPremium` status. Two approaches:
   - **Recommended:** Create `getBookLimitInfo()` server action that returns `{ isPremium, currentBookCount, maxBooks }`. Call in parallel with `getUserLibrary()` in `LibraryView`.
   - **Alternative:** Derive count from `books.length` (already available) and add a separate `isPremium` check. But this creates coupling.

4. **Placeholder upgrade page:** Create a minimal page at `src/app/(main)/upgrade/page.tsx`. This page is inside the `(main)` route group so it gets the AppShell layout with bottom navigation. It's protected by middleware (authenticated users only). Epic 8 will replace this with the actual Polar checkout flow.

5. **UX Design Compliance:**
   - Celebratory/positive tone — "You're a power reader!" not "You've hit your limit"
   - Warm amber color palette (the default shadcn primary button already uses this via CSS variables configured in the project)
   - 44px minimum touch targets on all interactive elements
   - Modal follows UX spec: centered, max-width 400px, dark overlay, focus trap, Escape to close
   - `AlertDialog` from shadcn/ui provides focus trap and Escape handling automatically

6. **Accessibility:**
   - AlertDialog handles focus management (traps focus inside, returns focus on close)
   - CTA button uses semantic `<a>` via `asChild` + `<Link>`
   - Badge uses `aria-label` to describe the limit context
   - All interactive elements have minimum 44px touch targets

### Existing Code to NOT Modify

- `prisma/schema.prisma` — No schema changes needed
- `src/lib/premium.ts` — Already complete from Story 7.1
- `src/actions/books/addToLibrary.ts` — No changes to server action (error response already correct from Story 7.2)
- `src/actions/books/types.ts` — BookLimitError already defined in Story 7.2
- `src/lib/config/constants.ts` — FREE_TIER_BOOK_LIMIT already defined in Story 7.2
- `src/components/ui/alert-dialog.tsx` — Use as-is, do not modify the base component

### Testing Strategy

- **UpgradePromptDialog unit tests:** Test rendering, content, button behavior, dismissal. Pure component test — no mocks needed except for `next/link`.
- **AddToLibraryButton integration:** Extend existing test file with book-limit-specific scenarios. Mock `addToLibrary` to return `BookLimitError` response. Verify dialog appears instead of toast.
- **BookLimitBadge unit tests:** Test conditional rendering based on `isPremium` prop. Test count display formatting. Test warning style at limit.
- **getBookLimitInfo server action tests:** Mock `@/lib/prisma`, `@/lib/premium`, `next/headers`. Test authenticated/unauthenticated, free/premium user scenarios.
- **No E2E tests needed:** This is client-side UI with mocked server actions.
- **Test file locations:** Co-located with source files per architecture document.

### File Structure Plan

```
src/
├── app/
│   └── (main)/
│       └── upgrade/
│           └── page.tsx                    # NEW: Placeholder upgrade page
├── components/
│   └── features/
│       └── books/
│           ├── UpgradePromptDialog.tsx     # NEW: Celebratory upgrade prompt
│           ├── UpgradePromptDialog.test.tsx # NEW: Dialog tests
│           ├── BookLimitBadge.tsx          # NEW: "X/3 books" badge
│           ├── BookLimitBadge.test.tsx     # NEW: Badge tests
│           ├── AddToLibraryButton.tsx      # MODIFIED: Add upgrade prompt on limit error
│           ├── AddToLibraryButton.test.tsx # MODIFIED: Add book limit test cases
│           └── LibraryView.tsx            # MODIFIED: Integrate BookLimitBadge
├── actions/
│   └── books/
│       ├── getBookLimitInfo.ts            # NEW: Server action for premium status + count
│       ├── getBookLimitInfo.test.ts       # NEW: Server action tests
│       └── index.ts                       # MODIFIED: Export getBookLimitInfo
```

### Previous Story Intelligence (Story 7.2)

- **BookLimitError response structure:** The error includes `code`, `premiumStatus`, `currentBookCount`, and `maxBooks` — all designed for this story's UI consumption. Story 7.2's dev notes explicitly state: "This allows Story 7.3 (Upgrade Prompt UI) to display 'X/3 books' and trigger the upgrade prompt based on the error code."
- **Prisma mock pattern:** `vi.mock('@/lib/prisma', () => ({ prisma: { userBook: { count: vi.fn() }, user: { findUnique: vi.fn() } } }))` — extend for `getBookLimitInfo` tests.
- **isPremium mock:** `vi.fn().mockResolvedValue(true/false)` — simple boolean mock.
- **No Prisma schema changes since Story 7.1:** All models in place.
- **Test count baseline:** 1702 tests passing across 181 test files. New tests should not break existing ones.
- **Pre-existing lint/typecheck issues:** 66 ESLint errors, 50 warnings, 3 TypeScript errors — all pre-existing and not in files we'll modify.

### Git Intelligence

Recent commits show:
- `2242479`: Story 7.2 — book limit enforcement (server action), our direct foundation
- `4e57cfd`: Build fix
- `bcb6090`: Story 7.1 — premium data model, isPremium utility
- Pattern: Feature commits use `feat:` prefix with story reference
- Files modified in 7.2: `addToLibrary.ts`, `types.ts`, `constants.ts`, `addToLibrary.test.ts`

### Project Structure Notes

- Alignment with unified project structure: all new files follow the established `src/components/features/books/` and `src/actions/books/` patterns
- The `/upgrade` placeholder page goes in `src/app/(main)/upgrade/` which is inside the authenticated route group with AppShell layout
- No conflicts detected with existing code patterns
- Re-export new components from `src/components/features/books/index.ts` if it exists; otherwise import directly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Acceptance criteria for upgrade prompt & UI hints
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1] — Premium Schema & Book Limit Enforcement overview, FR9 (upgrade prompt), FR11 (UI hints)
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Server action return pattern (ActionResult<T>), component structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — @/ import alias, PascalCase components, co-located tests
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — Feature folder organization, file splitting rules
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Modal & Overlay Patterns] — Centered modal, max-width 400px, focus trap, Escape closes
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy] — Primary (amber fill), Secondary (amber outline), 44px min touch
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Book added: card slides in + toast (3 sec), error: toast with retry
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Warm Amber #d97706, Warning Burnt Orange #ea580c, Streak Success #16a34a
- [Source: src/components/features/books/AddToLibraryButton.tsx] — Current add-to-library UI to modify
- [Source: src/components/features/books/LibraryView.tsx] — Library view to integrate BookLimitBadge
- [Source: src/actions/books/types.ts] — BookLimitError and AddToLibraryResult types from Story 7.2
- [Source: src/actions/books/addToLibrary.ts] — Server action with book limit error response
- [Source: src/lib/premium.ts] — isPremium utility from Story 7.1
- [Source: src/lib/config/constants.ts] — FREE_TIER_BOOK_LIMIT constant from Story 7.2
- [Source: src/components/ui/alert-dialog.tsx] — AlertDialog UI primitive to use for upgrade prompt
- [Source: _bmad-output/implementation-artifacts/7-2-book-limit-enforcement-free-users.md] — Previous story learnings, patterns, and design intent for this story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- All 1717 tests pass (184 test files), including 34 new/updated tests for Story 7.3
- 7 pre-existing failures in `src/actions/admin/getSessionHistory.test.ts` (unrelated admin parseUserAgent tests)
- TypeScript: 3 pre-existing errors only (Capacitor, Vercel Analytics/Speed Insights module declarations)
- No new lint, type, or test regressions introduced

### Completion Notes List

- Task 1: Created `getBookLimitInfo` server action at `src/actions/books/getBookLimitInfo.ts`. Returns `{ isPremium, currentBookCount, maxBooks }` using `isPremium()` and `prisma.userBook.count()` in parallel via `Promise.all`. Follows `ActionResult<BookLimitInfo>` pattern. Exported from `src/actions/books/index.ts`.
- Task 2: Created `UpgradePromptDialog` component at `src/components/features/books/UpgradePromptDialog.tsx`. Uses AlertDialog from shadcn/ui. Celebratory "You're a power reader!" title with Sparkles icon. Shows book count, premium benefits ($9.99 unlimited), and CTA linking to `/upgrade`. 44px min touch targets on buttons. AlertDialogMedia with amber-100 background for celebratory feel.
- Task 3: Created placeholder upgrade page at `src/app/(main)/upgrade/page.tsx`. Shows "Premium Coming Soon" with Sparkles icon and "Back to Library" link. Inside (main) route group for AppShell layout and auth middleware.
- Task 4: Modified `AddToLibraryButton` to detect `BOOK_LIMIT_REACHED` error code using `'code' in result` type narrowing. Shows UpgradePromptDialog instead of toast.error for book limit errors. Generic errors still show toast. Dialog is controlled via `showUpgradePrompt` state; dismissing resets state with no side effects. Wrapped return in Fragment to render dialog alongside Popover.
- Task 5: Created `BookLimitBadge` component at `src/components/features/books/BookLimitBadge.tsx`. Renders "X/3 books" pill badge for free users, nothing for premium. Warning amber style at limit, muted style under limit. Includes `data-testid` and `aria-label`.
- Task 6: Integrated `BookLimitBadge` into `LibraryView`. Calls `getBookLimitInfo()` in parallel with `getUserLibrary()` via `Promise.all`. Badge renders in header area next to Refresh button. Only shows after data loads. Updated existing `LibraryView.test.tsx` mock to include `getBookLimitInfo`.
- Task 7: Created 8 tests for UpgradePromptDialog covering: title render, book count display, CTA link, cancel button, dismiss behavior, closed state, benefits text.
- Task 8: Added 4 tests to `AddToLibraryButton.test.tsx` for book limit handling: dialog on BOOK_LIMIT_REACHED, no toast.error for limit error, dismiss returns to normal, generic errors still show toast.
- Task 9: Created 6 tests for BookLimitBadge covering: count display, warning style at limit, muted style under limit, null render for premium, aria-label.
- Task 10: Created 4 tests for `getBookLimitInfo` server action covering: free user data, premium user data, unauthorized (no session), unauthorized (null user).

### Change Log

- 2026-02-10: Implementation complete — All 10 tasks implemented. Upgrade prompt dialog, book limit badge, and placeholder upgrade page active.
- 2026-02-10: Code review complete — 7 issues found (0 HIGH, 3 MEDIUM, 4 LOW), all fixed. Fixes: Promise.allSettled for fault-tolerant fetching in LibraryView, 4 new integration/error-path tests, barrel exports for new components, aria-hidden on decorative icon, limitInfo state cleanup on dialog dismiss, removed unnecessary 'use client' from BookLimitBadge.

### File List

- `src/actions/books/getBookLimitInfo.ts` — NEW: Server action returning premium status + book count
- `src/actions/books/getBookLimitInfo.test.ts` — NEW: 5 server action tests (review: +1 error path test)
- `src/actions/books/index.ts` — MODIFIED: Added getBookLimitInfo and BookLimitInfo exports
- `src/components/features/books/UpgradePromptDialog.tsx` — NEW: Celebratory upgrade prompt dialog
- `src/components/features/books/UpgradePromptDialog.test.tsx` — NEW: 8 dialog tests
- `src/components/features/books/BookLimitBadge.tsx` — NEW: "X/3 books" badge component (review: removed unnecessary 'use client')
- `src/components/features/books/BookLimitBadge.test.tsx` — NEW: 6 badge tests
- `src/components/features/books/AddToLibraryButton.tsx` — MODIFIED: Added upgrade prompt on BOOK_LIMIT_REACHED error (review: clear limitInfo on dismiss)
- `src/components/features/books/AddToLibraryButton.test.tsx` — MODIFIED: Added 4 book limit test cases + next/link mock
- `src/components/features/books/LibraryView.tsx` — MODIFIED: Integrated BookLimitBadge with getBookLimitInfo (review: Promise.allSettled for fault tolerance)
- `src/components/features/books/LibraryView.test.tsx` — MODIFIED: Added getBookLimitInfo to mock (review: +3 badge integration tests)
- `src/components/features/books/index.ts` — MODIFIED: (review: added BookLimitBadge and UpgradePromptDialog barrel exports)
- `src/app/(main)/upgrade/page.tsx` — NEW: Placeholder upgrade page (review: added aria-hidden on decorative icon)
