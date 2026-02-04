---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/research/market-competitive-ux-social-reading-apps-research-2026-01-15.md"
workflowType: 'architecture'
project_name: 'flappy-bird-1'
user_name: 'vitr'
date: '2026-01-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

39 functional requirements across 7 domains:

| Domain | FR Count | Architectural Impact |
|--------|----------|---------------------|
| User Management | FR1-FR6 | Auth system, profile service, social graph |
| Book Library | FR7-FR12 | Book service, external API integrations |
| Reading Sessions | FR13-FR16 | Session tracking, timer persistence |
| Streak System | FR17-FR22 | Daily calculation logic, freeze mechanics |
| Social & Activity | FR23-FR27 | Feed generation, notification system, kudos |
| Reading Rooms | FR28-FR33 | Presence system, hybrid polling/push |
| Administration | FR34-FR39 | Moderation queue, user management, metrics |

**Non-Functional Requirements:**

| Category | Key Requirement | Architectural Implication |
|----------|-----------------|---------------------------|
| Performance | <3s page load on 4G | SSR/ISR, optimized bundles, CDN |
| Performance | <30s presence updates | Polling interval configuration |
| Performance | <5s push notifications | Pusher integration |
| Concurrency | 100 concurrent users | Connection pooling, stateless design |
| Security | OAuth 2.0 + JWT | Auth provider integration |
| Security | GDPR compliance | Data export/deletion capabilities |
| Scalability | 10x growth path | Horizontal scaling ready |
| Reliability | 99.5% uptime | Graceful degradation patterns |
| Accessibility | WCAG 2.1 AA | Semantic HTML, ARIA, focus management |

**Scale & Complexity:**

- Primary domain: Full-stack web application (Next.js monolith)
- Complexity level: Medium-High
- Estimated architectural components: 8-10 major services/modules
- Component variants: 8 custom components × 2 motion states = pattern needed

### Technical Constraints & Dependencies

**External Dependencies:**
- OpenLibrary API / Google Books API (book metadata)
- Google OAuth / Apple Sign-In (authentication)
- Pusher Channels (real-time events) - channel limits apply at scale
- Mixpanel (analytics)

**Platform Constraints:**
- Vercel deployment (serverless functions, edge) - function concurrency limits
- PostgreSQL via Supabase/Railway (managed database) - connection pooling limits
- PWA requirements (Service Worker, Web Push)
- Service Worker + Vercel edge function interaction requires early validation

**UX-Driven Constraints:**
- Offline session logging requires local storage + sync with conflict resolution
- Framer Motion animations must respect `prefers-reduced-motion`
- 44px minimum touch targets throughout
- Mobile-first responsive breakpoints

**Architectural Tensions to Resolve:**
- Stateless application layer vs. SessionTimer persistent state requirement
- Timer must persist across page navigation and backgrounding
- Resolution options: IndexedDB, URL state, or server-side session storage

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Strategy Needed |
|---------|---------------------|-----------------|
| Authentication | All user-facing features | Middleware, session management |
| Real-time Presence | Reading rooms, notifications | Hybrid polling + push architecture, explicit source of truth |
| Offline Support | Session logging, timer | Service Worker, IndexedDB sync, merge strategy for conflicts |
| Accessibility | All UI components | Component-level ARIA, focus mgmt, automated testing (axe-core) |
| Error Handling | All services | Graceful degradation, user messaging |
| Caching | Book data, user data | ISR, client cache, stale-while-revalidate |
| Testability | All components, presence system | Component isolation, time mocking, presence simulation |
| State Management | Timer, offline sync, presence | Explicit state machine definitions |

### High-Risk Technical Areas

| Feature | Risk Level | Concern |
|---------|------------|---------|
| Hybrid presence | HIGH | Race conditions between polling and push, timing-dependent behavior |
| Streak calculation | HIGH | Time-zone edge cases, midnight boundaries, freeze mechanics |
| Offline sync | MEDIUM-HIGH | Service Worker mocking, IndexedDB, conflict resolution |
| OAuth flow | MEDIUM | Third-party dependency, test environment strategy |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js monolith) based on project requirements analysis.

### Starter Options Considered

