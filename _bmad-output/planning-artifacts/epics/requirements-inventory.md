# Requirements Inventory

## Functional Requirements

**User Management (FR1-FR6)**
- FR1: Users can create an account using Google or Apple sign-in
- FR2: Users can view and edit their profile (name, bio, reading preferences)
- FR3: Users can follow other users to see their reading activity
- FR4: Users can unfollow users they previously followed
- FR5: Users can view another user's public profile and reading activity
- FR6: Authors can claim authorship of their books with verification

**Book Library (FR7-FR12)**
- FR7: Users can search for books by title, author, or ISBN
- FR8: Users can add books to their library with status (reading, finished, want-to-read)
- FR9: Users can update the reading status of books in their library
- FR10: Users can remove books from their library
- FR11: Users can view book details including metadata and cover
- FR12: Users can see if an author has claimed a book

**Reading Sessions (FR13-FR16)**
- FR13: Users can log a reading session with duration
- FR14: Users can view their reading session history for any book
- FR15: Users can see their total reading time across all books
- FR16: System tracks reading sessions for streak calculation

**Streak System (FR17-FR22)**
- FR17: Users can set a daily reading goal (time-based)
- FR18: Users can view their current streak count
- FR19: Users receive streak credit when daily goal is met
- FR20: Users can use a streak freeze to protect their streak
- FR21: System resets streak when goal is missed without freeze
- FR22: Users can view their streak history

**Social & Activity (FR23-FR27)**
- FR23: Users can view an activity feed of followed users' reading activity
- FR24: Users can give kudos to another user's reading session
- FR25: Users receive notifications when they get kudos
- FR26: Users can view kudos received on their sessions
- FR27: Feed shows reading sessions, finished books, and streak milestones

**Reading Rooms (FR28-FR33)**
- FR28: Users can join a reading room for any book
- FR29: Users can see who else is currently in a reading room
- FR30: Users can see when an author was last present in a room
- FR31: Users receive notification when an author joins a room they're in
- FR32: Users can leave a reading room
- FR33: Authors are visually distinguished in reading rooms

**Administration (FR34-FR39)**
- FR34: Admins can view a moderation queue of flagged content
- FR35: Admins can remove content that violates policies
- FR36: Admins can warn or suspend user accounts
- FR37: Admins can review and approve author verification requests
- FR38: Admins can view platform health metrics
- FR39: Support can look up user accounts and session history

## NonFunctional Requirements

**Performance**
- NFR1: Page load < 3 seconds on 4G mobile connection
- NFR2: Core actions (log session, give kudos) < 2 seconds
- NFR3: Reading room presence update < 30 seconds (polling interval)
- NFR4: Push notifications (kudos, author join) < 5 seconds
- NFR5: Support 100 concurrent users in MVP
- NFR6: Individual reading room capacity: 50 concurrent users

**Security**
- NFR7: OAuth 2.0 via Google and Apple providers
- NFR8: JWT tokens with 24-hour expiration
- NFR9: Secure token refresh mechanism
- NFR10: All data encrypted in transit (HTTPS/TLS 1.3)
- NFR11: Database encryption at rest
- NFR12: Reading history treated as private by default
- NFR13: Users control visibility of reading activity
- NFR14: GDPR-compliant data export and deletion

**Scalability**
- NFR15: Support 1,000 registered users
- NFR16: Support 300 daily active users
- NFR17: Handle 10 reading rooms with 20 concurrent users each
- NFR18: Architecture supports 10x growth without re-architecture
- NFR19: Database connection pooling from day one
- NFR20: Stateless application layer for horizontal scaling

**Accessibility**
- NFR21: WCAG 2.1 Level AA compliance
- NFR22: Keyboard navigation for all core flows
- NFR23: Screen reader compatibility (semantic HTML, ARIA labels)
- NFR24: Sufficient color contrast (4.5:1 for text)
- NFR25: Focus indicators on interactive elements
- NFR26: Alt text for book covers
- NFR27: Readable text sizing (minimum 16px base)

**Reliability**
- NFR28: Target 99.5% uptime
- NFR29: Planned maintenance during low-usage hours
- NFR30: Streak data never lost due to system error
- NFR31: Session logs preserved even if push fails
- NFR32: Daily database backups with 30-day retention
- NFR33: App functions without real-time if Pusher unavailable
- NFR34: Fallback to polling if push connection fails
- NFR35: Clear user messaging during outages

## Additional Requirements

