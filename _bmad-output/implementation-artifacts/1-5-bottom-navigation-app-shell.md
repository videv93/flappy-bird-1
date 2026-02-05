# Story 1.5: Bottom Navigation & App Shell

Status: done

## Story

As a **user**,
I want **consistent navigation across the app**,
So that **I can easily move between main sections**.

## Acceptance Criteria

1. **Given** I am logged in on any page **When** I view the app on mobile (< 768px) **Then** I see a bottom tab bar with 5 tabs: Home, Search, Library, Activity, Profile **And** each tab has an icon and label **And** the active tab is visually highlighted (filled icon, primary color) **And** touch targets are at least 44x44px

2. **Given** I am on a tab **When** I tap the same tab again **Then** the page scrolls to the top

3. **Given** I am on any main page **When** I view the page header **Then** I see the page title centered **And** I see contextual actions on the right (if applicable) **And** I see a back arrow on the left for nested pages

4. **Given** I am on desktop (≥ 1024px) **When** I view the navigation **Then** the navigation adapts appropriately (side nav or persistent header) **And** all touch targets remain accessible via keyboard

5. **Given** I navigate between tabs **When** the page transitions **Then** transitions are smooth (200ms, ease-out) **And** the previous page state is preserved when I return

## Tasks / Subtasks