| Option | Technologies | Evaluation |
|--------|--------------|------------|
| **create-next-app + shadcn/ui** | Next.js 16, React 19, TypeScript, Tailwind 4, Turbopack | Best fit - aligns with UX spec, latest versions |
| **create-t3-app v7.40** | Next.js, Prisma, Tailwind, tRPC, NextAuth | Over-engineered - tRPC not needed for REST + Pusher architecture |
| **ChadNext** | Next.js 15, shadcn/ui, Prisma, LuciaAuth | Good but older Next.js, includes Stripe (unused) |

### Selected Starter: create-next-app + shadcn/ui

**Rationale for Selection:**
- UX specification explicitly requires shadcn/ui component library
- Latest Next.js 16 with React 19 and Turbopack for optimal performance
- Clean foundation without opinionated API layer (tRPC) - allows flexibility for Pusher integration
- Official Vercel starter ensures best compatibility with Vercel deployment

**Initialization Commands:**

```bash
# Create Next.js application
npx create-next-app@latest flappy-bird-1 --typescript --tailwind --eslint --app --src-dir --turbopack

# Initialize shadcn/ui component system
cd flappy-bird-1
npx shadcn@latest init

# Install core dependencies
npm install prisma @prisma/client framer-motion lucide-react pusher-js
npm install -D @types/node
```

**Architectural Decisions Provided by Starter:**

| Category | Decision |
|----------|----------|
| **Language & Runtime** | TypeScript 5.x, Node.js, React 19 |
| **Styling Solution** | Tailwind CSS 4.x with CSS variables, shadcn/ui components |
| **Build Tooling** | Turbopack (dev), Webpack (prod), SWC for transpilation |
| **Code Organization** | App Router with `src/` directory, `@/*` import alias |
| **Development Experience** | Fast Refresh, TypeScript strict mode, ESLint 9 |

**Additional Dependencies to Install:**

| Package | Purpose |
|---------|---------|
| `prisma` + `@prisma/client` | Database ORM |
| `framer-motion` | Animation library (UX requirement) |
| `lucide-react` | Icon library (shadcn default) |
| `pusher-js` | Real-time client for presence |
| `next-auth` | OAuth authentication |

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| Database Provider | Railway (PostgreSQL) | User preference, full control, same-network latency |
| Data Validation | Zod | TypeScript-first, pairs with shadcn/ui forms |
| Auth Library | Better Auth | Active development, native Next.js 16 compatibility |
| API Pattern | Hybrid (Server Actions + API Routes) | Server Actions for mutations, API Routes for webhooks/integrations |
| State Management | Zustand | Centralized stores, persist middleware, simpler mental model |
| Timer Persistence | IndexedDB (via idb-keyval) | Pairs with Service Worker, survives navigation |
| CI/CD | GitHub Actions + Vercel CLI | Quality gates before deploy, full control |
| Environment Config | .env.local + Vercel UI | Standard approach, per-environment secrets |
| Monitoring | Vercel Analytics + Mixpanel + Sentry | Performance, user analytics, error tracking |
| Test Database | Docker PostgreSQL | Matches Railway exactly, free for CI |

### Data Architecture

**Database:** PostgreSQL hosted on Railway
- Connection pooling via Prisma connection pool
- Migrations managed via `prisma migrate`
- Schema-first development with Prisma schema
- **Note:** Monitor Railway-Vercel latency; consider Prisma Accelerate if bottleneck emerges

**Validation:** Zod for runtime validation
- Form validation with react-hook-form + @hookform/resolvers/zod
- API input validation with Zod schemas
- Shared schemas between client and server

**Caching Strategy:**
- Next.js ISR for book metadata (revalidate on demand)
- Client-side SWR/React Query for user data
- Zustand for UI state with IndexedDB persistence
- Edge caching for presence polling endpoints

### Authentication & Security

**Auth Library:** Better Auth
- OAuth 2.0 providers: Google, Apple
- JWT tokens with 24-hour expiration
- Session management via Better Auth Prisma adapter
- **Spike required:** Validate Better Auth + Prisma + Railway in first implementation story
- **Fallback plan:** Auth.js v5 with `--legacy-peer-deps` if blockers emerge

**Security Middleware:**
- Auth middleware for protected routes
- CSRF protection via Better Auth
- Rate limiting on API routes (Vercel Edge)

**Data Protection:**
- HTTPS enforced (Vercel default)
- Database encryption at rest (Railway)
- Environment secrets via Vercel

### API & Communication Patterns

**API Pattern Decision Tree:**