**From Architecture - Starter Template & Infrastructure**
- ARCH1: Initialize project using create-next-app + shadcn/ui (Next.js 16, React 19, TypeScript, Tailwind 4, Turbopack)
- ARCH2: Database: PostgreSQL hosted on Railway with Prisma ORM
- ARCH3: Authentication: Better Auth with OAuth 2.0 (Google, Apple), JWT tokens
- ARCH4: Real-time: Pusher Channels for presence and notifications
- ARCH5: State Management: Zustand with 4 bounded stores (Timer, Presence, Offline, User)
- ARCH6: Timer Persistence: IndexedDB via idb-keyval + Zustand persist
- ARCH7: CI/CD: GitHub Actions + Vercel CLI with quality gates
- ARCH8: Monitoring: Vercel Analytics + Mixpanel + Sentry
- ARCH9: API Pattern: Hybrid (Server Actions for mutations, API Routes for webhooks/integrations)
- ARCH10: Validation: Zod for runtime validation with react-hook-form

**From Architecture - Implementation Patterns**
- ARCH11: Follow naming conventions: PascalCase models, snake_case tables/columns, camelCase code
- ARCH12: Use ActionResult<T> pattern for all Server Actions
- ARCH13: Co-locate tests with source files ({Component}.test.tsx)
- ARCH14: Use @/* import alias for cross-boundary imports
- ARCH15: Create index.ts re-exports for feature folders
- ARCH16: Follow component file structure order (imports, types, component, helpers)

**From Architecture - Project Structure**
- ARCH17: Implement hybrid project organization (app router + features folders)
- ARCH18: Create 8 custom components: StreakRing, PresenceAvatarStack, BookCard, AuthorShimmerBadge, SessionTimer, KudosButton, ActivityFeedItem, ReadingRoomPanel
- ARCH19: Implement Pusher event patterns for presence and notifications
- ARCH20: Set up Storybook for component documentation

**From UX Design - Visual & Interaction**
- UX1: Implement "Warm Hearth" color palette (amber primary, golden author shimmer)
- UX2: Mobile-first responsive design with bottom tab navigation
- UX3: One-tap interactions for core actions (kudos, session start)
- UX4: Optimistic UI for social actions
- UX5: Framer Motion animations respecting prefers-reduced-motion
- UX6: 44px minimum touch targets throughout
- UX7: Toast notifications with gentle styling (no sounds by default)
- UX8: Empty states with guidance (never show naked zeros)

**From UX Design - PWA & Offline**
- UX9: PWA with Service Worker for offline session logging
- UX10: Web App Manifest for Add to Home Screen
- UX11: Push notifications for kudos and author presence
- UX12: Offline queue for pending actions with sync on reconnect

**From UX Design - Accessibility**
- UX13: Keyboard navigation for all interactive elements
- UX14: Screen reader announcements for dynamic content (aria-live)
- UX15: Focus management (trap in modals, restore on close)
- UX16: Reduced motion support for all animations

## FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Google/Apple sign-in |
| FR2 | Epic 1 | Profile management |
| FR3 | Epic 4 | Follow users |
| FR4 | Epic 4 | Unfollow users |
| FR5 | Epic 4 | View other profiles |
| FR6 | Epic 5 | Author claim/verification |
| FR7 | Epic 2 | Book search |
| FR8 | Epic 2 | Add books to library |
| FR9 | Epic 2 | Update reading status |
| FR10 | Epic 2 | Remove books |
| FR11 | Epic 2 | View book details |
| FR12 | Epic 2 | See author claimed status |
| FR13 | Epic 3 | Log reading session |
| FR14 | Epic 3 | Session history |
| FR15 | Epic 3 | Total reading time |
| FR16 | Epic 3 | Sessions for streak calc |
| FR17 | Epic 3 | Set daily goal |
| FR18 | Epic 3 | View streak count |
| FR19 | Epic 3 | Streak credit |
| FR20 | Epic 3 | Streak freeze |
| FR21 | Epic 3 | Streak reset |
| FR22 | Epic 3 | Streak history |
| FR23 | Epic 4 | Activity feed |
| FR24 | Epic 4 | Give kudos |
| FR25 | Epic 4 | Kudos notifications |
| FR26 | Epic 4 | View kudos received |
| FR27 | Epic 4 | Feed content types |
| FR28 | Epic 5 | Join reading room |
| FR29 | Epic 5 | See room occupants |
| FR30 | Epic 5 | Author last presence |
| FR31 | Epic 5 | Author join notification |
| FR32 | Epic 5 | Leave reading room |
| FR33 | Epic 5 | Author visual distinction |
| FR34 | Epic 6 | Moderation queue |
| FR35 | Epic 6 | Remove content |
| FR36 | Epic 6 | Warn/suspend users |
| FR37 | Epic 6 | Author verification review |
| FR38 | Epic 6 | Platform metrics |
| FR39 | Epic 6 | User/session lookup |
