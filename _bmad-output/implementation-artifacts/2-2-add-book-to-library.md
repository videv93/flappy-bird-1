# Story 2.2: Add Book to Library

Status: done

## Story

As a **user**,
I want **to add books to my library with a reading status**,
So that **I can track what I'm reading, have read, or want to read**.

## Acceptance Criteria

1. **Given** I am viewing search results **When** I tap on a book that's not in my library **Then** I see an "Add to Library" button **And** I can select a status: "Currently Reading", "Finished", or "Want to Read"

2. **Given** I select a status and tap "Add" **When** the book is added **Then** the book appears in my library immediately (optimistic UI) **And** I see a success toast "Added to [status]" **And** the Book record is created if it doesn't exist (upsert by ISBN) **And** a UserBook record links me to the book with the selected status

3. **Given** a book is already in my library **When** I view it in search results **Then** I see a checkmark and current status instead of "Add" button **And** I can tap to change status or go to the book

4. **Given** I add a book as "Currently Reading" **When** the book is added **Then** it appears at the top of my Library's "Currently Reading" section **And** the book has a default progress of 0%

## Tasks / Subtasks

- [x] **Task 1: Create Database Schema for Books** (AC: #2, #4)
  - [x] Add `Book` model to `prisma/schema.prisma` with fields: id, isbn10, isbn13, title, author, coverUrl, pageCount, publishedYear, description, createdAt, updatedAt
  - [x] Add `UserBook` model with fields: id, userId, bookId, status (enum), progress, dateAdded, dateFinished, createdAt, updatedAt
  - [x] Create `ReadingStatus` enum: `CURRENTLY_READING`, `FINISHED`, `WANT_TO_READ`
  - [x] Add proper indexes on isbn10, isbn13 for upsert lookups
  - [x] Add composite unique constraint on userId + bookId
  - [x] Run `prisma migrate dev` to create migration (manual migration due to DB not running)
  - [x] Run `prisma generate` to update client types

- [x] **Task 2: Create Server Actions for Book Library** (AC: #2, #3, #4)
  - [x] Create `src/actions/books/addToLibrary.ts` - Server Action to add book
  - [x] Create `src/actions/books/types.ts` - Action input/output types
  - [x] Create `src/actions/books/index.ts` - Re-exports
  - [x] Implement upsert logic: create Book if not exists (by ISBN), create UserBook
  - [x] Return `ActionResult<UserBookWithBook>` type
  - [x] Add validation with Zod schema
  - [x] Write co-located tests for action

- [x] **Task 3: Create getUserBookStatus Query** (AC: #3)
  - [x] Create `src/actions/books/getUserBookStatus.ts` - Check if user has book
  - [x] Accept bookId or ISBN as identifier
  - [x] Return status and UserBook data if exists, null if not
  - [x] Write co-located tests

- [x] **Task 4: Create AddToLibraryButton Component** (AC: #1, #2, #3)
  - [x] Create `src/components/features/books/AddToLibraryButton.tsx`
  - [x] Show "Add to Library" button when book not in library
  - [x] Show checkmark with current status when book is in library
  - [x] Implement dropdown/popover with status options
  - [x] Use optimistic UI pattern (update immediately, rollback on error)
  - [x] Show success toast on add
  - [x] Create co-located test file

- [x] **Task 5: Create ReadingStatusSelector Component** (AC: #1)
  - [x] Create `src/components/features/books/ReadingStatusSelector.tsx`
  - [x] Three options: "Currently Reading", "Finished", "Want to Read"
  - [x] Use shadcn/ui RadioGroup or ToggleGroup
  - [x] Visual distinction for selected state
  - [x] Touch-friendly (44px targets)
  - [x] Create co-located test file

- [x] **Task 6: Update BookSearchResult Component** (AC: #1, #3)
  - [x] Update `src/components/features/books/BookSearchResult.tsx`
  - [x] Add AddToLibraryButton to each search result
  - [x] Pass book data and user library status
  - [x] Update tests for new functionality

- [x] **Task 7: Create useUserLibrary Hook** (AC: #3)
  - [x] Create `src/hooks/useUserLibrary.ts`
  - [x] Fetch user's library books on mount
  - [x] Provide lookup function: `isInLibrary(isbn: string)`
  - [x] Provide add function with optimistic update
  - [x] Handle loading and error states
  - [x] Add to `src/hooks/index.ts` exports
  - [x] Write co-located tests

- [x] **Task 8: Update Books Feature Types and Index** (AC: all)
  - [x] Update `src/components/features/books/types.ts` with new component types
  - [x] Update `src/components/features/books/index.ts` with new exports
  - [x] Add database types to `src/types/database.ts`

- [x] **Task 9: Write Integration Tests** (AC: all)
  - [x] Test add button shows for books not in library
  - [x] Test status selector appears on button click
  - [x] Test book adds successfully with optimistic UI
  - [x] Test success toast appears
  - [x] Test checkmark shows for books already in library
  - [x] Test status displays correctly for library books
  - [x] Test error handling and rollback

## Dev Notes

### Architecture Compliance - CRITICAL

**Database Schema (NEW - This story creates Book/UserBook tables):**

```prisma
// prisma/schema.prisma - ADD these models

enum ReadingStatus {
  CURRENTLY_READING
  FINISHED
  WANT_TO_READ
}

model Book {
  id            String     @id @default(cuid())
  isbn10        String?    @unique @map("isbn_10")
  isbn13        String?    @unique @map("isbn_13")
  title         String
  author        String     // Stored as single string, comma-separated for multiple
  coverUrl      String?    @map("cover_url")
  pageCount     Int?       @map("page_count")
  publishedYear Int?       @map("published_year")
  description   String?
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  userBooks     UserBook[]

  @@index([isbn10])
  @@index([isbn13])
  @@map("books")
}

model UserBook {
  id           String        @id @default(cuid())
  userId       String        @map("user_id")
  bookId       String        @map("book_id")
  status       ReadingStatus @default(WANT_TO_READ)
  progress     Int           @default(0) // 0-100 percentage
  dateAdded    DateTime      @default(now()) @map("date_added")
  dateFinished DateTime?     @map("date_finished")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  book         Book          @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([userId])
  @@index([bookId])
  @@map("user_books")
}

// UPDATE User model to add relation
model User {
  // ... existing fields ...
  userBooks     UserBook[]
}
```

**File Organization (from Architecture):**
```
src/
├── actions/
│   └── books/                    # NEW - Server Actions for books
│       ├── addToLibrary.ts
│       ├── addToLibrary.test.ts
│       ├── getUserBookStatus.ts
│       ├── getUserBookStatus.test.ts
│       ├── types.ts
│       └── index.ts
├── components/
│   └── features/
│       └── books/                # UPDATED - Add new components
│           ├── AddToLibraryButton.tsx
│           ├── AddToLibraryButton.test.tsx
│           ├── ReadingStatusSelector.tsx
│           ├── ReadingStatusSelector.test.tsx
│           ├── ... (existing from 2.1)
│           ├── types.ts          # Updated
│           └── index.ts          # Updated
├── hooks/
│   ├── useUserLibrary.ts         # NEW
│   ├── useUserLibrary.test.ts    # NEW
│   └── index.ts                  # Updated
└── types/
    └── database.ts               # Updated with Book, UserBook types
```

**Import Alias Enforcement:**
```typescript
// ALWAYS use @/* for cross-boundary imports
import { addToLibrary } from '@/actions/books';
import { AddToLibraryButton } from '@/components/features/books';
import { useUserLibrary } from '@/hooks';
import { prisma } from '@/lib/prisma';
import type { Book, UserBook, ReadingStatus } from '@prisma/client';

// NEVER use relative imports across boundaries
// Relative imports OK within same feature folder
import { ReadingStatusSelector } from './ReadingStatusSelector';
```

### Server Action Pattern - CRITICAL

**ActionResult Type (from Architecture):**
```typescript
// src/types/api.ts - This pattern MUST be followed
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**addToLibrary Server Action:**
```typescript
// src/actions/books/addToLibrary.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { ActionResult } from '@/types/api';
import type { Book, UserBook, ReadingStatus } from '@prisma/client';

// Input validation schema
const addToLibrarySchema = z.object({
  // Book data from search result
  title: z.string().min(1),
  authors: z.array(z.string()).min(1),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  coverUrl: z.string().url().optional(),
  pageCount: z.number().int().positive().optional(),
  publishedYear: z.number().int().optional(),
  description: z.string().optional(),
  // Status selection
  status: z.enum(['CURRENTLY_READING', 'FINISHED', 'WANT_TO_READ']),
});

export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;

export interface UserBookWithBook extends UserBook {
  book: Book;
}

export async function addToLibrary(
  input: AddToLibraryInput
): Promise<ActionResult<UserBookWithBook>> {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to add books' };
    }

    const validated = addToLibrarySchema.parse(input);

    // Upsert book by ISBN (prefer ISBN-13, fall back to ISBN-10)
    const bookWhere = validated.isbn13
      ? { isbn13: validated.isbn13 }
      : validated.isbn10
      ? { isbn10: validated.isbn10 }
      : undefined;

    let book: Book;

    if (bookWhere) {
      // Try to find existing book by ISBN
      book = await prisma.book.upsert({
        where: bookWhere,
        create: {
          isbn10: validated.isbn10,
          isbn13: validated.isbn13,
          title: validated.title,
          author: validated.authors.join(', '),
          coverUrl: validated.coverUrl,
          pageCount: validated.pageCount,
          publishedYear: validated.publishedYear,
          description: validated.description,
        },
        update: {
          // Update cover/description if they were missing
          coverUrl: validated.coverUrl,
          pageCount: validated.pageCount,
          description: validated.description,
        },
      });
    } else {
      // No ISBN - create new book (rare case)
      book = await prisma.book.create({
        data: {
          title: validated.title,
          author: validated.authors.join(', '),
          coverUrl: validated.coverUrl,
          pageCount: validated.pageCount,
          publishedYear: validated.publishedYear,
          description: validated.description,
        },
      });
    }

    // Check if user already has this book
    const existingUserBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: book.id,
        },
      },
    });

    if (existingUserBook) {
      return { success: false, error: 'This book is already in your library' };
    }

    // Create UserBook record
    const userBook = await prisma.userBook.create({
      data: {
        userId: session.user.id,
        bookId: book.id,
        status: validated.status as ReadingStatus,
        progress: validated.status === 'FINISHED' ? 100 : 0,
        dateFinished: validated.status === 'FINISHED' ? new Date() : null,
      },
      include: {
        book: true,
      },
    });

    return { success: true, data: userBook };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid book data' };
    }
    console.error('Failed to add book to library:', error);
    return { success: false, error: 'Failed to add book to library' };
  }
}
```

**getUserBookStatus Server Action:**
```typescript
// src/actions/books/getUserBookStatus.ts
'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { ActionResult } from '@/types/api';
import type { UserBook, Book, ReadingStatus } from '@prisma/client';