```
Is it a webhook or external callback?     → API Route
Does it need custom caching control?      → API Route
Does it proxy an external API?            → API Route
Is it a simple form mutation?             → Server Action
Unclear?                                  → Server Action (simpler)
```

**Server Actions (mutations):**
- Kudos creation/deletion
- Session logging
- Profile updates
- Book library management
- Follow/unfollow actions

**API Routes (integrations):**
- `/api/auth/*` - Better Auth handlers
- `/api/pusher/*` - Pusher webhooks and auth
- `/api/books/*` - OpenLibrary/Google Books proxy
- `/api/export/*` - GDPR data export

**Error Handling:**
- Consistent error response format
- Client-side error boundaries
- Server action error returns (not throws)

### Frontend Architecture

**State Management:** Zustand with explicit store boundaries

| Store | Responsibility | Persistence |
|-------|----------------|-------------|
| `useTimerStore` | Active session timer only | IndexedDB |
| `usePresenceStore` | Reading room presence only | Memory (volatile) |
| `useOfflineStore` | Sync queue only | IndexedDB |
| `useUserStore` | User preferences only | IndexedDB |

**Timer Persistence:** IndexedDB via `idb-keyval` + Zustand persist
- Timer survives page navigation
- Syncs with server on session end
- Conflict resolution: server wins for completed sessions

**Offline Strategy:**
- Service Worker for offline detection
- IndexedDB queue for pending actions
- Sync on reconnect with merge strategy

**Component Architecture:**
- Base components: shadcn/ui (customized)
- Feature components: composition over inheritance
- Motion wrapper pattern for Framer Motion + reduced-motion

### Infrastructure & Deployment

**Hosting:** Vercel
- Edge Functions for API routes
- Serverless Functions for Server Actions
- CDN for static assets

**CI/CD Pipeline:** GitHub Actions

```yaml
push → lint → type-check → test → build → deploy (Vercel)

services:
  postgres:
    image: postgres:16  # Matches Railway
```

- Preview deploys on PR
- Production deploy on main merge
- Docker PostgreSQL in CI for integration tests

**Test Database Strategy:**
- **Local development:** Docker PostgreSQL (matches Railway)
- **CI/CD:** GitHub Actions PostgreSQL service
- **Staging:** Railway preview environment (optional)

**Environment Configuration:**
- Local: `.env.local` (git-ignored)
- Preview: Vercel environment variables
- Production: Vercel environment variables (encrypted)

**Monitoring Stack:**
- Vercel Analytics: Web Vitals, performance
- Mixpanel: User analytics, funnels
- Sentry: Error tracking, session replay

### Updated Dependencies

| Package | Purpose |
|---------|---------|
| `prisma` + `@prisma/client` | Database ORM |
| `better-auth` | Authentication |
| `framer-motion` | Animation library |
| `lucide-react` | Icon library |
| `pusher-js` | Real-time client |
| `zustand` | State management |
| `idb-keyval` | IndexedDB wrapper for Zustand persist |
| `zod` | Validation |
| `@hookform/resolvers` | Zod + React Hook Form |
| `@sentry/nextjs` | Error tracking |

### Decision Dependencies

```
Railway PostgreSQL ←→ Docker PostgreSQL (test parity)
    ↓
Prisma ORM ← Zod validation
    ↓
Better Auth (OAuth) ← spike first, Auth.js fallback
    ↓
API Routes ←→ Server Actions (decision tree)
    ↓
Zustand stores (4 bounded) + idb-keyval
    ↓
Vercel Deploy ← GitHub Actions + PostgreSQL service
```

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 areas where AI agents could make different choices, now standardized.

### Naming Patterns

**Database Naming (Prisma Convention):**

| Element | Convention | Example |
|---------|------------|---------|
| Models | PascalCase | `User`, `ReadingSession`, `BookKudos` |
| Tables | snake_case plural | `users`, `reading_sessions`, `book_kudos` |
| Columns | snake_case | `user_id`, `created_at`, `book_title` |
| Foreign keys | `{table}_id` | `user_id`, `book_id` |

```prisma
model ReadingSession {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("reading_sessions")
}
```

**API Naming:**

| Element | Convention | Example |
|---------|------------|---------|
| Endpoints | Plural nouns | `/api/users`, `/api/books`, `/api/sessions` |
| Route params | Bracket format | `/api/books/[id]`, `/api/users/[userId]/sessions` |
| Query params | camelCase | `?userId=123&includeAuthor=true` |
| JSON fields | camelCase | `{ userId, createdAt, bookTitle }` |

