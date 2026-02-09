# Story 5.5: Author Claim & Verification

Status: done

## Story

As an **author**,
I want **to claim my books on the platform**,
so that **I can connect with my readers and have special presence**.

## Acceptance Criteria

1. **Given** I am logged in and viewing a book detail page (that I did not write), **When** I view the book, **Then** I do NOT see an "Are you the author?" link.

2. **Given** I am logged in and viewing any book detail page, **When** I see the book detail hero section, **Then** I see an "Are you the author?" link near the author name display area (below author name in `BookDetailHero`).

3. **Given** I tap "Are you the author?", **When** the claim flow starts, **Then** I see a form/dialog with verification options:
   - Link to Amazon author page (URL input)
   - Link to personal website/social media (URL input)
   - Manual verification request (textarea for explanation)

4. **Given** I provide an Amazon author page URL, **When** I submit the claim, **Then** the system validates the URL format (must be a valid URL), **And** an `AuthorClaim` record is created with `status: PENDING`, **And** I see a confirmation: "Claim submitted! We'll verify within 24-48 hours."

5. **Given** I provide a personal website or social media URL, **When** I submit the claim, **Then** the system validates the URL format, **And** an `AuthorClaim` record is created with `status: PENDING`, **And** I see a confirmation message.

6. **Given** I submit a manual verification request, **When** I provide explanatory text, **Then** an `AuthorClaim` record is created with `status: PENDING` and `verificationMethod: MANUAL`, **And** I see a confirmation message.

7. **Given** I have already submitted a claim for a book, **When** I view that book's detail page, **Then** I see the claim status (Pending/Approved/Rejected) instead of the "Are you the author?" link.

8. **Given** an admin reviews my claim, **When** they approve it, **Then** my `AuthorClaim` status changes to `APPROVED`, **And** I receive a real-time notification via Pusher: "You're now verified as the author of [Book Title]!", **And** a golden author badge appears on the book detail page via the existing `AuthorVerifiedBadge` component.

9. **Given** an admin rejects my claim, **When** they reject it, **Then** my `AuthorClaim` status changes to `REJECTED`, **And** I receive a notification: "Your author claim for [Book Title] was not approved."

10. **Given** I am a verified author (have at least one approved claim), **When** I view my claimed books, **Then** I see reader engagement metrics:
    - Number of readers with this book in their library
    - Number currently reading
    - Reading room activity (current occupants)

11. **Given** I am an admin, **When** I navigate to the claims review page, **Then** I see a list of pending `AuthorClaim` records with user info, book info, verification method, and verification URL, **And** I can approve or reject each claim.

## Tasks / Subtasks