- [x] **Task 1: Create BottomNav Component** (AC: #1, #2)
  - [x] Create `src/components/layout/BottomNav.tsx`
  - [x] Implement 5 tabs: Home, Search, Library, Activity, Profile
  - [x] Use Lucide icons (House, Search, BookOpen, Bell, User)
  - [x] Add filled/outline icon variants for active/inactive states
  - [x] Style with Warm Amber primary color for active tab
  - [x] Ensure minimum 44x44px touch targets
  - [x] Implement scroll-to-top on same-tab tap
  - [x] Add keyboard navigation support
  - [x] Create co-located test file

- [x] **Task 2: Create PageHeader Component** (AC: #3)
  - [x] Create `src/components/layout/PageHeader.tsx`
  - [x] Implement centered title display
  - [x] Add left slot for back button (optional)
  - [x] Add right slot for actions (optional)
  - [x] Implement sticky header behavior on scroll
  - [x] Style with Warm Hearth palette
  - [x] Create co-located test file

- [x] **Task 3: Create AppShell Component** (AC: #1, #3, #4, #5)
  - [x] Create `src/components/layout/AppShell.tsx`
  - [x] Compose PageHeader + content area + BottomNav
  - [x] Add mobile detection (< 768px)
  - [x] Implement responsive nav (bottom on mobile, side on desktop)
  - [x] Add page transition animations (200ms, ease-out)
  - [x] Preserve scroll position per route
  - [x] Create co-located test file

- [x] **Task 4: Create SideNav Component for Desktop** (AC: #4)
  - [x] Create `src/components/layout/SideNav.tsx`
  - [x] Mirror BottomNav tabs in vertical layout
  - [x] Style for desktop viewport (≥ 1024px)
  - [x] Ensure keyboard accessibility
  - [x] Create co-located test file

- [x] **Task 5: Create Layout Feature Index**
  - [x] Create `src/components/layout/types.ts` for shared types
  - [x] Create `src/components/layout/index.ts` with re-exports

- [x] **Task 6: Update Main Layout** (AC: all)
  - [x] Update `src/app/(main)/layout.tsx`
  - [x] Integrate AppShell component
  - [x] Pass page title from metadata or props
  - [x] Configure route-specific header actions

- [x] **Task 7: Create Stub Pages for Navigation** (AC: #1)
  - [x] Create `src/app/(main)/search/page.tsx` (placeholder)
  - [x] Create `src/app/(main)/library/page.tsx` (placeholder)
  - [x] Create `src/app/(main)/activity/page.tsx` (placeholder)
  - [x] Each page should have basic content for navigation testing

- [x] **Task 8: Install and Configure Framer Motion** (AC: #5)
  - [x] Install framer-motion if not already installed
  - [x] Create motion helper utilities in `src/lib/motion.ts`
  - [x] Implement reduced motion detection hook
  - [x] Add page transition variants

- [x] **Task 9: Write Integration Tests** (AC: all)
  - [x] Test bottom nav renders on mobile viewport
  - [x] Test side nav renders on desktop viewport
  - [x] Test active tab highlighting works
  - [x] Test scroll-to-top on same-tab tap
  - [x] Test keyboard navigation through tabs
  - [x] Test page transitions are smooth
  - [x] Test navigation state preservation

## Dev Notes

### Architecture Compliance - CRITICAL

**File Organization (from Architecture):**
```
src/
├── app/(main)/
│   ├── layout.tsx           # Updated with AppShell
│   ├── home/page.tsx        # Existing
│   ├── search/page.tsx      # NEW stub
│   ├── library/page.tsx     # NEW stub
│   ├── activity/page.tsx    # NEW stub
│   └── profile/page.tsx     # Existing
├── components/
│   ├── layout/              # NEW - Layout components
│   │   ├── BottomNav.tsx
│   │   ├── BottomNav.test.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PageHeader.test.tsx
│   │   ├── AppShell.tsx
│   │   ├── AppShell.test.tsx
│   │   ├── SideNav.tsx
│   │   ├── SideNav.test.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   └── ui/                  # Existing shadcn components
└── lib/
    └── motion.ts            # NEW - Framer Motion helpers
```

**Import Alias Enforcement:**
```typescript
// ALWAYS use @/* for cross-boundary imports
import { BottomNav, PageHeader, AppShell } from '@/components/layout';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

// NEVER use relative imports across boundaries
```

**Component File Structure (from Architecture):**
```typescript
// Standard component file structure (in order):

// 1. Imports (external, then internal with @/ alias)
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, BookOpen, Bell, User } from 'lucide-react';

import { cn } from '@/lib/utils';

// 2. Types/Interfaces (component-specific)
interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconFilled: React.ComponentType<{ className?: string }>;
  label: string;
}

// 3. Component function (named export)
export function BottomNav() {
  // hooks first
  const pathname = usePathname();

  // derived state
  const isActive = (href: string) => pathname.startsWith(href);

  // handlers
  const handleSameTabClick = (href: string) => {
    if (isActive(href)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // render
  return (
    // ...
  );
}
```

### Navigation Configuration

**Tab Definitions:**
```typescript
// src/components/layout/types.ts
export const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/activity', icon: Bell, label: 'Activity' },
  { href: '/profile', icon: User, label: 'Profile' },
] as const;

export type NavItem = typeof NAV_ITEMS[number];
```

**Icon States (from UX Spec):**
- **Active:** Filled icon + primary amber color (`text-primary`)
- **Inactive:** Outline icon + muted color (`text-muted-foreground`)

Note: Lucide doesn't have separate filled variants. Use:
- Option 1: Use different weights/stroke-widths
- Option 2: Use CSS fill on active state
- Option 3: Use different icon sets (not recommended)

**Recommendation:** Use `fill="currentColor"` conditionally or use Lucide's `strokeWidth` prop.

### Styling Specifications (from UX Spec)

**Color Palette (Warm Hearth):**
```typescript
// Already configured in tailwind.config.ts
// Primary: Warm Amber #d97706
// Background: Warm Cream #fffbeb
// Text: Warm Brown #451a03
// Muted: Dusty Brown #78350f
```

**Bottom Nav Styling:**
```typescript
// BottomNav.tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
  <div className="flex h-16 items-center justify-around px-4">
    {NAV_ITEMS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
          isActive(item.href)
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <item.icon className={cn("h-5 w-5", isActive(item.href) && "fill-primary")} />
        <span>{item.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

**Page Header Styling:**
```typescript
// PageHeader.tsx
<header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="flex h-14 items-center justify-between px-4">
    <div className="w-12">{leftSlot}</div>
    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    <div className="w-12 flex justify-end">{rightSlot}</div>
  </div>
</header>
```

### Responsive Breakpoints (from UX Spec)

| Breakpoint | Width | Navigation |
|------------|-------|------------|
| Mobile | < 768px | Bottom tab bar |
| Tablet | 768px - 1023px | Bottom tab bar |
| Desktop | ≥ 1024px | Side navigation |

```typescript
// useMediaQuery hook for responsive detection
const isMobile = useMediaQuery('(max-width: 767px)');
const isDesktop = useMediaQuery('(min-width: 1024px)');
```

### Page Transitions (from UX Spec)

**Transition Specifications:**
- Duration: 200ms
- Easing: ease-out (CSS) or `[0.0, 0.0, 0.2, 1]` (Framer)
- Type: Opacity fade + slight Y translation

**Framer Motion Pattern:**
```typescript
// src/lib/motion.ts
import { Variants } from 'framer-motion';

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition = {
  duration: 0.2,
  ease: [0.0, 0.0, 0.2, 1],
};

export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getMotionProps(variants: Variants) {
  if (shouldReduceMotion()) return {};
  return {
    variants,
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    transition: pageTransition,
  };
}
```

### Scroll Position Preservation

**Implementation Strategy:**
- Use React state or sessionStorage to preserve scroll per route
- Restore on back navigation
- Reset on forward/new navigation

```typescript
// Pattern for scroll preservation
const scrollPositions = useRef<Map<string, number>>(new Map());

const saveScrollPosition = (path: string) => {
  scrollPositions.current.set(path, window.scrollY);
};

const restoreScrollPosition = (path: string) => {
  const position = scrollPositions.current.get(path);
  if (position !== undefined) {
    window.scrollTo({ top: position, behavior: 'instant' });
  }
};
```

### Accessibility Requirements (from UX Spec)

**Keyboard Navigation:**
- Tab through nav items
- Enter/Space to activate
- Arrow keys within nav (optional enhancement)
- Skip link to main content

**ARIA Attributes:**
```typescript
<nav aria-label="Main navigation" role="navigation">
  <Link
    aria-current={isActive(href) ? 'page' : undefined}
    aria-label={`Navigate to ${label}`}
  />
</nav>
```

**Focus Management:**
- Visible focus ring (2px primary)
- Focus trapped within navigation on keyboard use
- Skip link before nav for screen readers

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Sufficient spacing between targets

### Previous Story Learnings - CRITICAL

**From Story 1.4 (Profile Management):**
- shadcn/ui components are in `src/components/ui/`
- Toast notifications via sonner (`toast.success()`)
- useSession hook for current user data
- Feature components use `types.ts` + `index.ts` pattern
- Co-located tests with `.test.tsx` extension

**From Story 1.3 (Apple OAuth):**
- Better Auth session management established
- Protected routes in `(main)` group
- Auth middleware handles redirects

**Existing Files to Reference:**
- `src/app/(main)/layout.tsx` - Current minimal layout (will be updated)
- `src/app/(main)/home/page.tsx` - Example protected page
- `src/app/(main)/profile/page.tsx` - Profile page with data fetching
- `src/hooks/useSession.ts` - Session hook pattern

### Git Intelligence Summary

**Recent Commits:**
```
90a0954 feat: Add user profile management (Story 1.4)
291c6a0 feat: Add Apple OAuth authentication (Story 1.3)
eafdcd7 Initial commit: Project setup with OAuth authentication
```

**Patterns Established:**
- Feature commits with `feat:` prefix
- Story reference in commit message
- Co-located test files
- Component composition patterns

**Files Created/Modified Recently:**
- Profile components in `src/components/features/profile/`
- Validation schemas in `src/lib/validation/`
- Server actions in `src/actions/`
- shadcn/ui components installed: button, card, input, textarea, label, switch, checkbox, avatar

### Dependencies to Install

**Check if already installed (from Story 1.1):**
```bash
npm list framer-motion lucide-react
```

**Install if missing:**
```bash
npm install framer-motion
# lucide-react should already be installed (shadcn/ui dependency)
```

### Testing Strategy

**Unit Tests (Vitest + React Testing Library):**
- BottomNav renders 5 tabs correctly
- BottomNav shows active state for current route
- BottomNav touch targets are at least 44x44px
- PageHeader renders title centered
- PageHeader shows back button when provided
- AppShell composes components correctly
- SideNav renders on desktop viewport

**Integration Tests:**
- Navigation between tabs works
- Scroll-to-top on same-tab tap
- Page transitions animate correctly
- Responsive layout switches at breakpoints

**Manual Testing Checklist:**
- [ ] Bottom nav visible on mobile viewport
- [ ] Side nav visible on desktop viewport
- [ ] Active tab highlighted correctly
- [ ] All tabs navigate to correct routes
- [ ] Same-tab tap scrolls to top
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Page header shows correct title per route
- [ ] Transitions are smooth (not jarring)
- [ ] Works with reduced motion preference
- [ ] Focus states visible for accessibility
- [ ] Touch targets feel appropriately sized

### Project Structure Notes

**Alignment with Architecture:**
- Layout components in `src/components/layout/` per architecture spec
- Uses `@/` import alias consistently
- Co-located tests with source files
- Feature index with re-exports

**No conflicts detected** - This is new navigation infrastructure.

**Dependencies on Previous Work:**
- Relies on existing auth middleware (Story 1.2/1.3)
- Uses existing shadcn/ui button component
- Integrates with existing main layout structure

### References

- [Source: architecture.md#Project Structure] - Layout component location
- [Source: architecture.md#Implementation Patterns] - Component structure, naming
- [Source: ux-design-specification.md#Navigation Patterns] - Bottom tab bar specs
- [Source: ux-design-specification.md#Responsive Strategy] - Breakpoint definitions
- [Source: ux-design-specification.md#Page Transitions] - Animation specs (200ms, ease-out)
- [Source: ux-design-specification.md#Accessibility] - 44px touch targets, keyboard nav
- [Source: ux-design-specification.md#Color System] - Warm Hearth palette
- [Source: epic-1#Story 1.5] - Acceptance criteria, user story
- [Source: 1-4-user-profile-management.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 103 tests pass (48 new tests for navigation components)
- Lint passes with only pre-existing warning from Story 1.4
- TypeScript type-check passes

### Completion Notes List

- **Task 1**: Created BottomNav component with 5 tabs, active state highlighting, scroll-to-top on same-tab tap, 44px touch targets, keyboard navigation, and ARIA attributes
- **Task 2**: Created PageHeader component with centered title, left/right slots for actions, sticky behavior
- **Task 3**: Created AppShell component composing PageHeader + BottomNav/SideNav with responsive breakpoints, Framer Motion page transitions with reduced motion support, scroll position preservation
- **Task 4**: Created SideNav component for desktop with same tabs as BottomNav in vertical layout
- **Task 5**: Created types.ts with NavItem interface and NAV_ITEMS constant, plus index.ts re-exports
- **Task 6**: Updated main layout to use AppShell with dynamic page titles based on route
- **Task 7**: Created stub pages for Search, Library, and Activity navigation targets
- **Task 8**: Created motion.ts utilities with pageVariants, pageTransition, and reduced motion helpers; created useReducedMotion hook
- **Task 9**: Created comprehensive integration tests covering all navigation functionality

### File List

**New Files:**
- src/components/layout/types.ts
- src/components/layout/BottomNav.tsx
- src/components/layout/BottomNav.test.tsx
- src/components/layout/PageHeader.tsx
- src/components/layout/PageHeader.test.tsx
- src/components/layout/SideNav.tsx
- src/components/layout/SideNav.test.tsx
- src/components/layout/AppShell.tsx
- src/components/layout/AppShell.test.tsx
- src/components/layout/integration.test.tsx
- src/components/layout/index.ts
- src/lib/motion.ts
- src/hooks/useMediaQuery.ts
- src/hooks/useReducedMotion.ts
- src/app/(main)/search/page.tsx
- src/app/(main)/library/page.tsx
- src/app/(main)/activity/page.tsx

**Modified Files:**
- src/app/(main)/layout.tsx (integrated AppShell with dynamic titles)
- src/app/(main)/home/page.tsx (adjusted content for AppShell integration)
- src/hooks/index.ts (added hook exports)
- _bmad-output/implementation-artifacts/sprint-status.yaml (story status tracking)

## Change Log

- 2026-02-05: Code Review - Fixed Critical and Medium issues
  - **CRITICAL FIX:** Changed BottomNav breakpoint from `md:hidden` to `lg:hidden` to ensure tablet (768-1023px) has visible navigation
  - **MEDIUM FIX:** Fixed scroll position preservation - was using unreliable `beforeunload` event, now saves on route change cleanup
  - **MEDIUM FIX:** Added sprint-status.yaml to File List documentation
  - **TEST:** Added tablet breakpoint visibility test to integration.test.tsx
  - Updated tests: BottomNav.test.tsx, integration.test.tsx (49 layout tests passing)

- 2026-02-04: Implemented Story 1.5 - Bottom Navigation & App Shell
  - Added responsive navigation (bottom on mobile/tablet, side on desktop)
  - Created layout components (AppShell, BottomNav, SideNav, PageHeader)
  - Implemented Framer Motion page transitions with reduced motion support
  - Added scroll position preservation across routes
  - Created stub pages for navigation testing
  - Added 48 new tests (103 total tests passing)