**Code Naming:**

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase file + export | `BookCard.tsx` → `export function BookCard()` |
| Hooks | camelCase with `use` prefix | `useTimerStore.ts`, `usePresence.ts` |
| Utilities | camelCase | `formatDate.ts`, `cn.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_STREAK_FREEZE`, `API_TIMEOUT_MS` |
| Types/Interfaces | PascalCase | `User`, `BookWithAuthor`, `ActionResult<T>` |
| Zustand stores | `use{Domain}Store` | `useTimerStore`, `usePresenceStore` |

**Import Alias Enforcement:**

```typescript
// ✅ ALWAYS use @/* alias for cross-boundary imports
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/stores/useTimerStore';
import { formatDate } from '@/lib/utils';

// ❌ NEVER use relative imports across boundaries
import { Button } from '../../../components/ui/button';

// ✅ Relative imports OK within same feature folder
import { BookCardSkeleton } from './BookCardSkeleton';
```

### Structure Patterns

**Project Organization (Hybrid):**

```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/               # Auth route group
│   ├── (main)/               # Main app route group
│   ├── api/                  # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui base components
│   └── features/             # Domain components
│       ├── books/
│       │   ├── BookCard.tsx
│       │   ├── BookCard.test.tsx
│       │   ├── BookCardSkeleton.tsx
│       │   ├── BookSearch.tsx
│       │   └── index.ts      # Re-exports
│       ├── streaks/
│       │   └── index.ts
│       ├── presence/
│       │   └── index.ts
│       └── social/
│           └── index.ts
├── lib/                      # Utilities and helpers
│   ├── utils.ts
│   ├── prisma.ts
│   └── pusher.ts
├── stores/                   # Zustand stores
│   ├── useTimerStore.ts
│   ├── usePresenceStore.ts
│   ├── useOfflineStore.ts
│   └── useUserStore.ts
├── services/                 # External API clients
│   ├── books.ts
│   └── analytics.ts
├── actions/                  # Server Actions (nested by domain)
│   ├── sessions/
│   │   ├── createSession.ts
│   │   ├── endSession.ts
│   │   └── index.ts
│   ├── kudos/
│   │   ├── createKudos.ts
│   │   ├── deleteKudos.ts
│   │   └── index.ts
│   └── books/
│       └── index.ts
└── types/                    # Shared TypeScript types
    ├── database.ts
    └── api.ts
```

**Feature Folder Re-exports:**

```typescript
// src/components/features/books/index.ts
export { BookCard } from './BookCard';
export { BookCardSkeleton } from './BookCardSkeleton';
export { BookSearch } from './BookSearch';

// Usage elsewhere:
import { BookCard, BookSearch } from '@/components/features/books';
```

**Test Location & Naming:**

| Test Type | Naming | Location |
|-----------|--------|----------|
| Unit test | `{Component}.test.tsx` | Co-located with source |
| Integration test | `{Component}.int.test.tsx` | Co-located with source |
| E2E test | `{feature}.spec.ts` | `/e2e/` folder |

**Component File Structure:**

```typescript
// Standard component file structure (in order):

// 1. Imports (external, then internal with @/ alias)
import { useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/stores/useTimerStore';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces (component-specific)
interface BookCardProps {
  book: Book;
  showPresence?: boolean;
  onKudos?: () => void;
}

// 3. Component function (named export)
export function BookCard({ book, showPresence = true, onKudos }: BookCardProps) {
  // hooks first
  const [isHovered, setIsHovered] = useState(false);

  // derived state
  const hasAuthorPresence = book.authorLastSeen !== null;

  // handlers
  const handleKudos = () => {
    onKudos?.();
  };

  // render
  return (
    // ...
  );
}

// 4. Helper functions (if small; otherwise separate file)
function formatAuthorPresence(lastSeen: Date): string {
  // ...
}
```

**File Splitting Rule:**

- **Single responsibility:** One component per file
- **Line limit:** If file exceeds ~200 lines, split it
- **Exception:** Tightly coupled small components can share

### Format Patterns

**Server Action Return Pattern:**

