# Story 11.3: Buddy Read Purchase Flow

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user starting a buddy read,
I want to easily purchase the selected book,
So that I can join the reading experience.

## Acceptance Criteria

1. **Given** a user receives a buddy read invitation, **When** they view the invitation, **Then** a one-click purchase option is displayed for the buddy read book (FR62), **And** the same edition/version as the reading partner is shown (FR63), **And** an option to find the book at a local library is available (FR64).

2. **Given** a user clicks the purchase option from a buddy read, **When** the purchase flow executes, **Then** buddy read conversion rates are tracked separately from general affiliate clicks, **And** the affiliate redirect uses the same server-side flow.

3. **Given** the buddy read book is available on OpenLibrary, **When** the invitation renders, **Then** the free option is shown alongside purchase options.

## Tasks / Subtasks

- [x] Task 1: Add BuddyRead and BuddyReadInvitation Prisma models (AC: #1)
  - [x] 1.1 Add `BuddyRead` model to `prisma/schema.prisma` with fields: `id`, `creatorId`, `bookId`, `status` (enum: ACTIVE, COMPLETED, CANCELLED), `createdAt`, `updatedAt`. Add relations to `User` and `Book`.
  - [x] 1.2 Add `BuddyReadInvitation` model with fields: `id`, `buddyReadId`, `inviterId`, `inviteeId`, `status` (enum: PENDING, ACCEPTED, DECLINED), `createdAt`, `updatedAt`. Add relations to `User` and `BuddyRead`.
  - [x] 1.3 Add `BuddyReadStatus` and `InvitationStatus` enums to schema
  - [x] 1.4 Add indexes on `creatorId`, `bookId`, `inviteeId`, `buddyReadId`
  - [x] 1.5 Add `buddyReads` and `buddyReadInvitations` relations to `User` and `Book` models
  - [x] 1.6 Run `npx prisma generate`

- [x] Task 2: Create buddy read server actions (AC: #1, #2)
  - [x] 2.1 Create `src/actions/social/createBuddyRead.ts` — server action accepting `bookId` and `inviteeId`, creates `BuddyRead` and `BuddyReadInvitation` records. Follow `ActionResult<T>` pattern from `src/actions/books/types.ts`. Zod validation, auth check.
  - [x] 2.2 Create `src/actions/social/getBuddyReadInvitations.ts` — server action returning pending invitations for the current user, including book details (title, author, isbn10, isbn13, coverUrl) and inviter profile (name, image).
  - [x] 2.3 Create `src/actions/social/respondToBuddyReadInvitation.ts` — server action accepting `invitationId` and `response` (ACCEPTED/DECLINED). On accept, add book to invitee's library as WANT_TO_READ if not already present.
  - [x] 2.4 Write unit tests for all three server actions (mock prisma, mock auth)

- [x] Task 3: Create BuddyReadInvitationCard component (AC: #1, #3)
  - [x] 3.1 Create `src/components/features/social/BuddyReadInvitationCard.tsx` as client component
  - [x] 3.2 Display: book cover (or placeholder), book title, author, inviter name + avatar, "wants to read with you" message
  - [x] 3.3 Show the exact edition info: title and author matching the inviter's copy (FR63)
  - [x] 3.4 Show OpenLibrary free link first (same pattern as `BookPurchaseButton`) when ISBN is available
  - [x] 3.5 Show affiliate purchase buttons (Amazon + Bookshop.org) via `/api/affiliate?isbn={isbn}&provider={provider}&bookId={bookId}&source=buddy-read` (FR62)
  - [x] 3.6 Show "Find at library" link using WorldCat: `https://www.worldcat.org/isbn/{isbn}` (FR64)
  - [x] 3.7 Accept/Decline buttons for the invitation
  - [x] 3.8 44px minimum touch targets, proper ARIA labels per CLAUDE.md
  - [x] 3.9 Write component tests with Testing Library (states: pending, accepted, declined, with/without ISBN)

- [x] Task 4: Create BuddyReadInvitations container component (AC: #1)
  - [x] 4.1 Create `src/components/features/social/BuddyReadInvitations.tsx` as client component
  - [x] 4.2 Fetch pending invitations on mount via `getBuddyReadInvitations` server action
  - [x] 4.3 Show loading skeleton while fetching
  - [x] 4.4 Show empty state if no pending invitations
  - [x] 4.5 Render `BuddyReadInvitationCard` for each invitation
  - [x] 4.6 Handle accept/decline with optimistic UI update
  - [x] 4.7 Write component tests (loading, empty, populated, accept/decline flows)

- [x] Task 5: Create "Start Buddy Read" flow from book detail (AC: #1)
  - [x] 5.1 Create `src/components/features/social/StartBuddyReadButton.tsx` — button that opens a modal/sheet to select a friend
  - [x] 5.2 Create `src/components/features/social/FriendPickerModal.tsx` — shows followed users, search/filter, select one to invite
  - [x] 5.3 Use `getFollowing` or create server action to list followed users
  - [x] 5.4 On confirm, call `createBuddyRead` server action with selected friend and current book
  - [x] 5.5 Show success toast after invitation sent
  - [x] 5.6 Write component tests for both components

- [x] Task 6: Integrate into existing pages (AC: #1)
  - [x] 6.1 In `src/components/features/books/BookDetail.tsx`, add `StartBuddyReadButton` with `React.lazy` + `Suspense` — show when user has the book in their library
  - [x] 6.2 Create `/src/app/(main)/buddy-reads/page.tsx` — page showing pending buddy read invitations using `BuddyReadInvitations` container
  - [x] 6.3 Add buddy reads link to navigation or activity section (keep minimal — a badge count on the nav or a section on the home page)
  - [x] 6.4 Verify no regression on existing BookDetail tests

- [x] Task 7: Update affiliate route for buddy-read source tracking (AC: #2)
  - [x] 7.1 In `src/app/api/affiliate/route.ts`, ensure `source=buddy-read` is accepted and stored in `AffiliateClick.source` field (already supports arbitrary source strings from Story 11.2)
  - [x] 7.2 Verify the existing route handles the `buddy-read` source value correctly (should work without changes — just validate with a test)
  - [x] 7.3 Add route test specifically for `source=buddy-read`

## Dev Notes

### Architecture Compliance

- **Server Actions pattern**: All new server actions MUST follow the exact pattern in `src/actions/books/updateReadingStatus.ts` — Zod validation, auth check via `auth.api.getSession()`, prisma query, `ActionResult<T>` return.
- **`@/` import alias**: All cross-boundary imports MUST use `@/` prefix per CLAUDE.md.
- **Lazy loading**: Use `React.lazy` + `Suspense` for new components added to BookDetail (same pattern as `BookPurchaseButton` and `PostReadingRecommendations`).
- **ActionResult<T> pattern**: Use discriminated union from `src/actions/books/types.ts`.
- **Component structure**: New social components go in `src/components/features/social/`. Check if this directory exists; if not, create it following the pattern of `src/components/features/books/`.

### Existing Code to Integrate With

- **BookDetail**: `src/components/features/books/BookDetail.tsx` — client component that already lazy-loads `BookPurchaseButton` and `PostReadingRecommendations`. Add `StartBuddyReadButton` the same way.
- **BookPurchaseButton**: `src/components/features/books/BookPurchaseButton.tsx` — reuse the affiliate link pattern (`/api/affiliate?isbn=...&provider=...&bookId=...&source=buddy-read`). Reference this component's approach for the invitation card purchase buttons.
- **Affiliate API route**: `src/app/api/affiliate/route.ts` — already accepts `source` query param (added in Story 11.2). No changes needed for routing; just pass `source=buddy-read`.
- **AffiliateClick model**: `prisma/schema.prisma` — already has nullable `source` field from Story 11.2.
- **Follow model**: `prisma/schema.prisma` — `Follow` model (followerId, followingId) used to find friends for the friend picker.
- **UserBook model**: Has `userId`, `bookId`, `status` fields. Use to check if invitee already has the book.
- **Auth**: `src/lib/auth.ts` server config, `src/lib/auth-client.ts` for client hooks.

### CRITICAL: Buddy Read Feature Does Not Exist Yet

There is **NO existing buddy read code** in the codebase. This story creates the buddy read feature from scratch:
- New Prisma models: `BuddyRead`, `BuddyReadInvitation` + enums
- New server actions for CRUD operations
- New UI components for invitations and friend picking
- New page route at `/buddy-reads`

This is a larger story than 11.1 and 11.2 because it introduces a new domain feature alongside the affiliate integration. The affiliate part (purchase buttons on invitations) reuses existing patterns heavily.

### Edition Matching (FR63)

The "same edition/version" requirement is fulfilled by showing the same book record from the database. When a user creates a buddy read, the `bookId` references the exact Book record (with its specific ISBN, title, author). The invitation card displays this exact book data, ensuring the invitee sees the same edition the inviter has.

### Library Finder (FR64)

Use WorldCat for library lookup: `https://www.worldcat.org/isbn/{isbn}`. This is a free service that finds books in local libraries by ISBN. No API key needed — just link to the URL.

### Security Requirements

- Server actions validate auth before any DB operations
- Buddy read creation validates that inviter follows the invitee (prevent spam invitations)
- Affiliate links use same server-side generation pattern (never expose IDs in client)
- Invitation responses validate that the responding user is the actual invitee

### Testing Standards

- **Vitest + Testing Library** for component tests
- **Co-locate tests** with source files
- **Mock external dependencies**: Mock `prisma` for DB queries, mock `auth.api.getSession` for auth
- **Test states**: Loading, empty invitations, populated invitations, accept/decline flows, with/without ISBN, affiliate link generation
- Follow patterns from Story 11.2 tests — mock child components in parent tests using `vi.mock`

### Project Structure Notes

- New files:
  - `prisma/schema.prisma` (modified — add BuddyRead, BuddyReadInvitation models + enums)
  - `src/actions/social/createBuddyRead.ts` (new)
  - `src/actions/social/createBuddyRead.test.ts` (new)
  - `src/actions/social/getBuddyReadInvitations.ts` (new)
  - `src/actions/social/getBuddyReadInvitations.test.ts` (new)
  - `src/actions/social/respondToBuddyReadInvitation.ts` (new)
  - `src/actions/social/respondToBuddyReadInvitation.test.ts` (new)
  - `src/components/features/social/BuddyReadInvitationCard.tsx` (new)
  - `src/components/features/social/BuddyReadInvitationCard.test.tsx` (new)
  - `src/components/features/social/BuddyReadInvitations.tsx` (new)
  - `src/components/features/social/BuddyReadInvitations.test.tsx` (new)
  - `src/components/features/social/StartBuddyReadButton.tsx` (new)
  - `src/components/features/social/StartBuddyReadButton.test.tsx` (new)
  - `src/components/features/social/FriendPickerModal.tsx` (new)
  - `src/components/features/social/FriendPickerModal.test.tsx` (new)
  - `src/app/(main)/buddy-reads/page.tsx` (new)
- Modified files:
  - `src/components/features/books/BookDetail.tsx` (add StartBuddyReadButton)
  - `src/components/features/books/BookDetail.test.tsx` (add buddy read button tests)
  - `src/app/api/affiliate/route.test.ts` (add buddy-read source test)

### Previous Story Learnings (from 11.1 and 11.2)

- **Use `React.lazy` + `Suspense`** for lazy loading components in BookDetail — was caught in 11.1 code review when using direct import
- **Always create integration/route tests** — was caught in 11.1 when route tests were missing
- **Include both Amazon AND Bookshop.org** purchase options — was caught in 11.1 when only Amazon was shown
- **ISBN validation** should use `/^(\d{9}[\dX]|\d{13})$/` pattern
- **Mock child components** in parent tests using `vi.mock` (pattern from 11.2)
- **`npx prisma db push` will fail** without DB credentials — that's expected, `npx prisma generate` is sufficient
- **Add Zod validation** to all server actions (caught in 11.2 code review)
- **Include `bookId`** in affiliate URLs for click tracking (caught in 11.1 code review)

### Git Intelligence

Recent commits show a pattern of large feature commits covering multiple stories. The most recent commit `6a4845e` implemented Stories 9.1-11.2 including the affiliate infrastructure this story builds upon. Key patterns:
- Server actions in `src/actions/` with Zod + auth + ActionResult pattern
- API routes in `src/app/api/`
- Feature components in `src/components/features/{domain}/`
- Tests co-located with source files

### References

- [Source: _bmad-output/planning-artifacts/epics-affiliate-monetization.md#Story 11.3]
- [Source: _bmad-output/epic-affiliate-monetization-implementation.md#Story 3: Buddy Read Purchase Flow]
- [Source: src/components/features/books/BookPurchaseButton.tsx#affiliate link pattern]
- [Source: src/app/api/affiliate/route.ts#source param support]
- [Source: prisma/schema.prisma#AffiliateClick model with source field]
- [Source: prisma/schema.prisma#Follow model]
- [Source: prisma/schema.prisma#UserBook model]
- [Source: prisma/schema.prisma#Book model with isbn10/isbn13]
- [Source: src/components/features/books/BookDetail.tsx#lazy loading pattern]
- [Source: _bmad-output/implementation-artifacts/11-1-book-detail-affiliate-integration.md#Code Review Fixes]
- [Source: _bmad-output/implementation-artifacts/11-2-post-reading-recommendations.md#Previous Story Learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma db push skipped (no local DB credentials) — prisma generate succeeded
- 3 pre-existing test failures (BookDetailActions, ReadingRoomPanel, getSessionHistory) — unrelated to this story

### Completion Notes List

- Task 1: Added `BuddyRead` and `BuddyReadInvitation` Prisma models with `BuddyReadStatus` and `InvitationStatus` enums. Added indexes, relations to User and Book models. Prisma client generated successfully.
- Task 2: Created 3 server actions (`createBuddyRead`, `getBuddyReadInvitations`, `respondToBuddyReadInvitation`) following ActionResult<T> pattern with Zod validation, auth checks, and security guards (follow check, invitee ownership). Also created `getFollowing` helper action. 16 unit tests passing.
- Task 3: Created `BuddyReadInvitationCard` component with book cover/placeholder, inviter info, OpenLibrary free link, Amazon + Bookshop.org affiliate links with `source=buddy-read`, WorldCat library finder, accept/decline buttons. 44px touch targets, ARIA labels. 9 component tests passing.
- Task 4: Created `BuddyReadInvitations` container with loading skeleton, empty state, optimistic removal on respond. 4 component tests passing.
- Task 5: Created `StartBuddyReadButton` (opens friend picker), `FriendPickerModal` (search/filter followed users, select to invite). Toast on success/error. 10 component tests passing.
- Task 6: Integrated `StartBuddyReadButton` into `BookDetail.tsx` with `React.lazy` + `Suspense`, shown when book is in library. Created `/buddy-reads` page. All 23 BookDetail tests pass (no regressions).
- Task 7: Verified existing affiliate route handles `source=buddy-read` correctly (no code changes needed). Added dedicated route test. 13 route tests passing.

### File List

- prisma/schema.prisma (modified — added BuddyReadStatus, InvitationStatus enums, BuddyRead, BuddyReadInvitation models, relations to User and Book)
- src/actions/social/createBuddyRead.ts (new — create buddy read + invitation server action)
- src/actions/social/createBuddyRead.test.ts (new — 6 unit tests)
- src/actions/social/getBuddyReadInvitations.ts (new — fetch pending invitations server action)
- src/actions/social/getBuddyReadInvitations.test.ts (new — 3 unit tests)
- src/actions/social/respondToBuddyReadInvitation.ts (new — accept/decline invitation server action)
- src/actions/social/respondToBuddyReadInvitation.test.ts (new — 7 unit tests)
- src/actions/social/getFollowing.ts (new — get followed users server action)
- src/components/features/social/BuddyReadInvitationCard.tsx (new — invitation card with purchase options)
- src/components/features/social/BuddyReadInvitationCard.test.tsx (new — 9 component tests)
- src/components/features/social/BuddyReadInvitations.tsx (new — invitations container)
- src/components/features/social/BuddyReadInvitations.test.tsx (new — 4 component tests)
- src/components/features/social/StartBuddyReadButton.tsx (new — start buddy read button with friend picker)
- src/components/features/social/StartBuddyReadButton.test.tsx (new — 5 component tests)
- src/components/features/social/FriendPickerModal.tsx (new — friend selection modal with search)
- src/components/features/social/FriendPickerModal.test.tsx (new — 5 component tests)
- src/app/(main)/buddy-reads/page.tsx (new — buddy reads page)
- src/components/features/books/BookDetail.tsx (modified — added lazy-loaded StartBuddyReadButton)
- src/app/api/affiliate/route.test.ts (modified — added buddy-read source test)