export interface UserBookStatus {
  isInLibrary: boolean;
  status?: ReadingStatus;
  progress?: number;
  userBook?: UserBook & { book: Book };
}

export async function getUserBookStatus(
  isbn: string
): Promise<ActionResult<UserBookStatus>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: true, data: { isInLibrary: false } };
    }

    // Find book by ISBN
    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { isbn10: isbn },
          { isbn13: isbn },
        ],
      },
    });

    if (!book) {
      return { success: true, data: { isInLibrary: false } };
    }

    // Check if user has this book
    const userBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: session.user.id,
          bookId: book.id,
        },
      },
      include: {
        book: true,
      },
    });

    if (!userBook) {
      return { success: true, data: { isInLibrary: false } };
    }

    return {
      success: true,
      data: {
        isInLibrary: true,
        status: userBook.status,
        progress: userBook.progress,
        userBook,
      },
    };
  } catch (error) {
    console.error('Failed to get user book status:', error);
    return { success: false, error: 'Failed to check library status' };
  }
}
```

### UI/UX Specifications (from UX Design Spec)

**Reading Status Labels (User-Friendly):**
```typescript
export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  CURRENTLY_READING: 'Currently Reading',
  FINISHED: 'Finished',
  WANT_TO_READ: 'Want to Read',
};