```typescript
// All Server Actions use this pattern
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Example
export async function createSession(bookId: string): Promise<ActionResult<Session>> {
  try {
    const session = await prisma.session.create({ ... });
    return { success: true, data: session };
  } catch (e) {
    return { success: false, error: "Failed to create session" };
  }
}
```

**API Error Response Format:**

```typescript
interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  }
}

type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";
```

**Date Handling:**

| Context | Format |
|---------|--------|
| API responses | ISO 8601: `"2026-01-16T14:30:00Z"` |
| Database | Native timestamps (Prisma DateTime) |
| UI display | Formatted via `date-fns`: `formatDistanceToNow()` |
| Streak calculations | User's timezone via `Intl.DateTimeFormat` |

### Communication Patterns

**Pusher Event Naming:**

| Event | Channel | Payload |
|-------|---------|---------|
| `room:user-joined` | `presence-room-{bookId}` | `{ userId, displayName, avatarUrl }` |
| `room:user-left` | `presence-room-{bookId}` | `{ userId }` |
| `room:author-joined` | `presence-room-{bookId}` | `{ authorId, authorName }` |
| `kudos:received` | `private-user-{userId}` | `{ fromUser, sessionId, bookTitle }` |
| `notification:new` | `private-user-{userId}` | `{ type, message, data }` |

**Zustand Store Pattern:**

```typescript
interface TimerStore {
  // State (nouns)
  isRunning: boolean;
  startTime: number | null;
  currentBookId: string | null;

  // Actions (verbs)
  start: (bookId: string) => void;
  stop: () => void;
  reset: () => void;

  // Computed (get/is prefix)
  getElapsedTime: () => number;
  isActive: () => boolean;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'timer-store',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
```

**Zustand Store Testing Pattern:**

```typescript
beforeEach(() => {
  // Option 1: Direct state reset
  useTimerStore.setState({
    isRunning: false,
    startTime: null,
    currentBookId: null
  });

  // Option 2: Use store's reset action (preferred)
  useTimerStore.getState().reset();
});
```

### Process Patterns

**Error Handling by Layer:**

| Layer | Pattern |
|-------|---------|
| Server Actions | Return `{ success: false, error: msg }` |
| API Routes | `NextResponse.json({ error }, { status: 404 })` |
| Components | Error boundary with fallback |
| Forms | Zod + `useForm` + inline messages |
| Global | `Sentry.captureException(error)` |

