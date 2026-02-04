# Story 1.4: User Profile Management

Status: review

## Story

As a **user**,
I want **to view and edit my profile information**,
So that **I can personalize my presence on the platform**.

## Acceptance Criteria

1. **Given** I am logged in **When** I navigate to my profile page (/profile) **Then** I see my current name, bio, avatar, and reading preferences **And** I see my account email (read-only) **And** I see when I joined

2. **Given** I am on my profile page **When** I click "Edit Profile" **Then** I can edit my display name (required, max 50 chars) **And** I can edit my bio (optional, max 200 chars) **And** I can set reading preferences (favorite genres - multi-select) **And** I can toggle "Show my reading activity to followers" (default: on)

3. **Given** I have made changes to my profile **When** I click "Save" **Then** my profile is updated immediately (optimistic UI) **And** I see a success toast notification **And** the changes persist after page refresh

4. **Given** I enter invalid data (e.g., empty name, bio too long) **When** I try to save **Then** I see inline validation errors **And** the save is prevented until errors are fixed

## Tasks / Subtasks

- [x] **Task 1: Extend User Model in Prisma Schema** (AC: #1, #2)
  - [x] Add `favoriteGenres` field (String[] for multi-select genres)
  - [x] Add `showReadingActivity` field (Boolean, default true)
  - [x] Create and run migration
  - [x] Update Prisma client types

- [x] **Task 2: Create Profile Zod Validation Schemas** (AC: #4)
  - [x] Create `src/lib/validation/profile.ts`
  - [x] Define `profileSchema` with:
    - `name`: required, 1-50 chars
    - `bio`: optional, max 200 chars
    - `favoriteGenres`: array of strings
    - `showReadingActivity`: boolean
  - [x] Export schema and inferred types

- [x] **Task 3: Create Profile Server Action** (AC: #3, #4)
  - [x] Create `src/actions/profile/updateProfile.ts`
  - [x] Implement `ActionResult<User>` pattern per architecture
  - [x] Validate input with Zod schema
  - [x] Get current user from session (require auth)
  - [x] Update user in database
  - [x] Return success/error response
  - [x] Create `src/actions/profile/index.ts` re-export

- [x] **Task 4: Create Profile Page Route** (AC: #1)
  - [x] Create `src/app/(main)/profile/page.tsx`
  - [x] Protect route with auth middleware (already configured)
  - [x] Fetch current user data on server
  - [x] Pass user data to ProfileView component
  - [x] Add loading.tsx for Suspense boundary

- [x] **Task 5: Create ProfileHeader Component** (AC: #1)
  - [x] Create `src/components/features/profile/ProfileHeader.tsx`
  - [x] Display avatar (using shadcn Avatar component)
  - [x] Display name prominently
  - [x] Display member since date (formatted)
  - [x] Display email (read-only, muted text)
  - [x] Add "Edit Profile" button trigger
  - [x] Create co-located test file

- [x] **Task 6: Create ProfileForm Component** (AC: #2, #3, #4)
  - [x] Create `src/components/features/profile/ProfileForm.tsx`
  - [x] Use react-hook-form with Zod resolver
  - [x] Display name input (required, 50 char limit with counter)
  - [x] Bio textarea (optional, 200 char limit with counter)
  - [x] Genre multi-select (use shadcn MultiSelect or Checkbox group)
  - [x] Activity visibility toggle (Switch component)
  - [x] Submit button with loading state
  - [x] Inline validation error display
  - [x] Create co-located test file

- [x] **Task 7: Create ProfileView Component** (AC: #1, #2, #3)
  - [x] Create `src/components/features/profile/ProfileView.tsx`
  - [x] Compose ProfileHeader + ProfileForm (or read-only view)
  - [x] Implement view/edit mode toggle
  - [x] Handle optimistic UI updates
  - [x] Show success toast on save (use shadcn toast)
  - [x] Handle error states with retry option
  - [x] Create co-located test file

- [x] **Task 8: Create Genre Constants and Types** (AC: #2)
  - [x] Create `src/lib/config/genres.ts`
  - [x] Define `GENRES` constant array with genre options
  - [x] Define `Genre` type
  - [x] Export from `src/lib/config/index.ts`

- [x] **Task 9: Create Profile Feature Index** (AC: all)
  - [x] Create `src/components/features/profile/types.ts` if needed
  - [x] Create `src/components/features/profile/index.ts`
  - [x] Re-export all profile components

- [x] **Task 10: Write Integration Tests** (AC: all)
  - [x] Test profile page renders with user data
  - [x] Test edit mode toggle works
  - [x] Test validation errors display correctly
  - [x] Test successful save flow with toast
  - [x] Test persistence after save

## Dev Notes

### Architecture Compliance - CRITICAL

**File Organization (from Architecture):**
```
src/
├── app/(main)/profile/
│   ├── page.tsx           # Profile page route
│   └── loading.tsx        # Suspense loading state
├── components/features/profile/
│   ├── ProfileHeader.tsx
│   ├── ProfileHeader.test.tsx
│   ├── ProfileForm.tsx
│   ├── ProfileForm.test.tsx
│   ├── ProfileView.tsx
│   ├── ProfileView.test.tsx
│   ├── types.ts
│   └── index.ts           # Re-exports
├── actions/profile/
│   ├── updateProfile.ts
│   └── index.ts
└── lib/
    ├── validation/profile.ts
    └── config/genres.ts
```

**Server Action Pattern (from Architecture):**
```typescript
// ALL Server Actions MUST use this pattern
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateProfile(
  data: ProfileUpdateInput
): Promise<ActionResult<User>> {
  try {
    // Validate with Zod
    const validated = profileSchema.parse(data);

    // Get session - require authentication
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: validated,
    });

    return { success: true, data: user };
  } catch (e) {
    return { success: false, error: 'Failed to update profile' };
  }
}
```

**Import Alias Enforcement:**
```typescript
// ALWAYS use @/* for cross-boundary imports
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { profileSchema } from '@/lib/validation/profile';
import { updateProfile } from '@/actions/profile';

// NEVER use relative imports across boundaries
```

**Form Validation Pattern (from Architecture):**
```typescript
// Use Zod + react-hook-form + @hookform/resolvers/zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, ProfileInput } from '@/lib/validation/profile';

const form = useForm<ProfileInput>({
  resolver: zodResolver(profileSchema),
  defaultValues: {
    name: user.name ?? '',
    bio: user.bio ?? '',
    favoriteGenres: user.favoriteGenres ?? [],
    showReadingActivity: user.showReadingActivity ?? true,
  },
});
```

### Database Schema Updates

**Prisma Schema Changes:**
```prisma
model User {
  // Existing fields...
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerified     Boolean   @default(false) @map("email_verified")
  name              String?
  bio               String?
  avatarUrl         String?   @map("avatar_url")
  applePrivateRelay Boolean   @default(false) @map("apple_private_relay")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // NEW fields for Story 1.4
  favoriteGenres      String[]  @default([]) @map("favorite_genres")
  showReadingActivity Boolean   @default(true) @map("show_reading_activity")

  sessions Session[]
  accounts Account[]

  @@map("users")
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add-profile-fields
```

### Zod Validation Schema

**src/lib/validation/profile.ts:**
```typescript
import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
  bio: z
    .string()
    .max(200, 'Bio must be 200 characters or less')
    .optional()
    .nullable(),
  favoriteGenres: z.array(z.string()).default([]),
  showReadingActivity: z.boolean().default(true),
});

export type ProfileInput = z.infer<typeof profileSchema>;
```

### UI Component Patterns

**Optimistic UI Pattern (from Architecture):**
```typescript
// Profile updates use optimistic + server action
const handleSubmit = async (data: ProfileInput) => {
  // 1. Optimistically update local state
  setUser({ ...user, ...data });

  // 2. Call server action
  const result = await updateProfile(data);

  // 3. Handle result
  if (result.success) {
    toast({ title: 'Profile updated!' });
  } else {
    // Revert on error
    setUser(previousUser);
    toast({ title: 'Failed to update', variant: 'destructive' });
  }
};
```

**Toast Pattern (from UX Spec):**
- Auto-dismiss: 4 seconds
- Position: Top center
- Success: Green accent, checkmark icon
- Error: Red accent, X icon

**Form Field Pattern (from UX Spec):**
- Labels above fields
- Character counters for limited fields
- Inline validation errors below fields
- Validate on blur (not on keystroke)

### Genre Options

**Suggested Genre List (configurable):**
```typescript
export const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Thriller',
  'Biography',
  'History',
  'Self-Help',
  'Business',
  'Science',
  'Technology',
  'Poetry',
  'Comics & Graphic Novels',
] as const;

export type Genre = typeof GENRES[number];
```

### Previous Story Learnings - CRITICAL

**From Story 1.3 (Apple OAuth):**
- Better Auth session access pattern established
- Auth middleware already protects `(main)` route group
- OAuthButtons component pattern in `src/components/features/auth/`
- Types pattern: feature-specific `types.ts` with `index.ts` re-export
- Test file co-location pattern: `Component.test.tsx` next to `Component.tsx`

**Files Created in Story 1.2 & 1.3 (reference patterns):**
- `src/lib/auth.ts` - Better Auth config (session access)
- `src/hooks/useSession.ts` - Client-side session hook
- `src/middleware.ts` - Route protection
- `src/components/features/auth/types.ts` - Feature types pattern
- `src/components/features/auth/index.ts` - Re-export pattern

**Do NOT duplicate or conflict with:**
- Existing auth session management
- Existing error handling patterns
- Existing toast implementations (if any)

### UI Design Requirements (from UX Spec)

**Profile Page Layout:**
- Mobile-first, single column
- Avatar prominently displayed (large, centered)
- Name as page title or prominent heading
- Edit button: secondary variant, top-right or below header
- Form fields: full width on mobile

**Color & Styling:**
- Primary color: Warm Amber (#d97706)
- Background: Warm Cream (#fffbeb)
- Text: Warm Brown (#451a03)
- Muted text: Dusty Brown (#78350f)
- Border radius: 8px buttons, 12px cards

**Accessibility Requirements:**
- Form labels properly associated
- Error messages linked via aria-describedby
- Focus management on edit mode toggle
- 44px minimum touch targets
- WCAG AA color contrast

### Testing Strategy

**Unit Tests (Jest + React Testing Library):**
- ProfileHeader renders user data correctly
- ProfileForm validates input correctly
- ProfileForm shows character counters
- ProfileView toggles between view/edit modes
- Error states display correctly

**Integration Tests:**
- Full profile update flow with mock server action
- Optimistic update and rollback on error
- Toast notifications appear correctly

**Manual Testing Checklist:**
- [ ] Profile page loads with current user data
- [ ] Edit mode shows all editable fields
- [ ] Name validation: empty name shows error
- [ ] Name validation: >50 chars shows error
- [ ] Bio validation: >200 chars shows error
- [ ] Genre multi-select works correctly
- [ ] Activity toggle switches correctly
- [ ] Save shows loading state
- [ ] Success shows toast notification
- [ ] Changes persist after page refresh
- [ ] Works on mobile viewport
- [ ] Keyboard navigation works

### Project Structure Notes

**Alignment with Architecture:**
- Profile components go in `src/components/features/profile/`
- Server action goes in `src/actions/profile/`
- Validation schema goes in `src/lib/validation/profile.ts`
- Page route uses `(main)` route group (already auth-protected)
- Co-located tests with source files

**No conflicts detected** - this is new functionality extending existing patterns.

### References

- [Source: architecture.md#Implementation Patterns] - Server Action return pattern, import aliases
- [Source: architecture.md#Structure Patterns] - File organization, naming conventions
- [Source: architecture.md#Frontend Architecture] - Form validation with Zod
- [Source: architecture.md#Project Structure] - Component and action locations
- [Source: ux-design-specification.md#Form Patterns] - Validation on blur, inline errors
- [Source: ux-design-specification.md#Feedback Patterns] - Toast patterns
- [Source: ux-design-specification.md#Color System] - Warm Hearth palette
- [Source: epic-1#Story 1.4] - Acceptance criteria, user story
- [Source: prd.md#FR2] - Users can view and edit their profile
- [Source: 1-3-oauth-authentication-with-apple.md] - Implementation patterns, types pattern

### Web Research Notes

**react-hook-form + Zod (2026):**
- react-hook-form v7.x with Zod resolver is standard pattern
- Use `zodResolver` from `@hookform/resolvers/zod`
- Form state management is handled automatically
- Error messages from Zod schema are displayed inline

**shadcn/ui Form Components:**
- Use Form, FormField, FormItem, FormLabel, FormControl, FormMessage
- FormMessage automatically displays Zod validation errors
- Supports all standard input types

**Multi-Select Pattern:**
- shadcn/ui doesn't have native multi-select
- Options: Checkbox group, Command/Combobox, or custom multi-select
- Recommendation: Use checkbox group for < 15 options (genres)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Spun up PostgreSQL Docker container for local development (port 5432)
- Updated DATABASE_URL in .env and .env.local to use local PostgreSQL
- Migration `20260204152154_add_profile_fields` successfully applied

### Completion Notes List

- **Task 1**: Extended User model with `favoriteGenres` (String[]) and `showReadingActivity` (Boolean) fields. Migration created and applied successfully.
- **Task 2**: Created Zod validation schema with proper type exports for form input and validated output.
- **Task 3**: Implemented updateProfile server action following ActionResult<T> pattern with Zod validation and session authentication.
- **Task 4**: Created protected profile page route with server-side user data fetching and loading state.
- **Task 5**: Created ProfileHeader component with Avatar, name, email, member since date, and edit button.
- **Task 6**: Created ProfileForm with react-hook-form + Zod resolver, character counters, checkbox group for genres, and switch for activity visibility.
- **Task 7**: Created ProfileView component with view/edit mode toggle, optimistic UI updates, and toast notifications.
- **Task 8**: Created genre constants and types in lib/config.
- **Task 9**: Created feature index with re-exports for all profile components.
- **Task 10**: Comprehensive unit and integration tests written for all components (28 new tests passing).

### File List

**New Files:**
- prisma/migrations/20260204152154_add_profile_fields/migration.sql
- src/lib/validation/profile.ts
- src/lib/config/genres.ts
- src/lib/config/index.ts
- src/actions/profile/updateProfile.ts
- src/actions/profile/index.ts
- src/app/(main)/profile/page.tsx
- src/app/(main)/profile/loading.tsx
- src/components/features/profile/ProfileHeader.tsx
- src/components/features/profile/ProfileHeader.test.tsx
- src/components/features/profile/ProfileForm.tsx
- src/components/features/profile/ProfileForm.test.tsx
- src/components/features/profile/ProfileView.tsx
- src/components/features/profile/ProfileView.test.tsx
- src/components/features/profile/types.ts
- src/components/features/profile/index.ts
- src/components/ui/input.tsx (shadcn)
- src/components/ui/textarea.tsx (shadcn)
- src/components/ui/label.tsx (shadcn)
- src/components/ui/switch.tsx (shadcn)
- src/components/ui/checkbox.tsx (shadcn)
- src/components/ui/avatar.tsx (shadcn)

**Modified Files:**
- prisma/schema.prisma (added favoriteGenres and showReadingActivity fields)
- vitest.setup.ts (added ResizeObserver mock)
- .env (updated DATABASE_URL for local development)
- .env.local (updated DATABASE_URL for local development)

## Change Log

- 2026-02-04: Implemented Story 1.4 - User Profile Management
  - Added profile fields to database schema
  - Created profile page with view/edit functionality
  - Implemented Zod validation for form inputs
  - Added optimistic UI updates with toast notifications
  - Created comprehensive test suite (28 tests)
