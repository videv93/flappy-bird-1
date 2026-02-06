# Story 2.6: Library View & Organization

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to view my book library organized by reading status**,
So that **I can easily see what I'm reading and find my next book**.

## Acceptance Criteria

1. **Given** I am logged in **When** I navigate to the Library tab **Then** I see my books organized in sections: "Currently Reading", "Want to Read", "Finished" **And** "Currently Reading" section appears first **And** each section shows book count

2. **Given** I have books in "Currently Reading" **When** I view that section **Then** books are sorted by most recently active (last session or date added) **And** each book card shows: cover, title, author, progress bar **And** each book card shows presence indicator: "X reading now" (social proof)

3. **Given** I have books in "Finished" **When** I view that section **Then** books are sorted by dateFinished (most recent first) **And** each book card shows completion date

4. **Given** I have no books in my library **When** I view the Library tab **Then** I see an empty state: "Start your reading journey" **And** I see a CTA button: "Find a Book" (links to Search)

5. **Given** I have many books (10+) **When** I scroll through a section **Then** the list virtualizes for performance **And** I can pull-to-refresh to update presence counts

## Tasks / Subtasks

- [x] **Task 1: Create `getUserLibrary` Server Action** (AC: #1, #2, #3)
  - [x]Create `src/actions/books/getUserLibrary.ts`
  - [x]Fetch all non-deleted UserBook records for authenticated user, include Book relation
  - [x]Return books grouped by status with proper sorting: CURRENTLY_READING by `updatedAt` desc, FINISHED by `dateFinished` desc, WANT_TO_READ by `dateAdded` desc
  - [x]Include reader count per book (totalReaders, currentlyReading) for social proof
  - [x]Return `ActionResult<LibraryData>` with type `{ books: UserBookWithBook[]; readerCounts: Map<string, { total: number; reading: number }> }`
  - [x]Create co-located test file `getUserLibrary.test.ts`
  - [x]Export from `src/actions/books/index.ts`

- [x] **Task 2: Install shadcn Tabs component** (AC: #1)
  - [x]Run `npx shadcn@latest add tabs`
  - [x]Verify component added at `src/components/ui/tabs.tsx`

- [x] **Task 3: Create `LibraryBookCard` component** (AC: #2, #3)
  - [x]Create `src/components/features/books/LibraryBookCard.tsx`
  - [x]Show book cover (with fallback placeholder), title, author
  - [x]For CURRENTLY_READING: show progress bar using existing `Progress` component
  - [x]For FINISHED: show completion date formatted with `formatDistanceToNow` or simple date
  - [x]Show "X reading now" presence count badge when currentlyReading > 0
  - [x]Entire card links to `/book/[id]` (book detail page)
  - [x]Follow existing BookSearchResult card patterns for visual consistency
  - [x]Minimum 44px touch target per UX spec
  - [x]Create co-located test file `LibraryBookCard.test.tsx`

- [x] **Task 4: Create `LibraryBookCardSkeleton` component** (AC: #1)
  - [x]Create `src/components/features/books/LibraryBookCardSkeleton.tsx`
  - [x]Match layout of `LibraryBookCard` with Skeleton placeholders
  - [x]Accept `count` prop to render multiple skeletons

- [x] **Task 5: Create `LibraryEmptyState` component** (AC: #4)
  - [x]Create `src/components/features/books/LibraryEmptyState.tsx`
  - [x]Show BookOpen icon, "Start your reading journey" heading, helpful description
  - [x]"Find a Book" CTA button linking to `/search`
  - [x]Follow UX spec empty state pattern: icon + headline + description + CTA
  - [x]Create co-located test file `LibraryEmptyState.test.tsx`

- [x] **Task 6: Create `LibrarySection` component** (AC: #1, #2, #3)
  - [x]Create `src/components/features/books/LibrarySection.tsx`
  - [x]Accept props: `title`, `books`, `readerCounts`, `status`, `emptyMessage`
  - [x]Render section header with title and book count badge
  - [x]Render list of `LibraryBookCard` components
  - [x]Show section-specific empty message when no books in that status
  - [x]Create co-located test file `LibrarySection.test.tsx`

- [x] **Task 7: Create `LibraryView` container component** (AC: #1, #2, #3, #4, #5)
  - [x]Create `src/components/features/books/LibraryView.tsx` as `'use client'` component
  - [x]Call `getUserLibrary` on mount to fetch user's books
  - [x]Group books by status into three sections
  - [x]Use Tabs component (shadcn) for "Currently Reading" / "Want to Read" / "Finished" navigation
  - [x]Show tab badges with count per section
  - [x]Show `LibraryEmptyState` when user has zero books total
  - [x]Show `LibraryBookCardSkeleton` during loading
  - [x]Handle error state with retry button
  - [x]Implement pull-to-refresh via simple "Refresh" button or swipe handler
  - [x]Create co-located test file `LibraryView.test.tsx`

- [x] **Task 8: Update Library page** (AC: all)
  - [x]Update `src/app/(main)/library/page.tsx`
  - [x]Replace placeholder with `PageHeader` title "Library" + `LibraryView` component
  - [x]Use `PageHeader` from existing layout components for consistency

- [x] **Task 9: Update feature barrel exports** (AC: n/a)
  - [x]Update `src/components/features/books/index.ts` to export new components
  - [x]Ensure all new files follow naming conventions

- [x] **Task 10: Write integration tests** (AC: all)
  - [x]Test Library page renders LibraryView
  - [x]Test empty state when no books
  - [x]Test books appear grouped by status in correct tabs
  - [x]Test "Currently Reading" tab shows progress bars
  - [x]Test "Finished" tab shows completion dates
  - [x]Test book cards link to correct detail pages
  - [x]Test loading skeleton appears during fetch
  - [x]Test error state with retry functionality
  - [x]Test "Find a Book" CTA navigates to search

## Dev Notes

### Architecture Compliance - CRITICAL

**Server Action Pattern (MUST follow):**
```typescript
// src/actions/books/getUserLibrary.ts
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { ActionResult, UserBookWithBook } from './types';

export interface LibraryData {
  books: UserBookWithBook[];
  readerCounts: Record<string, { total: number; reading: number }>;
}

export async function getUserLibrary(): Promise<ActionResult<LibraryData>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const books = await prisma.userBook.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    include: { book: true },
    orderBy: { updatedAt: 'desc' },
  });

  // Batch fetch reader counts for all books
  const bookIds = books.map((ub) => ub.bookId);
  const readerCounts: Record<string, { total: number; reading: number }> = {};

  if (bookIds.length > 0) {
    const [totalCounts, readingCounts] = await Promise.all([
      prisma.userBook.groupBy({
        by: ['bookId'],
        where: { bookId: { in: bookIds }, deletedAt: null },
        _count: true,
      }),
      prisma.userBook.groupBy({
        by: ['bookId'],
        where: {
          bookId: { in: bookIds },
          status: 'CURRENTLY_READING',
          deletedAt: null,
        },
        _count: true,
      }),
    ]);

    totalCounts.forEach((c) => {
      readerCounts[c.bookId] = { total: c._count, reading: 0 };
    });
    readingCounts.forEach((c) => {
      if (readerCounts[c.bookId]) {
        readerCounts[c.bookId].reading = c._count;
      }
    });
  }

  return { success: true, data: { books, readerCounts } };
}
```

**Import Alias Enforcement:**
```typescript
// ALWAYS use @/* for cross-boundary imports
import { getUserLibrary } from '@/actions/books';
import { LibraryBookCard } from '@/components/features/books/LibraryBookCard';
import { PageHeader } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// Relative imports OK within same feature folder
import { LibraryBookCardSkeleton } from './LibraryBookCardSkeleton';
```

### Existing Components to Reuse - DO NOT RECREATE

| Component | Location | What It Does |
|-----------|----------|-------------|
| `PageHeader` | `src/components/layout/PageHeader.tsx` | Sticky page header with title - use for Library page header |
| `Progress` | `src/components/ui/progress.tsx` | Progress bar - use for reading progress on book cards |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Loading skeleton - use for loading states |
| `Card` | `src/components/ui/card.tsx` | Card container - use as base for book cards |
| `Button` | `src/components/ui/button.tsx` | Button with variants - use for CTA |
| `Avatar` | `src/components/ui/avatar.tsx` | Avatar component - available if needed for presence |
| `BookReadersCount` | `src/components/features/books/BookReadersCount.tsx` | Shows total readers count - reuse or adapt pattern |
| `BookDetailSkeleton` | `src/components/features/books/BookDetailSkeleton.tsx` | Reference for skeleton patterns |
| `BookSearchResult` | `src/components/features/books/BookSearchResult.tsx` | Reference for book card layout patterns |
| `READING_STATUS_OPTIONS` | `src/components/features/books/types.ts` | Status labels/icons - reuse for tab labels |
| `getReadingStatusLabel` | `src/components/features/books/types.ts` | Get display label for status |
| `getReadingStatusIcon` | `src/components/features/books/types.ts` | Get icon for status |

**CRITICAL: `useUserLibrary` hook is for optimistic client-side state during search/add flows. For the Library page, fetch data directly via `getUserLibrary` server action since we need the FULL library, not search-context batches.**

### Tabs Component (NEW - must install)

No `Tabs` component currently exists in `src/components/ui/`. Install via:
```bash
npx shadcn@latest add tabs
```

This provides `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`.

### Data Shapes

**UserBookWithBook (from Prisma):**
```typescript
interface UserBookWithBook {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatus; // 'CURRENTLY_READING' | 'FINISHED' | 'WANT_TO_READ'
  progress: number;      // 0-100
  dateAdded: Date;
  dateFinished: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  book: {
    id: string;
    isbn10: string | null;
    isbn13: string | null;
    title: string;
    author: string;
    coverUrl: string | null;
    pageCount: number | null;
    publishedYear: number | null;
    description: string | null;
  };
}
```

### Sorting Rules (from AC)

| Status | Sort Field | Direction |
|--------|-----------|-----------|
| CURRENTLY_READING | `updatedAt` (most recently active) | Descending |
| FINISHED | `dateFinished` | Descending (most recent first) |
| WANT_TO_READ | `dateAdded` | Descending (most recent first) |

Client-side sorting after fetch is acceptable since library size is bounded. Server-side ordering by `updatedAt` desc as default is fine; client groups and re-sorts per status.

### Book Card Link Pattern

Each book card should link to the book detail page. Use the book's database ID or ISBN:
```typescript
import Link from 'next/link';

// Link to book detail via ISBN (consistent with existing search result links)
const bookIdentifier = book.isbn13 || book.isbn10 || book.id;
<Link href={`/book/${bookIdentifier}`}>
  {/* card content */}
</Link>
```

Verify this matches how `BookSearchResult.tsx` links to book details.

### Virtualization Decision

**For MVP: Skip virtualization.** The AC mentions virtualizing for 10+ books, but this is a premature optimization for MVP. Most users will have <50 books. Standard rendering with CSS `overflow-y: auto` is sufficient. Add virtualization in a future performance story if needed. Focus on correct grouping, sorting, and empty states.

**If virtualization is required:** Use `@tanstack/react-virtual` with `useFlushSync: false` for React 19 compatibility. But this adds complexity and should be deferred.

### Pull-to-Refresh Decision

**For MVP: Use a manual "Refresh" button** (or re-fetch on tab switch) instead of implementing pull-to-refresh gesture handling. Pull-to-refresh requires touch event handling and custom CSS which adds complexity without significant UX benefit at this stage. The data is fetched fresh on page load/navigation anyway.

### Image Handling

Book covers from OpenLibrary use `covers.openlibrary.org`. The `next.config.ts` already has `openlibrary.org` in the images configuration (added in Story 2.1). Use `next/image` with the cover URL and provide a fallback for books without covers:

```typescript
import Image from 'next/image';

{book.coverUrl ? (
  <Image
    src={book.coverUrl}
    alt={`Cover of ${book.title}`}
    width={80}
    height={120}
    className="rounded-md object-cover"
  />
) : (
  <div className="flex h-[120px] w-[80px] items-center justify-center rounded-md bg-muted">
    <BookOpen className="h-8 w-8 text-muted-foreground" />
  </div>
)}
```

### UX Compliance - CRITICAL

**From UX Design Specification:**
- **Library View layout:** Direction 1 card style (Cozy Minimal), vertical scrolling book cards
- **Navigation:** Bottom tab bar with Library tab (BookOpen icon) - already implemented in BottomNav
- **Empty state:** "Start your reading journey" + "Find a Book" CTA - follow UX empty state pattern
- **Touch targets:** 44px minimum on all interactive elements
- **Social proof:** Show "X reading now" on each book card (presence indicator)
- **Section organization:** "Currently Reading" first, then "Want to Read", then "Finished"
- **Loading:** Skeleton loading for content areas, show after 200ms delay
- **Color system:** Warm amber primary, streak green for success states
- **Progress bar:** Amber fill for reading progress
- **Tabs:** Use shadcn Tabs for status sections, active tab in primary color

**Accessibility:**
- Tab keyboard navigation (Arrow keys between tabs)
- Book cards focusable with keyboard
- `aria-label` on book cards: "[title] by [author], [status]"
- Progress bar with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Empty state has semantic heading structure

### Previous Story Intelligence - CRITICAL

**From Story 2.5 (Remove Book from Library):**
- Soft-delete via `deletedAt` field: ALL queries MUST filter `deletedAt: null`
- `useUserLibrary` hook manages optimistic state for search context - not suitable for full library fetch
- 437 tests across 40 files - maintain this baseline
- AlertDialog, toast with undo, optimistic patterns all established
- `addToLibrary.ts` handles re-adding soft-deleted books (restore instead of create)

**From Story 2.4 (Update Reading Status):**
- Optimistic overlay pattern in BookDetailActions
- Reading status transitions: CURRENTLY_READING, FINISHED, WANT_TO_READ
- When changing to FINISHED: `dateFinished` is set, progress = 100%
- When changing to WANT_TO_READ: progress = 0

**From Story 2.3 (Book Detail Page):**
- `BookDetail.tsx` manages local state: `isInLibrary`, `currentStatus`, `progress`
- Book cover rendering with Next.js Image component and fallback already established
- `BookReadersCount` component shows total readers + currently reading

**From Story 2.2 (Add Book to Library):**
- `addToLibrary` creates Book + UserBook records
- `UserBookWithBook` type includes the book relation

### Git Intelligence Summary

**Recent commits:**
```
42ad437 feat: Implement remove book from library with undo and code review fixes (Story 2.5)
fb3d48c feat: Implement update reading status and code review fixes (Stories 2.3, 2.4)
b075036 feat: fetch book from OpenLibrary when not in database
e2a4880 feat: Implement book detail page with code review fixes (Story 2.3)
3cab6c2 feat: Implement add book to library functionality (Story 2.2)
```

**Patterns established:**
- Commit prefix: `feat:` for new features
- Story reference in commit message
- Co-located test files with `.test.tsx` / `.test.ts` extension
- Server actions follow `ActionResult<T>` pattern consistently
- All book queries filter `deletedAt: null`

### Testing Strategy

**Unit Tests (Vitest + React Testing Library):**

`getUserLibrary.test.ts`:
- Returns error when not authenticated
- Returns empty books array when user has no books
- Returns books with reader counts grouped correctly
- Excludes soft-deleted records (`deletedAt` is not null)
- Includes book relation data

`LibraryBookCard.test.tsx`:
- Renders book title, author, cover image
- Shows progress bar for CURRENTLY_READING status
- Shows completion date for FINISHED status
- Shows "X reading now" when currentlyReading > 0
- Links to correct book detail page
- Handles missing cover image with fallback

`LibraryEmptyState.test.tsx`:
- Renders heading "Start your reading journey"
- Renders "Find a Book" button
- Button links to /search

`LibraryView.test.tsx`:
- Renders tabs for three reading statuses
- Shows book count badges on tabs
- Renders books in correct tab/section
- Shows empty state when no books
- Shows loading skeletons during fetch
- Shows error state with retry on failure

**Mock patterns (follow existing):**
```typescript
vi.mock('@/actions/books', () => ({
  getUserLibrary: vi.fn(),
}));
```

### File Structure Requirements

```
src/
├── actions/
│   └── books/
│       ├── getUserLibrary.ts              # NEW - Fetch user's full library
│       ├── getUserLibrary.test.ts         # NEW - Tests
│       └── index.ts                       # UPDATE - Add export
├── components/
│   ├── ui/
│   │   └── tabs.tsx                       # NEW (via shadcn CLI)
│   └── features/
│       └── books/
│           ├── LibraryView.tsx            # NEW - Main library container
│           ├── LibraryView.test.tsx        # NEW - Tests
│           ├── LibrarySection.tsx          # NEW - Status section
│           ├── LibrarySection.test.tsx     # NEW - Tests
│           ├── LibraryBookCard.tsx         # NEW - Book card for library
│           ├── LibraryBookCard.test.tsx    # NEW - Tests
│           ├── LibraryBookCardSkeleton.tsx # NEW - Loading skeleton
│           ├── LibraryEmptyState.tsx       # NEW - Empty state
│           ├── LibraryEmptyState.test.tsx  # NEW - Tests
│           └── index.ts                   # UPDATE - Add exports
└── app/
    └── (main)/
        └── library/
            └── page.tsx                   # UPDATE - Replace placeholder
```

### Project Structure Notes

- All new components in `src/components/features/books/` per architecture conventions
- Server action in `src/actions/books/` domain folder with ActionResult<T> return
- Test files co-located with source files
- Feature index.ts re-exports maintained
- Uses `@/` import alias for all cross-boundary imports
- Follows component file structure order: imports, types, component, helpers
- Soft-deleted records filtered in all queries (`deletedAt: null`)

### Dependencies

**Already installed (no new packages needed):**
- `@prisma/client` - Database ORM
- `next/image` - Image optimization
- `next/link` - Client-side navigation
- `lucide-react` - Icons (BookOpen, BookMarked, CheckCircle)
- shadcn/ui: Card, Progress, Skeleton, Button, Avatar

**Requires installation:**
- shadcn Tabs component: `npx shadcn@latest add tabs`

### References

- [Source: architecture.md#Implementation Patterns] - ActionResult<T> pattern, naming conventions
- [Source: architecture.md#Structure Patterns] - Component organization, test co-location
- [Source: architecture.md#Frontend Architecture] - Zustand stores, component architecture
- [Source: architecture.md#API & Communication Patterns] - Server Actions for data fetching
- [Source: ux-design-specification.md#Design Direction Decision] - Library View: Direction 1 card style, not D2 grid
- [Source: ux-design-specification.md#Empty State Patterns] - "Start your reading journey" + CTA button
- [Source: ux-design-specification.md#Loading State Patterns] - Skeleton loading for content areas
- [Source: ux-design-specification.md#Navigation Patterns] - Bottom tab bar with Library tab
- [Source: ux-design-specification.md#Accessibility] - 44px touch targets, keyboard nav, ARIA labels
- [Source: ux-design-specification.md#Responsive Design] - Mobile-first, 1 column mobile, 2 col tablet, 3-4 col desktop
- [Source: epic-2#Story 2.6] - Acceptance criteria, section organization, sorting rules
- [Source: prd.md#FR8-FR10] - Book library with reading status management
- [Source: 2-5-remove-book-from-library.md] - Soft-delete pattern, deletedAt filtering, test baseline (437 tests)
- [Source: 2-4-update-reading-status.md] - Status transitions, dateFinished logic
- [Source: 2-3-book-detail-page.md] - Book cover rendering, BookReadersCount pattern
- [Source: 2-2-add-book-to-library.md] - UserBookWithBook type, addToLibrary action

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- All 10 tasks completed successfully
- 42 new tests added (479 total, 0 failures, 0 regressions from 437 baseline)
- Used `useReducer` pattern in LibraryView to satisfy `react-hooks/set-state-in-effect` lint rule (dispatch is stable, unlike setState)
- Skipped virtualization for MVP per dev notes (standard rendering sufficient for <50 books)
- Skipped pull-to-refresh gesture, implemented manual Refresh button instead
- LibraryView.test.tsx serves as the integration test (Task 10) covering all AC scenarios
- Pre-existing lint error in BookDetailActions.tsx (set-state-in-effect) and typecheck error in ProfileView.test.tsx remain untouched
- shadcn Tabs component installed via CLI

**Code Review Fixes Applied:**
- [H1] Removed duplicate `UserBookWithBook` interface from LibraryBookCard.tsx, LibrarySection.tsx, LibraryView.tsx — now imports from canonical `./types`
- [H2] Removed duplicate `statusLabel()` function from LibraryBookCard.tsx — now uses existing `getReadingStatusLabel` from `./types`
- [H3] Tab count badges now always visible (including `(0)` for empty tabs) per AC #1 "each section shows book count"
- [M2] Added opacity fade + pointer-events-none on tab content during refresh for visual feedback
- [M3] Added sort-order assertion test for CURRENTLY_READING (updatedAt desc) in LibraryView.test.tsx
- [L1/L2] Accepted as low-impact, no changes needed

### File List

**New files:**
- `src/actions/books/getUserLibrary.ts` - Server action to fetch user's full library with reader counts
- `src/actions/books/getUserLibrary.test.ts` - 7 tests for getUserLibrary
- `src/components/ui/tabs.tsx` - shadcn Tabs component (installed via CLI)
- `src/components/features/books/LibraryBookCard.tsx` - Book card for library view
- `src/components/features/books/LibraryBookCard.test.tsx` - 11 tests for LibraryBookCard
- `src/components/features/books/LibraryBookCardSkeleton.tsx` - Loading skeleton for book cards
- `src/components/features/books/LibraryEmptyState.tsx` - Empty state component
- `src/components/features/books/LibraryEmptyState.test.tsx` - 5 tests for LibraryEmptyState
- `src/components/features/books/LibrarySection.tsx` - Section component for book lists
- `src/components/features/books/LibrarySection.test.tsx` - 5 tests for LibrarySection
- `src/components/features/books/LibraryView.tsx` - Main library container with tabs
- `src/components/features/books/LibraryView.test.tsx` - 10 tests for LibraryView (integration)

**Modified files:**
- `src/actions/books/index.ts` - Added getUserLibrary and LibraryData exports
- `src/components/features/books/index.ts` - Added new component exports
- `src/app/(main)/library/page.tsx` - Replaced placeholder with PageHeader + LibraryView