**Loading State Pattern:**

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Skeleton naming: {ComponentName}Skeleton
```

**Optimistic Update Rules:**

| Action | Strategy | Rollback |
|--------|----------|----------|
| Kudos | Optimistic | Revert on error |
| Session logging | Optimistic + offline queue | Sync on reconnect |
| Follow/unfollow | Optimistic | Revert count on error |
| Profile updates | Wait for server | Show loading state |

### Test Mock Patterns

| Dependency | Mock Strategy |
|------------|---------------|
| Prisma | `jest.mock('@/lib/prisma')` with typed mocks |
| Pusher | `__mocks__/pusher-js.ts` |
| IndexedDB | `fake-indexeddb` in Jest setup |
| Date/Time | `jest.useFakeTimers()` |
| fetch | `msw` (Mock Service Worker) |

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly - no variations
2. Use `ActionResult<T>` for all Server Actions
3. Place tests co-located with source files
4. Use the standard error response format for API routes
5. Name Zustand stores as `use{Domain}Store`
6. Use ISO 8601 for all API date fields
7. Use `@/*` import alias for cross-boundary imports
8. Create `index.ts` re-exports for feature folders
9. Reset Zustand stores in `beforeEach` for tests
10. Follow component file structure order

## Project Structure & Boundaries

### Complete Project Directory Structure

```
flappy-bird-1/
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tailwind.config.ts                 # Design tokens documented here
├── tsconfig.json
├── components.json                    # shadcn/ui config
├── postcss.config.js
├── .env.local                         # Local dev (git-ignored)
├── .env.example                       # Template for env vars
├── .gitignore
├── .eslintrc.json
├── .prettierrc
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint → Type-check → Test → Build
│       └── deploy.yml                 # Vercel deployment
│
├── .storybook/                        # Storybook config
│   ├── main.ts
│   └── preview.ts
│
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── migrations/                    # Migration history
│   └── seed.ts                        # Development seed data
│
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # Service Worker
│   ├── icons/                         # App icons (PWA)
│   └── images/                        # Static images
│
├── e2e/                               # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── auth.spec.ts
│   ├── reading-session.spec.ts
│   └── fixtures/
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── globals.css
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing/Home
│   │   ├── error.tsx                  # Global error boundary
│   │   ├── manifest.ts                # Dynamic PWA manifest
│   │   │
│   │   ├── (auth)/                    # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (main)/                    # Main app route group
│   │   │   ├── layout.tsx             # App shell with bottom nav
│   │   │   ├── home/page.tsx
│   │   │   ├── library/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── activity/page.tsx
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── book/[id]/
│   │   │       ├── page.tsx
│   │   │       └── room/page.tsx
│   │   │
│   │   ├── (admin)/                   # Admin route group
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── moderation/page.tsx
│   │   │
│   │   └── api/                       # API Routes
│   │       ├── auth/[...all]/route.ts
│   │       ├── pusher/auth/route.ts
│   │       ├── pusher/webhooks/route.ts
│   │       ├── books/route.ts
│   │       ├── books/[id]/route.ts
│   │       └── export/route.ts
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── layout/                    # Layout components
│   │   │   ├── BottomNav.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── AppShell.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── features/                  # Domain components
│   │       ├── auth/
│   │       │   ├── LoginForm.tsx
│   │       │   ├── SignupForm.tsx
│   │       │   ├── OAuthButtons.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       ├── books/                 # FR7-FR12
│   │       │   ├── BookCard.tsx
│   │       │   ├── BookCard.test.tsx
│   │       │   ├── BookCard.stories.tsx
│   │       │   ├── BookCardSkeleton.tsx
│   │       │   ├── BookSearch.tsx
│   │       │   ├── BookGrid.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       ├── streaks/               # FR17-FR22
│   │       │   ├── StreakRing.tsx
│   │       │   ├── StreakRing.test.tsx
│   │       │   ├── StreakRing.stories.tsx
│   │       │   ├── StreakRingSkeleton.tsx
│   │       │   ├── StreakFreeze.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       ├── sessions/              # FR13-FR16
│   │       │   ├── SessionTimer.tsx
│   │       │   ├── SessionTimer.test.tsx
│   │       │   ├── SessionTimer.stories.tsx
│   │       │   ├── SessionHistory.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       ├── presence/              # FR28-FR33
│   │       │   ├── PresenceAvatarStack.tsx
│   │       │   ├── PresenceAvatarStack.test.tsx
│   │       │   ├── PresenceAvatarStack.stories.tsx
│   │       │   ├── ReadingRoomPanel.tsx
│   │       │   ├── AuthorShimmerBadge.tsx
│   │       │   ├── AuthorShimmerBadge.stories.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       ├── social/                # FR23-FR27
│   │       │   ├── KudosButton.tsx
│   │       │   ├── KudosButton.test.tsx
│   │       │   ├── KudosButton.stories.tsx
│   │       │   ├── ActivityFeedItem.tsx
│   │       │   ├── ActivityFeed.tsx
│   │       │   ├── FollowButton.tsx
│   │       │   ├── types.ts
│   │       │   └── index.ts
│   │       └── profile/               # FR1-FR6
│   │           ├── ProfileHeader.tsx
│   │           ├── ProfileStats.tsx
│   │           ├── ProfileSettings.tsx
│   │           ├── types.ts
│   │           └── index.ts
│   │
│   ├── actions/                       # Server Actions
│   │   ├── sessions/
│   │   │   ├── createSession.ts
│   │   │   ├── endSession.ts
│   │   │   └── index.ts
│   │   ├── kudos/
│   │   │   ├── createKudos.ts
│   │   │   ├── deleteKudos.ts
│   │   │   └── index.ts
│   │   ├── books/
│   │   │   ├── addToLibrary.ts
│   │   │   ├── updateReadingStatus.ts
│   │   │   └── index.ts
│   │   ├── streaks/
│   │   │   ├── useStreakFreeze.ts
│   │   │   └── index.ts
│   │   ├── social/
│   │   │   ├── followUser.ts
│   │   │   └── index.ts
│   │   └── profile/
│   │       ├── updateProfile.ts
│   │       └── index.ts
│   │
│   ├── stores/                        # Zustand stores
│   │   ├── useTimerStore.ts
│   │   ├── useTimerStore.test.ts
│   │   ├── usePresenceStore.ts
│   │   ├── useOfflineStore.ts
│   │   ├── useUserStore.ts
│   │   └── index.ts
│   │
│   ├── services/                      # External API clients
│   │   ├── books/
│   │   │   ├── openLibrary.ts
│   │   │   ├── googleBooks.ts
│   │   │   └── index.ts
│   │   ├── analytics/
│   │   │   └── mixpanel.ts
│   │   └── pusher/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── index.ts
│   │
│   ├── lib/                           # Core utilities
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   ├── idb-storage.ts
│   │   ├── dates.ts
│   │   ├── motion.ts
│   │   ├── config/
│   │   │   ├── constants.ts
│   │   │   ├── features.ts
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   ├── validation/
│   │   │   ├── auth.ts
│   │   │   ├── books.ts
│   │   │   ├── sessions.ts
│   │   │   ├── profile.ts
│   │   │   └── index.ts
│   │   └── design/
│   │       ├── tokens.ts
│   │       ├── animations.ts
│   │       └── index.ts
│   │
│   ├── types/
│   │   ├── database.ts
│   │   ├── api.ts
│   │   ├── pusher.ts
│   │   └── index.ts
│   │
│   ├── hooks/
│   │   ├── usePresence.ts
│   │   ├── useOnlineStatus.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useReducedMotion.ts
│   │   └── index.ts
│   │
│   ├── middleware.ts
│   │
│   └── __mocks__/
│       ├── pusher-js.ts
│       └── @/lib/prisma.ts
│
├── jest.config.js
├── jest.setup.js
└── docker-compose.yml
```

### Type Location Rules

| Type Category | Location | When to Use |
|---------------|----------|-------------|
| Prisma models | `types/database.ts` | Auto-generated, don't edit |
| API shapes | `types/api.ts` | Request/response types |
| Pusher events | `types/pusher.ts` | Event payloads |
| Feature-local | `{feature}/types.ts` | Types only used in one feature |

### Design System Files

**Motion Helper (`lib/motion.ts`):**

```typescript
export const shouldReduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const getMotionProps = (variants: Variants) =>
  shouldReduceMotion() ? {} : { variants, initial: 'hidden', animate: 'visible' };
```

**Design Tokens (`lib/design/tokens.ts`):**

```typescript
export const colors = {
  warm: {
    amber: '#d97706',
    peach: '#fcd34d',
    terracotta: '#c2410c',
    cream: '#fffbeb',
  },
  author: {
    shimmer: '#eab308',
    text: '#92400e',
  },
  streak: {
    success: '#16a34a',
    frozen: '#3b82f6',
  },
} as const;
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Location | Purpose |
|----------|----------|---------|
| Auth API | `/api/auth/*` | Better Auth handlers |
| Pusher API | `/api/pusher/*` | Presence auth, webhooks |
| Books API | `/api/books/*` | External book search proxy |
| Export API | `/api/export/*` | GDPR data export |

**Data Flow:**

```
Pages → Features → Stores
         ↓
      Actions → Prisma → Database
```

### Requirements to Structure Mapping

| Domain | FRs | Primary Locations |
|--------|-----|-------------------|
| User Management | FR1-FR6 | `features/profile/`, `actions/profile/`, `app/(auth)/` |
| Book Library | FR7-FR12 | `features/books/`, `actions/books/`, `services/books/` |
| Reading Sessions | FR13-FR16 | `features/sessions/`, `actions/sessions/`, `stores/useTimerStore.ts` |
| Streak System | FR17-FR22 | `features/streaks/`, `actions/streaks/` |
| Social & Activity | FR23-FR27 | `features/social/`, `actions/kudos/`, `actions/social/` |
| Reading Rooms | FR28-FR33 | `features/presence/`, `stores/usePresenceStore.ts`, `services/pusher/` |
| Administration | FR34-FR39 | `app/(admin)/*` |

### Storybook Components

| Component | States Documented |
|-----------|-------------------|
| StreakRing | default, complete, frozen, milestone |
| BookCard | default, authorPresent, loading |
| AuthorShimmerBadge | wasHere, live, claimed |
| KudosButton | default, given, animating |
| PresenceAvatarStack | empty, few, many, withAuthor |
| SessionTimer | ready, active, complete |
| ReadingRoomPanel | preview, joined, authorLive |
| ActivityFeedItem | session, finished, milestone, author |

