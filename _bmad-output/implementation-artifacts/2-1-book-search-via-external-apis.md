# Story 2.1: Book Search via External APIs

Status: done

## Story

As a **user**,
I want **to search for books by title, author, or ISBN**,
So that **I can find books to add to my library**.

## Acceptance Criteria

1. **Given** I am logged in **When** I navigate to the Search tab **Then** I see a search input with placeholder "Search by title, author, or ISBN" **And** the input is focused automatically on mobile

2. **Given** I am on the search page **When** I type at least 3 characters **Then** search results appear after 300ms debounce **And** I see a loading skeleton while fetching **And** results show book cover, title, author, and publication year

3. **Given** I search for a book **When** results are returned from OpenLibrary API **Then** I see up to 20 results **And** if OpenLibrary fails, Google Books API is used as fallback **And** results are deduplicated by ISBN when possible

4. **Given** I search by ISBN (10 or 13 digit) **When** results are returned **Then** the exact match appears first **And** the ISBN is validated before search

5. **Given** my search returns no results **When** the search completes **Then** I see "No books found for '[query]'" message **And** I see suggestions to try different search terms

6. **Given** the search API fails **When** the error occurs **Then** I see a friendly error message with retry option **And** the error is logged to Sentry

## Tasks / Subtasks

- [x] **Task 1: Create Book Search Services** (AC: #3, #4)
  - [x] Create `src/services/books/openLibrary.ts` - OpenLibrary API client
  - [x] Create `src/services/books/googleBooks.ts` - Google Books API client (fallback)
  - [x] Create `src/services/books/index.ts` - Unified search service with fallback logic
  - [x] Create `src/services/books/types.ts` - Shared book search types
  - [x] Implement ISBN-10/ISBN-13 validation function
  - [x] Implement deduplication by ISBN logic
  - [x] Add User-Agent header per OpenLibrary rate limiting guidance
  - [x] Write co-located tests for all service functions

- [x] **Task 2: Create API Route for Book Search** (AC: #3, #4)
  - [x] Create `src/app/api/books/search/route.ts` - Book search API endpoint
  - [x] Implement query parameter validation with Zod
  - [x] Handle OpenLibrary → Google Books fallback
  - [x] Return standardized book response format
  - [x] Add error handling with proper status codes
  - [x] Write co-located test file

- [x] **Task 3: Create BookSearchInput Component** (AC: #1, #2)
  - [x] Create `src/components/features/books/BookSearchInput.tsx`
  - [x] Implement search input with shadcn/ui Input component
  - [x] Add placeholder "Search by title, author, or ISBN"
  - [x] Implement 300ms debounce using custom hook
  - [x] Add autofocus on mobile (viewport < 768px)
  - [x] Add keyboard accessibility (Enter to search)
  - [x] Create co-located test file

- [x] **Task 4: Create BookSearchResult Component** (AC: #2)
  - [x] Create `src/components/features/books/BookSearchResult.tsx`
  - [x] Display book cover (with fallback placeholder)
  - [x] Display title, author(s), publication year
  - [x] Style with Warm Hearth palette
  - [x] Add hover/focus states
  - [x] Ensure 44px minimum touch target
  - [x] Create co-located test file

- [x] **Task 5: Create BookSearchResultSkeleton Component** (AC: #2)
  - [x] Create `src/components/features/books/BookSearchResultSkeleton.tsx`
  - [x] Match layout of BookSearchResult
  - [x] Use shadcn/ui Skeleton component
  - [x] Create co-located test file

- [x] **Task 6: Create BookSearch Container Component** (AC: all)
  - [x] Create `src/components/features/books/BookSearch.tsx`
  - [x] Compose BookSearchInput, results list, and empty/error states
  - [x] Implement data fetching with proper loading states
  - [x] Handle search state (idle, loading, success, error, empty)
  - [x] Limit display to 20 results
  - [x] Create co-located test file

- [x] **Task 7: Create Empty/Error State Components** (AC: #5, #6)
  - [x] Create `src/components/features/books/BookSearchEmpty.tsx`
  - [x] Create `src/components/features/books/BookSearchError.tsx`
  - [x] Display "No books found for '[query]'" with suggestions
  - [x] Display friendly error with retry button
  - [x] Create co-located tests

- [x] **Task 8: Create Books Feature Index** (AC: all)
  - [x] Create `src/components/features/books/types.ts` for component types
  - [x] Create `src/components/features/books/index.ts` with re-exports

- [x] **Task 9: Implement Search Page** (AC: #1, #2)
  - [x] Update `src/app/(main)/search/page.tsx`
  - [x] Replace stub with BookSearch component
  - [x] Ensure proper integration with AppShell
  - [x] Test page title displays correctly

- [x] **Task 10: Create Custom useDebounce Hook** (AC: #2)
  - [x] Create `src/hooks/useDebounce.ts`
  - [x] Implement 300ms debounce by default
  - [x] Add to `src/hooks/index.ts` exports
  - [x] Write co-located test file

- [x] **Task 11: Write Integration Tests** (AC: all)
  - [x] Test search input triggers search after debounce
  - [x] Test loading skeleton displays during fetch
  - [x] Test results display correctly
  - [x] Test empty state displays for no results
  - [x] Test error state displays with retry
  - [x] Test ISBN search prioritizes exact match
  - [x] Test autofocus on mobile viewport

## Dev Notes

### Architecture Compliance - CRITICAL

**File Organization (from Architecture):**
```
src/
├── app/
│   ├── (main)/
│   │   └── search/page.tsx          # Updated with BookSearch
│   └── api/
│       └── books/
│           └── search/route.ts      # NEW - Book search API
├── components/
│   └── features/
│       └── books/                   # NEW - Books feature folder
│           ├── BookSearch.tsx
│           ├── BookSearch.test.tsx
│           ├── BookSearchInput.tsx
│           ├── BookSearchInput.test.tsx
│           ├── BookSearchResult.tsx
│           ├── BookSearchResult.test.tsx
│           ├── BookSearchResultSkeleton.tsx
│           ├── BookSearchResultSkeleton.test.tsx
│           ├── BookSearchEmpty.tsx
│           ├── BookSearchEmpty.test.tsx
│           ├── BookSearchError.tsx
│           ├── BookSearchError.test.tsx
│           ├── types.ts
│           └── index.ts
├── services/                        # NEW - External API clients
│   └── books/
│       ├── openLibrary.ts
│       ├── openLibrary.test.ts
│       ├── googleBooks.ts
│       ├── googleBooks.test.ts
│       ├── types.ts
│       └── index.ts
└── hooks/
    ├── useDebounce.ts               # NEW
    ├── useDebounce.test.ts          # NEW
    └── index.ts                     # Updated
```

**Import Alias Enforcement:**
```typescript
// ALWAYS use @/* for cross-boundary imports
import { BookSearch } from '@/components/features/books';
import { searchBooks } from '@/services/books';
import { useDebounce } from '@/hooks';
import { cn } from '@/lib/utils';

// NEVER use relative imports across boundaries
// Relative imports OK within same feature folder
import { BookSearchResult } from './BookSearchResult';
```

**Component File Structure (from Architecture):**
```typescript
// Standard component file structure (in order):

// 1. Imports (external, then internal with @/ alias)
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces (component-specific)
interface BookSearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

// 3. Component function (named export)
export function BookSearchInput({ onSearch, isLoading, placeholder }: BookSearchInputProps) {
  // hooks first
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // effects
  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  // handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // render
  return (
    // ...
  );
}
```

### API Architecture - CRITICAL

**OpenLibrary API (Primary):**
```typescript
// Search endpoint
const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

// Search by title/author/isbn
// GET https://openlibrary.org/search.json?q=the+lord+of+the+rings&limit=20

// Response structure
interface OpenLibrarySearchResponse {
  start: number;
  num_found: number;
  docs: OpenLibraryDoc[];
}

interface OpenLibraryDoc {
  key: string;           // "/works/OL82586W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;      // Cover ID for image URL
  isbn?: string[];
  edition_count?: number;
}

// Cover URL construction
const coverUrl = (coverId: number, size: 'S' | 'M' | 'L') =>
  `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;

// IMPORTANT: Add User-Agent header
const headers = {
  'User-Agent': 'FlappyBird1/1.0 (contact@example.com)'
};
```

**Google Books API (Fallback):**
```typescript
// Search endpoint
const GOOGLE_BOOKS_SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes';

// Search by title/author/isbn
// GET https://www.googleapis.com/books/v1/volumes?q=search+terms&maxResults=20

// Special keywords: intitle:, inauthor:, isbn:
// GET https://www.googleapis.com/books/v1/volumes?q=isbn:9780544003415

// Response structure
interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: 'ISBN_10' | 'ISBN_13' | 'OTHER';
      identifier: string;
    }>;
    pageCount?: number;
    description?: string;
  };
}

// No API key required for basic search (unauthenticated)
// Rate limits: 1000 requests/day without key
```

**Unified Book Type:**
```typescript
// src/services/books/types.ts
export interface BookSearchResult {
  id: string;              // Unique identifier (OpenLibrary key or Google ID)
  source: 'openlibrary' | 'googlebooks';
  title: string;
  authors: string[];
  publishedYear?: number;
  coverUrl?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  description?: string;
}

export interface BookSearchResponse {
  results: BookSearchResult[];
  totalFound: number;
  source: 'openlibrary' | 'googlebooks';
}
```

**Fallback Logic:**
```typescript
// src/services/books/index.ts
export async function searchBooks(query: string): Promise<BookSearchResponse> {
  try {
    // Try OpenLibrary first
    const results = await searchOpenLibrary(query);
    return { ...results, source: 'openlibrary' };
  } catch (error) {
    console.error('OpenLibrary failed, falling back to Google Books:', error);

    // Fall back to Google Books
    const results = await searchGoogleBooks(query);
    return { ...results, source: 'googlebooks' };
  }
}
```

### ISBN Validation - CRITICAL

```typescript
// src/services/books/validation.ts

/**
 * Validates ISBN-10 using modulus 11 checksum
 */
export function isValidISBN10(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^[\dX]{10}$/i.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }
  const check = cleaned[9].toUpperCase();
  sum += check === 'X' ? 10 : parseInt(check, 10);

  return sum % 11 === 0;
}

/**
 * Validates ISBN-13 using modulus 10 checksum
 */
export function isValidISBN13(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;

  return parseInt(cleaned[12], 10) === check;
}

/**
 * Detects if query looks like an ISBN
 */
export function detectISBN(query: string): { isISBN: boolean; type?: 'ISBN10' | 'ISBN13' } {
  const cleaned = query.replace(/[-\s]/g, '');

  if (cleaned.length === 10 && isValidISBN10(cleaned)) {
    return { isISBN: true, type: 'ISBN10' };
  }
  if (cleaned.length === 13 && isValidISBN13(cleaned)) {
    return { isISBN: true, type: 'ISBN13' };
  }

  return { isISBN: false };
}
```

### Deduplication Logic

```typescript
// Deduplicate results by ISBN, preferring OpenLibrary
export function deduplicateResults(results: BookSearchResult[]): BookSearchResult[] {
  const seen = new Map<string, BookSearchResult>();

  for (const book of results) {
    // Create a key from ISBNs (prefer ISBN-13)
    const key = book.isbn13 || book.isbn10 || `title:${book.title.toLowerCase()}`;

    if (!seen.has(key)) {
      seen.set(key, book);
    }
  }

  return Array.from(seen.values());
}
```

### UI/UX Specifications (from UX Design Spec)

**Search Pattern (from UX):**
| State | Behavior |
|-------|----------|
| Empty | Placeholder text "Search by title, author, or ISBN" |
| Active | Debounced search (300ms) |
| Results | Grouped with book cover, title, author, year |
| No results | Helpful message + suggestions |
| Loading | Skeleton results |

**Search Input Styling:**
```typescript
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    ref={inputRef}
    type="text"
    placeholder="Search by title, author, or ISBN"
    value={query}
    onChange={handleChange}
    className="pl-10 h-12"  // 48px height for touch
    autoFocus={isMobile}
  />
  {isLoading && (
    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
  )}
</div>
```

**Search Result Card Styling:**
```typescript
<div className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer min-h-[72px]">
  {/* Book cover */}
  <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden">
    {coverUrl ? (
      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
    )}
  </div>

  {/* Book info */}
  <div className="flex-1 min-w-0">
    <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
    <p className="text-xs text-muted-foreground line-clamp-1">{authors.join(', ')}</p>
    {publishedYear && (
      <p className="text-xs text-muted-foreground">{publishedYear}</p>
    )}
  </div>
</div>
```

**Empty State:**
```typescript
<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
  <Search className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="font-medium text-lg mb-2">No books found for "{query}"</h3>
  <p className="text-sm text-muted-foreground max-w-sm">
    Try searching with different keywords, or check the spelling of the title or author name.
  </p>
</div>
```

**Error State:**
```typescript
<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
  <h3 className="font-medium text-lg mb-2">Something went wrong</h3>
  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
    We couldn't search for books right now. Please try again.
  </p>
  <Button onClick={onRetry} variant="outline">
    <RefreshCw className="h-4 w-4 mr-2" />
    Try again
  </Button>
</div>
```

### Error Handling - CRITICAL

**API Route Error Handling:**
```typescript
// src/app/api/books/search/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchBooks } from '@/services/books';

const searchSchema = z.object({
  q: z.string().min(3).max(200),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const validated = searchSchema.parse({ q: query });

    const results = await searchBooks(validated.q);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid search query', details: error.errors } },
        { status: 400 }
      );
    }

    // Log to Sentry (when configured)
    // Sentry.captureException(error);
    console.error('Book search error:', error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to search books' } },
      { status: 500 }
    );
  }
}
```

**Error Response Format (from Architecture):**
```typescript
interface ApiError {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, string[]>;
  }
}
```

### Debounce Hook Implementation

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### Previous Story Learnings - CRITICAL

**From Story 1.5 (Bottom Navigation & App Shell):**
- Layout components in `src/components/layout/`
- AppShell handles page composition with PageHeader + BottomNav
- Framer Motion helpers in `src/lib/motion.ts`
- `useMediaQuery` and `useReducedMotion` hooks available
- Search page stub exists at `src/app/(main)/search/page.tsx`

**From Story 1.4 (Profile Management):**
- shadcn/ui components in `src/components/ui/`
- Toast notifications via sonner (`toast.success()`, `toast.error()`)
- Feature components use `types.ts` + `index.ts` pattern
- Co-located tests with `.test.tsx` extension
- Zod schemas for validation

**Existing Files to Reference:**
- `src/app/(main)/search/page.tsx` - Current stub (will be replaced)
- `src/components/layout/AppShell.tsx` - Page composition pattern
- `src/components/features/profile/ProfileForm.tsx` - Form component pattern
- `src/lib/utils.ts` - Utility functions including `cn()`
- `src/hooks/index.ts` - Hook exports pattern

### Git Intelligence Summary

**Recent Commits:**
```
928eb9d fix: Configure Google OAuth image support
87faaec fix: Complete Story 1.1 and Epic 1 with code review fixes
aac16a4 fix: Resolve code review issues for Story 1.4
671f6a2 fix: Resolve code review issues for Story 1.5
781401c feat: Add bottom navigation and app shell (Story 1.5)
```

**Patterns Established:**
- Feature commits with `feat:` prefix
- Story reference in commit message
- Co-located test files with `.test.tsx` extension
- Component composition patterns with shadcn/ui base

**Files Created in Epic 1:**
- All layout components (`BottomNav`, `PageHeader`, `AppShell`, `SideNav`)
- Profile components (`ProfileForm`, `ProfileView`, `ProfileHeader`)
- Auth components (`OAuthButtons`)
- Motion utilities (`src/lib/motion.ts`)
- Media query hooks

### Testing Strategy

**Unit Tests (Vitest + React Testing Library):**
- Service functions: `searchOpenLibrary`, `searchGoogleBooks`, `searchBooks`
- ISBN validation: `isValidISBN10`, `isValidISBN13`, `detectISBN`
- `useDebounce` hook behavior
- BookSearchInput renders and triggers search
- BookSearchResult displays book data correctly
- BookSearchEmpty shows query and suggestions
- BookSearchError shows retry button

**Integration Tests:**
- Full search flow: type query → debounce → API call → display results
- Empty state displays when no results
- Error state displays on API failure with retry
- ISBN search shows exact match first
- Loading skeleton displays during fetch

**Manual Testing Checklist:**
- [ ] Search input has correct placeholder
- [ ] Input autofocuses on mobile viewport
- [ ] Search triggers after 300ms debounce
- [ ] Loading skeleton appears while fetching
- [ ] Results show cover, title, author, year
- [ ] Up to 20 results display
- [ ] No results shows helpful message
- [ ] API error shows friendly message with retry
- [ ] Retry button triggers new search
- [ ] ISBN search shows exact match first
- [ ] Results are deduplicated
- [ ] Touch targets are at least 44px
- [ ] Keyboard navigation works

### Dependencies

**Already Installed (from package.json):**
- `zod` - For API input validation
- `lucide-react` - For icons (Search, Loader2, BookOpen, AlertCircle, RefreshCw)
- `sonner` - For toast notifications
- shadcn/ui components - Input, Button, Skeleton

**No New Dependencies Required**

### API Rate Limiting Considerations

**OpenLibrary:**
- No hard rate limit, but requires User-Agent header
- Be respectful: don't make bulk downloads
- Cache results when possible

**Google Books:**
- 1000 requests/day without API key
- Consider adding API key for production if needed
- Serves as fallback, so volume should be low

### Project Structure Notes

**Alignment with Architecture:**
- Books feature components in `src/components/features/books/`
- Book services in `src/services/books/`
- API route in `src/app/api/books/search/`
- Uses `@/` import alias consistently
- Co-located tests with source files
- Feature index with re-exports

**This is Epic 2's first story** - establishes book search foundation for:
- Story 2.2: Add Book to Library (uses search results)
- Story 2.3: Book Detail Page (navigates from search)
- Story 2.6: Library View & Organization (similar card patterns)

### References

- [Source: architecture.md#Project Structure] - Component and service locations
- [Source: architecture.md#Implementation Patterns] - Component structure, naming conventions
- [Source: architecture.md#API & Communication Patterns] - API route patterns, error handling
- [Source: ux-design-specification.md#UX Consistency Patterns] - Search pattern, form patterns
- [Source: ux-design-specification.md#Empty State Patterns] - Empty state design
- [Source: ux-design-specification.md#Loading State Patterns] - Skeleton loading
- [Source: ux-design-specification.md#Accessibility] - 44px touch targets, keyboard nav
- [Source: epic-2#Story 2.1] - Acceptance criteria, user story
- [Source: 1-5-bottom-navigation-app-shell.md] - Previous story patterns
- [OpenLibrary Search API](https://openlibrary.org/dev/docs/api/search) - API documentation
- [Google Books API](https://developers.google.com/books/docs/v1/using) - API documentation

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