export const READING_STATUS_ICONS: Record<ReadingStatus, LucideIcon> = {
  CURRENTLY_READING: BookOpen,
  FINISHED: CheckCircle,
  WANT_TO_READ: BookMarked,
};
```

**AddToLibraryButton Component:**
```typescript
// src/components/features/books/AddToLibraryButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { Check, Plus, ChevronDown, BookOpen, CheckCircle, BookMarked, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { addToLibrary } from '@/actions/books';
import type { BookSearchResult } from '@/services/books/types';
import type { ReadingStatus } from '@prisma/client';

interface AddToLibraryButtonProps {
  book: BookSearchResult;
  isInLibrary?: boolean;
  currentStatus?: ReadingStatus;
  onStatusChange?: (status: ReadingStatus) => void;
  className?: string;
}

const STATUSES = [
  { value: 'CURRENTLY_READING', label: 'Currently Reading', icon: BookOpen },
  { value: 'FINISHED', label: 'Finished', icon: CheckCircle },
  { value: 'WANT_TO_READ', label: 'Want to Read', icon: BookMarked },
] as const;

export function AddToLibraryButton({
  book,
  isInLibrary = false,
  currentStatus,
  onStatusChange,
  className,
}: AddToLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleStatusSelect = (status: ReadingStatus) => {
    setOpen(false);

    startTransition(async () => {
      const result = await addToLibrary({
        title: book.title,
        authors: book.authors,
        isbn10: book.isbn10,
        isbn13: book.isbn13,
        coverUrl: book.coverUrl,
        pageCount: book.pageCount,
        publishedYear: book.publishedYear,
        description: book.description,
        status,
      });

      if (result.success) {
        const statusLabel = STATUSES.find(s => s.value === status)?.label;
        toast.success(`Added to ${statusLabel}`);
        onStatusChange?.(status);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isInLibrary && currentStatus) {
    const statusInfo = STATUSES.find(s => s.value === currentStatus);
    const StatusIcon = statusInfo?.icon || BookOpen;

    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('gap-2', className)}
        disabled
      >
        <Check className="h-4 w-4 text-green-600" />
        <StatusIcon className="h-4 w-4" />
        <span className="text-xs">{statusInfo?.label}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={cn('gap-2', className)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add to Library
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          {STATUSES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleStatusSelect(value as ReadingStatus)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Updated BookSearchResult with Add Button:**
```typescript
// src/components/features/books/BookSearchResult.tsx - ADD these changes
import { AddToLibraryButton } from './AddToLibraryButton';
import type { ReadingStatus } from '@prisma/client';

interface BookSearchResultProps {
  book: BookSearchResult;
  isInLibrary?: boolean;
  currentStatus?: ReadingStatus;
  onAdd?: (status: ReadingStatus) => void;
  onClick?: () => void;
}

export function BookSearchResult({
  book,
  isInLibrary,
  currentStatus,
  onAdd,
  onClick,
}: BookSearchResultProps) {
  // ... existing render code ...

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
      onClick={onClick}
    >
      {/* Book cover */}
      <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
        {/* ... existing cover code ... */}
      </div>

      {/* Book info */}
      <div className="flex-1 min-w-0">
        {/* ... existing info code ... */}
      </div>

      {/* Add to Library button */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <AddToLibraryButton
          book={book}
          isInLibrary={isInLibrary}
          currentStatus={currentStatus}
          onStatusChange={onAdd}
        />
      </div>
    </div>
  );
}
```

**Toast Pattern (from UX Design Spec):**
```typescript
// Success toast for adding book
toast.success(`Added to ${statusLabel}`, {
  duration: 4000,
});

// Error toast with retry
toast.error('Failed to add book', {
  action: {
    label: 'Retry',
    onClick: () => handleStatusSelect(status),
  },
});
```

### Optimistic UI Pattern - CRITICAL

**useUserLibrary Hook with Optimistic Updates:**
```typescript
// src/hooks/useUserLibrary.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { getUserBookStatus } from '@/actions/books';
import type { ReadingStatus } from '@prisma/client';

interface LibraryBook {
  isbn: string;
  status: ReadingStatus;
  progress: number;
}

interface UseUserLibraryReturn {
  libraryBooks: Map<string, LibraryBook>;
  isLoading: boolean;
  error: string | null;
  isInLibrary: (isbn: string) => boolean;
  getStatus: (isbn: string) => ReadingStatus | undefined;
  addOptimistic: (isbn: string, status: ReadingStatus) => void;
  removeOptimistic: (isbn: string) => void;
  checkBookStatus: (isbn: string) => Promise<void>;
}

export function useUserLibrary(): UseUserLibraryReturn {
  const [libraryBooks, setLibraryBooks] = useState<Map<string, LibraryBook>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInLibrary = useCallback(
    (isbn: string) => libraryBooks.has(isbn),
    [libraryBooks]
  );

  const getStatus = useCallback(
    (isbn: string) => libraryBooks.get(isbn)?.status,
    [libraryBooks]
  );

  // Optimistic add - immediately update state
  const addOptimistic = useCallback((isbn: string, status: ReadingStatus) => {
    setLibraryBooks((prev) => {
      const next = new Map(prev);
      next.set(isbn, {
        isbn,
        status,
        progress: status === 'FINISHED' ? 100 : 0,
      });
      return next;
    });
  }, []);

  // Rollback on error
  const removeOptimistic = useCallback((isbn: string) => {
    setLibraryBooks((prev) => {
      const next = new Map(prev);
      next.delete(isbn);
      return next;
    });
  }, []);

  // Check status for a specific book
  const checkBookStatus = useCallback(async (isbn: string) => {
    const result = await getUserBookStatus(isbn);
    if (result.success && result.data.isInLibrary && result.data.status) {
      setLibraryBooks((prev) => {
        const next = new Map(prev);
        next.set(isbn, {
          isbn,
          status: result.data.status!,
          progress: result.data.progress || 0,
        });
        return next;
      });
    }
  }, []);

  return {
    libraryBooks,
    isLoading,
    error,
    isInLibrary,
    getStatus,
    addOptimistic,
    removeOptimistic,
    checkBookStatus,
  };
}
```

### Previous Story Learnings - CRITICAL

**From Story 2.1 (Book Search):**
- Book search components exist in `src/components/features/books/`
- `BookSearchResult.tsx` displays individual results - needs update for add button
- `BookSearch.tsx` manages search state - needs to pass library status
- Services in `src/services/books/` with `BookSearchResult` type
- 300ms debounce pattern for search
- Skeleton loading pattern established

**From Story 1.4 (Profile Management):**
- Toast notifications via sonner: `toast.success()`, `toast.error()`
- Server action pattern with `ActionResult<T>` type
- Zod schemas for validation
- Feature components use `types.ts` + `index.ts` pattern

**From Story 1.5 (Bottom Navigation):**
- Layout components in `src/components/layout/`
- Library tab exists in bottom nav (will be updated in future story)
- Framer Motion helpers in `src/lib/motion.ts`

**Existing Code to Reference:**
- `src/services/books/types.ts` - BookSearchResult type
- `src/components/features/books/BookSearchResult.tsx` - Current component
- `src/actions/profile/updateProfile.ts` - Server action pattern
- `src/hooks/useDebounce.ts` - Custom hook pattern

### Git Intelligence Summary

**Recent Commits:**
```
afabb56 feat: Implement book search via external APIs (Story 2.1)
928eb9d fix: Configure Google OAuth image support
87faaec fix: Complete Story 1.1 and Epic 1 with code review fixes
```

**Patterns Established:**
- Feature commits with `feat:` prefix
- Story reference in commit message
- Co-located test files with `.test.tsx` extension
- Server action pattern with ActionResult return type

### Testing Strategy

**Unit Tests (Vitest + React Testing Library):**
- `addToLibrary` action: validates input, creates book, creates userBook
- `getUserBookStatus` action: returns correct status, handles missing books
- `AddToLibraryButton`: renders states (not in library, in library)
- `ReadingStatusSelector`: renders all options, handles selection
- `useUserLibrary` hook: optimistic updates, rollback

**Integration Tests:**
- Search result shows "Add" button for new books
- Search result shows checkmark for library books
- Clicking status adds book and shows toast
- Error handling rolls back optimistic update

**Manual Testing Checklist:**
- [ ] Search for a book and see "Add to Library" button
- [ ] Click button and see status dropdown
- [ ] Select "Currently Reading" and see success toast
- [ ] Book shows checkmark in search results
- [ ] Search for same book again - shows status, not add button
- [ ] Test with book that has no ISBN
- [ ] Test error state (disconnect network)
- [ ] Verify touch targets are 44px+

### Dependencies

**Already Installed:**
- `@prisma/client` - Database ORM
- `zod` - Validation
- `sonner` - Toast notifications
- `lucide-react` - Icons
- shadcn/ui components - Button, Popover

**No New Dependencies Required**

### Database Migration Notes

**CRITICAL: This is the first story adding Book/UserBook tables**

Migration command:
```bash
npx prisma migrate dev --name add_books_and_user_books
```

After migration:
```bash
npx prisma generate
```

Verify the migration:
```bash
npx prisma studio
```

### Error Handling - CRITICAL

**Server Action Errors:**
```typescript
// Validation error
if (error instanceof z.ZodError) {
  return { success: false, error: 'Invalid book data' };
}

// Duplicate entry (user already has book)
if (existingUserBook) {
  return { success: false, error: 'This book is already in your library' };
}

// Auth error
if (!session?.user?.id) {
  return { success: false, error: 'You must be logged in to add books' };
}

// Generic error
return { success: false, error: 'Failed to add book to library' };
```

**Client-Side Error Handling:**
```typescript
const result = await addToLibrary(input);

if (result.success) {
  toast.success(`Added to ${statusLabel}`);
  onStatusChange?.(status);
} else {
  toast.error(result.error);
  // Rollback optimistic update if applicable
  removeOptimistic(book.isbn13 || book.isbn10 || '');
}
```

### Project Structure Notes

**Alignment with Architecture:**
- Server actions in `src/actions/books/` (new folder)
- Database schema follows Prisma conventions (snake_case in DB, camelCase in code)
- Components follow feature folder pattern
- Uses `@/` import alias consistently
- Co-located tests with source files

**This story creates foundation for:**
- Story 2.3: Book Detail Page (shows library status)
- Story 2.4: Update Reading Status (modifies UserBook)
- Story 2.5: Remove Book from Library (deletes UserBook)
- Story 2.6: Library View (displays UserBooks by status)

### References

- [Source: architecture.md#Data Architecture] - Prisma schema patterns
- [Source: architecture.md#API & Communication Patterns] - Server Actions, ActionResult type
- [Source: architecture.md#Implementation Patterns] - Component structure, naming conventions
- [Source: architecture.md#Project Structure] - File organization
- [Source: ux-design-specification.md#UX Consistency Patterns] - Toast patterns, button hierarchy
- [Source: ux-design-specification.md#Microinteraction Patterns] - Optimistic UI
- [Source: ux-design-specification.md#Accessibility] - 44px touch targets
- [Source: epic-2#Story 2.2] - Acceptance criteria, user story
- [Source: 2-1-book-search-via-external-apis.md] - Previous story patterns, existing components

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Database migration created manually as `prisma migrate dev` failed (P1000 Authentication error - DB not running)
- `prisma generate` succeeded to update TypeScript types
- Popover shadcn component was missing; added via `npx shadcn@latest add popover -y`

### Completion Notes List

- All 9 tasks completed with comprehensive test coverage
- 313 tests passing (28 test files)
- Lint passes with only 2 pre-existing warnings (not from this story)
- Database schema created with proper indexes and relations
- Server actions follow ActionResult<T> pattern per architecture
- Components use shadcn/ui Popover for status dropdown
- Touch targets meet 44px accessibility requirement
- Integration tests cover all acceptance criteria

### Code Review Fixes (2026-02-05)

**Issues fixed by adversarial code review:**
1. Added test for database error logging in `addToLibrary.test.ts`
2. Fixed AC #3 - AddToLibraryButton now clickable when book is in library (enables "tap to view book")
3. Removed duplicate type export in `src/actions/books/index.ts`
4. Extracted duplicate STATUSES constant to shared `READING_STATUS_OPTIONS` in `types.ts`
5. Updated ReadingStatusSelector to use Lucide Check icon instead of emoji checkmark

### File List

**Created:**
- `prisma/migrations/20260205160500_add_books_and_user_books/migration.sql` - Database migration
- `src/actions/books/types.ts` - Server action types
- `src/actions/books/addToLibrary.ts` - Add to library server action
- `src/actions/books/addToLibrary.test.ts` - Server action tests (8 tests)
- `src/actions/books/getUserBookStatus.ts` - Get user book status query
- `src/actions/books/getUserBookStatus.test.ts` - Query tests (9 tests)
- `src/actions/books/index.ts` - Exports
- `src/components/features/books/AddToLibraryButton.tsx` - Add to library button component
- `src/components/features/books/AddToLibraryButton.test.tsx` - Button tests (12 tests)
- `src/components/features/books/ReadingStatusSelector.tsx` - Status selector component
- `src/components/features/books/ReadingStatusSelector.test.tsx` - Selector tests (10 tests)
- `src/components/features/books/BookSearchWithLibrary.test.tsx` - Integration tests (13 tests)
- `src/components/ui/popover.tsx` - shadcn Popover component (auto-generated)
- `src/hooks/useUserLibrary.ts` - Library state management hook
- `src/hooks/useUserLibrary.test.ts` - Hook tests (13 tests)
- `src/types/database.ts` - Database type re-exports

**Modified:**
- `prisma/schema.prisma` - Added ReadingStatus enum, Book model, UserBook model, User relation
- `src/components/features/books/BookSearchResult.tsx` - Added AddToLibraryButton integration
- `src/components/features/books/BookSearchResult.test.tsx` - Updated tests (19 tests)
- `src/components/features/books/BookSearch.test.tsx` - Added mocks for new dependencies
- `src/components/features/books/types.ts` - Added shared READING_STATUS_OPTIONS and helper functions
- `src/components/features/books/index.ts` - Added new component exports
- `src/hooks/index.ts` - Added useUserLibrary export
- `src/types/index.ts` - Added database type exports
- `package.json` - Updated dependencies (shadcn popover)
- `package-lock.json` - Lock file updated

