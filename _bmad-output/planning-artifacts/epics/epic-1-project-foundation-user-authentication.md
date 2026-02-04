# Epic 1: Project Foundation & User Authentication

## Story 1.1: Project Initialization & Core Infrastructure

As a **developer**,
I want **the project initialized with the selected tech stack**,
So that **I have a working foundation to build features on**.

**Acceptance Criteria:**

**Given** no project exists
**When** I run the initialization commands from the Architecture document
**Then** a Next.js 16 project is created with TypeScript, Tailwind 4, and App Router
**And** shadcn/ui is initialized with the "Warm Hearth" color palette configured
**And** Prisma is configured with Railway PostgreSQL connection
**And** the User model exists with fields: id, email, name, bio, avatarUrl, createdAt, updatedAt
**And** ESLint and Prettier are configured per Architecture patterns
**And** the @/* import alias is working
**And** `npm run dev` starts the application without errors
**And** GitHub Actions CI pipeline runs lint, type-check, and build on push

---

## Story 1.2: OAuth Authentication with Google

As a **user**,
I want **to sign up and log in using my Google account**,
So that **I can access the app without creating a new password**.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I click "Continue with Google"
**Then** I am redirected to Google's OAuth consent screen
**And** after granting permission, I am redirected back to the app
**And** a user account is created if this is my first login
**And** I am logged in and redirected to the home page
**And** my session persists across page refreshes
**And** my name and avatar are pulled from my Google profile

**Given** I am logged in
**When** I click "Log out"
**Then** my session is terminated
**And** I am redirected to the login page
**And** protected routes redirect me to login

**Given** I am not logged in
**When** I try to access a protected route (e.g., /home)
**Then** I am redirected to the login page
**And** after login, I am returned to the originally requested page

**Given** the OAuth flow fails (user cancels or error)
**When** I am redirected back to the app
**Then** I see a clear error message
**And** I can try again

---

## Story 1.3: OAuth Authentication with Apple

As a **user**,
I want **to sign up and log in using my Apple account**,
So that **I have an alternative sign-in option and iOS compliance**.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I click "Continue with Apple"
**Then** I am redirected to Apple's OAuth consent screen
**And** after granting permission, I am redirected back to the app
**And** a user account is created if this is my first login
**And** I am logged in and redirected to the home page

**Given** I previously signed up with Google using the same email
**When** I sign in with Apple using that email
**Then** my accounts are linked (same user, multiple providers)
**And** I can sign in with either provider

**Given** Apple hides my email (private relay)
**When** I complete sign-in
**Then** the app handles the private relay email correctly
**And** my account is created successfully

---

## Story 1.4: User Profile Management

As a **user**,
I want **to view and edit my profile information**,
So that **I can personalize my presence on the platform**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to my profile page (/profile)
**Then** I see my current name, bio, avatar, and reading preferences
**And** I see my account email (read-only)
**And** I see when I joined

**Given** I am on my profile page
**When** I click "Edit Profile"
**Then** I can edit my display name (required, max 50 chars)
**And** I can edit my bio (optional, max 200 chars)
**And** I can set reading preferences (favorite genres - multi-select)
**And** I can toggle "Show my reading activity to followers" (default: on)

**Given** I have made changes to my profile
**When** I click "Save"
**Then** my profile is updated immediately (optimistic UI)
**And** I see a success toast notification
**And** the changes persist after page refresh

**Given** I enter invalid data (e.g., empty name, bio too long)
**When** I try to save
**Then** I see inline validation errors
**And** the save is prevented until errors are fixed

---

## Story 1.5: Bottom Navigation & App Shell

As a **user**,
I want **consistent navigation across the app**,
So that **I can easily move between main sections**.

**Acceptance Criteria:**

**Given** I am logged in on any page
**When** I view the app on mobile (< 768px)
**Then** I see a bottom tab bar with 5 tabs: Home, Search, Library, Activity, Profile
**And** each tab has an icon and label
**And** the active tab is visually highlighted (filled icon, primary color)
**And** touch targets are at least 44x44px

**Given** I am on a tab
**When** I tap the same tab again
**Then** the page scrolls to the top

**Given** I am on any main page
**When** I view the page header
**Then** I see the page title centered
**And** I see contextual actions on the right (if applicable)
**And** I see a back arrow on the left for nested pages

**Given** I am on desktop (≥ 1024px)
**When** I view the navigation
**Then** the navigation adapts appropriately (side nav or persistent header)
**And** all touch targets remain accessible via keyboard

**Given** I navigate between tabs
**When** the page transitions
**Then** transitions are smooth (200ms, ease-out)
**And** the previous page state is preserved when I return

---