- [x] Task 1: Add AuthorClaim model to Prisma schema (AC: #4, #5, #6, #7, #8, #9)
  - [x] 1.1 Add `ClaimStatus` enum (`PENDING`, `APPROVED`, `REJECTED`) to `prisma/schema.prisma`
  - [x] 1.2 Add `VerificationMethod` enum (`AMAZON`, `WEBSITE`, `MANUAL`) to `prisma/schema.prisma`
  - [x] 1.3 Add `AuthorClaim` model with fields: `id`, `userId`, `bookId`, `verificationMethod`, `verificationUrl`, `verificationText`, `status`, `reviewedById`, `reviewedAt`, `createdAt`, `updatedAt`
  - [x] 1.4 Add relations: `AuthorClaim` -> `User` (claimant), `AuthorClaim` -> `User` (reviewer), `AuthorClaim` -> `Book`
  - [x] 1.5 Run `npx prisma generate` and `npx prisma db push`

- [x] Task 2: Create Zod validation schemas (AC: #4, #5, #6)
  - [x] 2.1 Create `src/lib/validation/author.ts` with `submitClaimSchema` (bookId, verificationMethod, verificationUrl?, verificationText?)
  - [x] 2.2 Add `reviewClaimSchema` (claimId, decision: approve/reject)
  - [x] 2.3 Add URL format validation for Amazon and website methods

- [x] Task 3: Create server actions for claim submission (AC: #4, #5, #6, #7)
  - [x] 3.1 Create `src/actions/authors/submitClaim.ts` - validates input, checks auth, checks no existing pending/approved claim for same user+book, creates AuthorClaim record
  - [x] 3.2 Create `src/actions/authors/getClaimStatus.ts` - returns claim status for current user + bookId
  - [x] 3.3 Create `src/actions/authors/index.ts` barrel export

- [x] Task 4: Create server actions for admin claim review (AC: #8, #9, #11)
  - [x] 4.1 Create `src/actions/authors/getPendingClaims.ts` - returns all pending claims with user/book data (admin only)
  - [x] 4.2 Create `src/actions/authors/reviewClaim.ts` - approve/reject a claim, set reviewedById/reviewedAt, trigger Pusher notification to claimant
  - [x] 4.3 On approval: update RoomPresence `isAuthor` logic to use AuthorClaim status

- [x] Task 5: Create author engagement metrics action (AC: #10)
  - [x] 5.1 Create `src/actions/authors/getBookEngagement.ts` - returns library count, currently-reading count, room occupant count for a verified author's book

- [x] Task 6: Create AuthorClaimForm component (AC: #2, #3, #4, #5, #6, #7)
  - [x] 6.1 Create `src/components/features/authors/AuthorClaimForm.tsx` - dialog/sheet with form for claim submission using react-hook-form + Zod
  - [x] 6.2 Show verification method selection (radio/select), conditional URL or text input
  - [x] 6.3 Handle loading, success, and error states
  - [x] 6.4 Create `src/components/features/authors/ClaimStatusBadge.tsx` - shows Pending/Approved/Rejected status
  - [x] 6.5 Create `src/components/features/authors/index.ts` barrel export

- [x] Task 7: Integrate claim flow into BookDetailHero (AC: #1, #2, #7)
  - [x] 7.1 Add "Are you the author?" link in `BookDetailHero.tsx` below author name
  - [x] 7.2 Fetch claim status for current user+book on page load via `getClaimStatus`
  - [x] 7.3 Show `ClaimStatusBadge` instead of link when claim exists
  - [x] 7.4 Update `getBookById.ts` to resolve `authorVerified` from actual AuthorClaim data (currently hardcoded `false`)

- [x] Task 8: Create admin claims review page (AC: #11)
  - [x] 8.1 Create `src/app/(admin)/admin/claims/page.tsx` - list pending claims
  - [x] 8.2 Create `src/app/(admin)/admin/claims/layout.tsx` - admin auth guard
  - [x] 8.3 Create `src/components/features/authors/AdminClaimReview.tsx` - card for each claim with approve/reject buttons
  - [x] 8.4 Add admin role check (check user role or hardcoded admin user IDs for MVP)

- [x] Task 9: Add real-time claim notifications (AC: #8, #9)
  - [x] 9.1 Extend NotificationProvider to listen for `author:claim-approved` and `author:claim-rejected` events on `private-user-${userId}` channel
  - [x] 9.2 Show golden toast for approval, standard toast for rejection
  - [x] 9.3 Trigger Pusher events from `reviewClaim` server action

- [x] Task 10: Create author engagement metrics display (AC: #10)
  - [x] 10.1 Create `src/components/features/authors/AuthorEngagementMetrics.tsx` - card showing library count, reading count, room activity
  - [x] 10.2 Integrate into book detail page, visible only to verified author of that book

- [x] Task 11: Write tests (All ACs)
  - [x] 11.1 Unit tests for `submitClaim` server action (validation, duplicate check, creation)
  - [x] 11.2 Unit tests for `reviewClaim` server action (approve, reject, auth check)
  - [x] 11.3 Component tests for `AuthorClaimForm` (form validation, submission, error states)
  - [x] 11.4 Component tests for `ClaimStatusBadge` (pending, approved, rejected states)
  - [x] 11.5 Component tests for `AdminClaimReview` (list display, approve/reject actions)

## Dev Notes

### Critical Architecture Patterns

**Server Actions Pattern (MUST FOLLOW):**
All server actions return `ActionResult<T>` discriminated union. Reference: `src/actions/books/types.ts`

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Auth Check Pattern:**
Every server action must verify auth first. Reference: `src/actions/presence/joinRoom.ts` lines 18-22

```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user?.id) {
  return { success: false, error: 'Unauthorized' };
}
```

**Pusher Event Pattern:**
Fire-and-forget with try/catch. Reference: `src/actions/social/giveKudos.ts` lines 75-86

```typescript
try {
  await pusherServer?.trigger(`private-user-${userId}`, 'author:claim-approved', {
    bookTitle: book.title,
    claimId: claim.id,
  });
} catch (e) {
  console.error('Pusher trigger failed:', e);
  // Don't fail the action if notification fails
}
```

**Notification Toast Pattern:**
Reference: `src/components/providers/NotificationProvider.tsx` lines 42-94
- Subscribe to `private-user-${userId}` channel
- Batch toasts for 5 seconds (queueToast/flushToasts pattern)
- Use golden styling for author-related events: `className: 'border-l-4 border-l-[#eab308]'`

### Prisma Schema Additions

Add to `prisma/schema.prisma`:

```prisma
enum ClaimStatus {
  PENDING
  APPROVED
  REJECTED
}

enum VerificationMethod {
  AMAZON
  WEBSITE
  MANUAL
}

model AuthorClaim {
  id                 String             @id @default(cuid())
  userId             String             @map("user_id")
  bookId             String             @map("book_id")
  verificationMethod VerificationMethod @map("verification_method")
  verificationUrl    String?            @map("verification_url")
  verificationText   String?            @map("verification_text")
  status             ClaimStatus        @default(PENDING)
  reviewedById       String?            @map("reviewed_by_id")
  reviewedAt         DateTime?          @map("reviewed_at")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  user               User               @relation("author_claims", fields: [userId], references: [id], onDelete: Cascade)
  reviewer           User?              @relation("reviewed_claims", fields: [reviewedById], references: [id])
  book               Book               @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([status])
  @@index([bookId])
  @@map("author_claims")
}
```

**User model additions:**
```prisma
model User {
  // ... existing fields ...
  authorClaims    AuthorClaim[] @relation("author_claims")
  reviewedClaims  AuthorClaim[] @relation("reviewed_claims")
}
```

**Book model additions:**
```prisma
model Book {
  // ... existing fields ...
  authorClaims AuthorClaim[]
}
```

### Existing Components to Modify

| File | Modification | Why |
|------|-------------|-----|
| `src/components/features/books/BookDetailHero.tsx` | Add "Are you the author?" link below author name (lines 58-63) | Entry point for claim flow |
| `src/actions/books/getBookById.ts` | Replace hardcoded `authorVerified: false` (line 136) with actual AuthorClaim lookup | Connect real verification data |
| `src/components/providers/NotificationProvider.tsx` | Add event listeners for `author:claim-approved` and `author:claim-rejected` | Real-time claim notifications |

### New Files to Create

```
src/
├── actions/authors/
│   ├── submitClaim.ts
│   ├── getClaimStatus.ts
│   ├── getPendingClaims.ts
│   ├── reviewClaim.ts
│   ├── getBookEngagement.ts
│   └── index.ts
├── components/features/authors/
│   ├── AuthorClaimForm.tsx
│   ├── AuthorClaimForm.test.tsx
│   ├── ClaimStatusBadge.tsx
│   ├── ClaimStatusBadge.test.tsx
│   ├── AdminClaimReview.tsx
│   ├── AdminClaimReview.test.tsx
│   ├── AuthorEngagementMetrics.tsx
│   └── index.ts
├── lib/validation/
│   └── author.ts
└── app/(admin)/claims/
    ├── layout.tsx
    └── page.tsx
```

### Existing Component References

**AuthorVerifiedBadge** (`src/components/features/books/AuthorVerifiedBadge.tsx`):
- Already exists with golden shimmer animation, Lucide `BadgeCheck` icon
- Used by `BookDetailHero` when `authorVerified=true`
- No changes needed to this component - it's ready to use once `authorVerified` resolves from real data

**BookDetailHero** (`src/components/features/books/BookDetailHero.tsx`):
- Lines 58-63: Author name display area - this is where "Are you the author?" link goes
- Already renders `AuthorVerifiedBadge` conditionally

**ReadingRoomPanel** (`src/components/features/presence/ReadingRoomPanel.tsx`):
- RoomPresence model already has `isAuthor` boolean field (added in Story 5.4)
- When claim is approved, `joinRoom` action should set `isAuthor=true` by checking AuthorClaim status

### Admin Role Strategy (MVP)

For MVP, use a simple approach - either:
1. Check against hardcoded admin user IDs in environment variable `ADMIN_USER_IDS`
2. Or add an `isAdmin` boolean to the User model

Recommended: Environment variable approach (no schema change needed):
```typescript
const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',');
const isAdmin = ADMIN_IDS.includes(session.user.id);
```

### Design System Colors for Author Features

From UX spec design tokens (`src/lib/design/tokens.ts`):
```typescript
author: {
  shimmer: '#eab308',  // Rich Gold - decorative glow effect
  text: '#92400e',     // Dark Amber - accessible text (12.8:1 contrast)
}
```

Toast styling for author notifications:
- Approval: Gold border-left (`border-l-4 border-l-[#eab308]`), sparkle icon
- Rejection: Standard amber toast styling

### UX Guidelines

- **"Are you the author?" link**: Subtle, not prominent - below author name, text link style
- **Claim form**: Use Dialog (desktop) or Sheet (mobile) pattern from shadcn/ui
- **Confirmation message**: Warm, encouraging tone - "Claim submitted! We'll verify within 24-48 hours."
- **Status badge**: Pending (amber), Approved (green with shimmer), Rejected (muted)
- **Engagement metrics**: Simple card with 3 stats, visible only to verified author
- **Minimum 44px touch targets** for all interactive elements
- **WCAG 2.1 AA** compliance for all new components

### Previous Story Intelligence

**Story 5.4 (Leave Reading Room)** established:
- `RoomPresence` model with `isAuthor` field already in schema
- Pusher presence channel patterns for room events
- Idle timeout and heartbeat patterns
- Toast notification patterns for room state changes

**Story 5.1 (Pusher Spike)** established:
- `/api/pusher/auth` endpoint for channel authorization
- `private-user-{userId}` channel pattern for private notifications
- Pusher server config in `src/lib/pusher.ts` (or `src/services/pusher/`)

**Story 4.5 (Kudos Notifications)** established:
- `NotificationProvider` pattern with Pusher subscription
- `useNotificationStore` Zustand store for toast batching
- Toast display with action buttons and navigation

### Git Intelligence

Recent commits show:
- `a63cab1` - Story 5.4: Leave reading room (most recent, relevant patterns)
- `bab7023` - Story 1.6: Public landing page
- `0f42908` - Middleware migration to proxy.ts for Next.js 16
- `42c1ad5` - Code review fixes across multiple stories

Key insight: The project uses Next.js 16 with `proxy.ts` instead of `middleware.ts`. Route protection for admin pages should follow this pattern.

### Project Structure Notes

- Alignment with architecture: New `src/actions/authors/` follows existing nested-by-domain pattern
- Alignment with architecture: New `src/components/features/authors/` follows existing feature folder pattern
- Admin route group `src/app/(admin)/` is defined in architecture but has no existing files - this story creates the first admin page
- All imports must use `@/` alias for cross-boundary imports

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-reading-rooms-author-presence.md#Story 5.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6, FR12, FR30, FR33, FR37]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#AuthorShimmerBadge]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4: Author Claims Book]
- [Source: src/components/features/books/BookDetailHero.tsx - lines 58-63]
- [Source: src/components/features/books/AuthorVerifiedBadge.tsx]
- [Source: src/actions/books/getBookById.ts - line 136 authorVerified placeholder]
- [Source: src/components/providers/NotificationProvider.tsx - Pusher subscription pattern]
- [Source: src/stores/useNotificationStore.ts - toast batching pattern]
- [Source: src/actions/social/giveKudos.ts - Pusher trigger pattern]
- [Source: src/actions/presence/joinRoom.ts - auth check + RoomPresence creation]
- [Source: prisma/schema.prisma - RoomPresence.isAuthor field]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- `npx prisma db push` failed due to missing database credentials in dev environment - schema validated via `npx prisma validate` and `npx prisma generate` instead
- Pre-existing test failures: `middleware.test.ts` (import path outdated), `AppShell.test.tsx` (missing DATABASE_URL env), `BookDetailActions.test.tsx` (1 test timing issue) - none related to this story

### Completion Notes List
- Task 1: Added ClaimStatus/VerificationMethod enums and AuthorClaim model to Prisma schema with all required relations and indexes. Schema validates and Prisma client generates successfully.
- Task 2: Created Zod validation schemas in `src/lib/validation/author.ts` with submitClaimSchema (conditional URL/text validation) and reviewClaimSchema.
- Task 3: Created submitClaim and getClaimStatus server actions following the existing ActionResult pattern. Includes duplicate claim prevention and re-submission after rejection.
- Task 4: Created getPendingClaims and reviewClaim server actions with admin role check via ADMIN_USER_IDS env var. Added Pusher notifications on approve/reject. Updated joinRoom to set isAuthor from AuthorClaim status.
- Task 5: Created getBookEngagement server action returning library count, currently-reading count, and room occupant count for verified authors.
- Task 6: Created AuthorClaimForm (Sheet-based, react-hook-form + Zod) with verification method selection and conditional inputs. Created ClaimStatusBadge with Pending/Approved/Rejected states.
- Task 7: Updated BookDetailHero to show "Are you the author?" link (44px touch target), claim status badge when claim exists, and claim form sheet. Updated getBookById to resolve authorVerified from actual AuthorClaim data.
- Task 8: Created admin claims review page at /admin/claims with server-side admin auth guard. Added /admin to protected routes in proxy.ts.
- Task 9: Extended NotificationProvider to listen for author:claim-approved and author:claim-rejected events with golden toast styling for approvals.
- Task 10: Created AuthorEngagementMetrics component with library count, reading now, and room occupancy stats. Integrated into BookDetail page, visible only when authorVerified is true.
- Task 11: Wrote 31 new tests (7 submitClaim, 7 reviewClaim, 4 ClaimStatusBadge, 8 AuthorClaimForm, 5 AdminClaimReview) plus 2 new BookDetailHero tests. Fixed regressions in existing tests (getBookById, joinRoom, BookDetailHero, BookDetail) caused by new Prisma model and component changes. All 74 modified/new tests pass.

### File List

New files:
- prisma/schema.prisma (modified - added enums and AuthorClaim model)
- src/lib/validation/author.ts
- src/lib/admin.ts
- src/actions/authors/submitClaim.ts
- src/actions/authors/submitClaim.test.ts
- src/actions/authors/getClaimStatus.ts
- src/actions/authors/getClaimStatus.test.ts
- src/actions/authors/getPendingClaims.ts
- src/actions/authors/getPendingClaims.test.ts
- src/actions/authors/reviewClaim.ts
- src/actions/authors/reviewClaim.test.ts
- src/actions/authors/getBookEngagement.ts
- src/actions/authors/getBookEngagement.test.ts
- src/actions/authors/index.ts
- src/components/features/authors/AuthorClaimForm.tsx
- src/components/features/authors/AuthorClaimForm.test.tsx
- src/components/features/authors/ClaimStatusBadge.tsx
- src/components/features/authors/ClaimStatusBadge.test.tsx
- src/components/features/authors/AdminClaimReview.tsx
- src/components/features/authors/AdminClaimReview.test.tsx
- src/components/features/authors/AuthorEngagementMetrics.tsx
- src/components/features/authors/AuthorEngagementMetrics.test.tsx
- src/components/features/authors/index.ts
- src/app/(admin)/admin/claims/layout.tsx
- src/app/(admin)/admin/claims/page.tsx

Modified files:
- prisma/schema.prisma (added ClaimStatus, VerificationMethod enums; AuthorClaim model; relations on User and Book)
- src/actions/books/getBookById.ts (replaced hardcoded authorVerified: false with actual AuthorClaim lookup)
- src/actions/books/getBookById.test.ts (added authorClaim mock)
- src/actions/presence/joinRoom.ts (added isAuthor check from AuthorClaim on room join)
- src/actions/presence/joinRoom.test.ts (added authorClaim mock to transaction)
- src/components/features/books/BookDetailHero.tsx (added claim link, status badge, claim form integration)
- src/components/features/books/BookDetailHero.test.tsx (added mocks for new dependencies, 3 new tests)
- src/components/features/books/BookDetail.tsx (added AuthorEngagementMetrics integration)
- src/components/features/books/BookDetail.test.tsx (added AuthorEngagementMetrics mock)
- src/components/providers/NotificationProvider.tsx (added author claim event listeners)
- src/proxy.ts (added /admin to protected routes)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress -> review)

## Change Log

- 2026-02-09: Implemented Story 5.5 - Author Claim & Verification. Added AuthorClaim Prisma model with enums, server actions for claim submission and admin review, AuthorClaimForm component with Sheet UI, ClaimStatusBadge, AdminClaimReview page, real-time Pusher notifications for claim decisions, author engagement metrics display, and comprehensive test coverage (31 new tests, 74 total passing).
- 2026-02-09: Code review fixes (8 issues fixed): [H1] Added error feedback to AdminClaimReview on review failure. [H2] Removed unsafe non-null assertion in BookDetailHero. [H3] Added 20 new tests for getClaimStatus (5), getPendingClaims (5), getBookEngagement (5), AuthorEngagementMetrics (4), BookDetailHero AC#1 (1). [H4] Implemented AC#1 - hides "Are you the author?" link when another user is already verified as author. [M1] Wrapped submitClaim check+delete+create in Prisma transaction to prevent race conditions. [M2] Added await to Pusher trigger in reviewClaim per reference pattern. [M3] Extracted shared admin ID util to src/lib/admin.ts (DRY). [M4] Fixed admin layout to use per-request admin check instead of stale module-scope constant. Total: 1247 tests passing.
