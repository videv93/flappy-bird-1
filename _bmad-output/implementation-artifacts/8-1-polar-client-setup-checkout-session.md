# Story 8.1: Polar Client Setup & Checkout Session

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a free tier user who wants to upgrade,
I want to initiate a Polar checkout for the $9.99 premium payment,
so that I can securely pay and unlock premium features.

## Acceptance Criteria

1. **Given** `@polar-sh/sdk` is installed and configured **When** the app initializes **Then** `src/lib/polar.ts` exports a configured Polar client using environment variables **And** `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` env vars are required
2. **Given** a free tier user clicks the upgrade CTA **When** the `createCheckout` server action is called **Then** a Polar Checkout session is created for the $9.99 one-time product **And** the user is redirected to Polar's hosted checkout page **And** the checkout includes the user's ID as metadata for webhook matching
3. **Given** a premium user attempts to access checkout **When** the `createCheckout` server action is called **Then** the action returns an error indicating user is already premium

## Tasks / Subtasks

- [x] Task 1: Install `@polar-sh/sdk` and update environment configuration (AC: 1)
  - [x] 1.1: Run `npm install @polar-sh/sdk`
  - [x] 1.2: Add `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, and `POLAR_PRODUCT_PREMIUM_ID` to `.env.example` with descriptive comments
  - [x] 1.3: Add `PREMIUM_PRICE_AMOUNT` constant (999 cents = $9.99) to `src/lib/config/constants.ts`

- [x] Task 2: Create `src/lib/polar.ts` — Polar client initialization (AC: 1)
  - [x] 2.1: Create `src/lib/polar.ts` — instantiate `Polar` from `@polar-sh/sdk` with `accessToken` from `process.env.POLAR_ACCESS_TOKEN`
  - [x] 2.2: Accept optional `server` param from `process.env.POLAR_SERVER` (default: `'production'`, use `'sandbox'` for dev)
  - [x] 2.3: Export the `polar` client instance as named export
  - [x] 2.4: Implement the `PaymentProvider` interface from `@/lib/billing/types` — create `PolarPaymentProvider` class that wraps the Polar SDK client (NFR3 vendor abstraction)
  - [x] 2.5: Export `polarPaymentProvider` singleton instance of `PolarPaymentProvider`

- [x] Task 3: Create `src/actions/billing/createCheckout.ts` — server action (AC: 2, 3)
  - [x] 3.1: Create `src/actions/billing/createCheckout.ts` with `'use server'` directive
  - [x] 3.2: Authenticate via `auth.api.getSession()` + `headers()` — return `{ success: false, error: 'Unauthorized' }` if no session
  - [x] 3.3: Check `isPremium(session.user.id)` — if already premium, return `{ success: false, error: 'Already premium' }`
  - [x] 3.4: Call `polar.checkouts.create()` with:
    - `products: [process.env.POLAR_PRODUCT_PREMIUM_ID]` — the one-time $9.99 product ID from Polar dashboard
    - `customerEmail: session.user.email`
    - `successUrl: `${process.env.BETTER_AUTH_URL}/upgrade/success?checkout_id={CHECKOUT_ID}``
    - `metadata: { userId: session.user.id }` — for webhook matching in Story 8.2
  - [x] 3.5: Return `ActionResult<{ checkoutUrl: string }>` with the `checkout.url` from Polar response
  - [x] 3.6: Wrap in try/catch — log errors with `console.error`, return generic error message

- [x] Task 4: Create `src/actions/billing/index.ts` — barrel exports (AC: 2)
  - [x] 4.1: Export `createCheckout` from `./createCheckout`

- [x] Task 5: Replace `/upgrade` placeholder page with checkout trigger (AC: 2, 3)
  - [x] 5.1: Rewrite `src/app/(main)/upgrade/page.tsx` — replace "Coming Soon" placeholder with premium upgrade page
  - [x] 5.2: Show premium benefits summary: "Unlimited book tracking for a one-time payment of $9.99"
  - [x] 5.3: Add "Proceed to Payment" primary CTA button that calls `createCheckout` server action via `useTransition`
  - [x] 5.4: On success: redirect to `checkoutUrl` using `window.location.href` (external Polar-hosted page)
  - [x] 5.5: On error (already premium): show toast message and link back to library
  - [x] 5.6: On generic error: show toast.error with retry option
  - [x] 5.7: Show loading spinner on button during checkout creation
  - [x] 5.8: If user is already premium (detect via `getBookLimitInfo` on page load), show "You're already premium!" with link to library instead of checkout button

- [x] Task 6: Write tests for `createCheckout` server action (AC: 2, 3)
  - [x] 6.1: Create `src/actions/billing/createCheckout.test.ts`
  - [x] 6.2: Test returns unauthorized when no session
  - [x] 6.3: Test returns "Already premium" error for premium user (mock `isPremium` → true)
  - [x] 6.4: Test creates checkout and returns checkoutUrl for free user
  - [x] 6.5: Test passes userId in metadata
  - [x] 6.6: Test returns generic error when Polar SDK throws
  - [x] 6.7: Mock `@polar-sh/sdk` — mock `Polar` constructor and `checkouts.create` method

- [x] Task 7: Write tests for upgrade page (AC: 2, 3)
  - [x] 7.1: Create `src/app/(main)/upgrade/page.test.tsx`
  - [x] 7.2: Test renders premium benefits and CTA button
  - [x] 7.3: Test calls createCheckout on button click
  - [x] 7.4: Test shows loading state during checkout creation
  - [x] 7.5: Test shows error toast on failure
  - [x] 7.6: Test shows "Already premium" state when user is premium

## Dev Notes

### Architecture Requirements

- **PaymentProvider Interface (NFR3):** `src/lib/billing/types.ts` already defines a `PaymentProvider` interface with `createCheckout`, `verifyWebhook`, and `getPaymentStatus` methods. Story 8.1 MUST create a Polar-specific implementation. This abstracts vendor lock-in — if Polar is replaced later, only the implementation changes.
- **Server Action Pattern:** All server actions use `ActionResult<T>` discriminated union. The `createCheckout` action follows the same auth + validation + operation + return pattern as existing actions like `addToLibrary`.
- **API Pattern Decision:** Per architecture doc: "Is it a webhook or external callback? → API Route". The checkout creation is a mutation (Server Action), NOT an API route. The webhook handler (Story 8.2) will be an API route.
- **Import Convention:** ALWAYS use `@/` alias for cross-boundary imports.

### Technical Specifications — Polar SDK

- **Package:** `@polar-sh/sdk` (latest: ~0.42.x)
- **Initialization:**
  ```typescript
  import { Polar } from '@polar-sh/sdk';
  const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: 'production', // or 'sandbox' for development
  });
  ```
- **Checkout Creation:**
  ```typescript
  const checkout = await polar.checkouts.create({
    products: [productId],        // Product ID from Polar dashboard
    customerEmail: user.email,
    successUrl: `${baseUrl}/upgrade/success?checkout_id={CHECKOUT_ID}`,
    metadata: { userId: user.id }, // Passed to webhook in Story 8.2
  });
  // checkout.url → redirect user to this Polar-hosted checkout page
  ```
- **Checkout Response Shape:** `{ id, url, status, amount, currency, metadata, ... }` — we only need `url` for this story.
- **Metadata Constraints:** Keys max 40 chars, string values max 500 chars, max 50 pairs. Our `{ userId }` fits easily.
- **One-time vs Subscription:** Product type is configured in Polar dashboard. Create the product as "One-time purchase" for $9.99. The SDK doesn't differentiate — checkout.create works the same way.

### Existing Code to Reuse (DO NOT RECREATE)

- **`src/lib/billing/types.ts`** — PaymentProvider interface, CheckoutSession, WebhookEvent, PaymentResult types. ALREADY EXISTS from Story 7.1. Implement this interface, don't redefine it.
- **`src/lib/premium.ts`** — `isPremium(userId)` utility. Use for premium guard check.
- **`src/lib/config/constants.ts`** — Existing constants file. Add `PREMIUM_PRICE_AMOUNT` here.
- **`src/lib/auth.ts`** — Auth server config. Use `auth.api.getSession()` pattern.
- **`prisma/schema.prisma`** — Payment model, PremiumStatus enum, User.premiumStatus, User.polarCustomerId all already exist. NO schema changes in this story.
- **`src/app/(main)/upgrade/page.tsx`** — Placeholder page from Story 7.3. REPLACE contents (not create new file).
- **`src/components/features/books/UpgradePromptDialog.tsx`** — CTA links to `/upgrade`. Do NOT modify — the /upgrade page now handles checkout, so the link is correct.

### Existing Code to NOT Modify

- `prisma/schema.prisma` — No schema changes needed
- `src/lib/premium.ts` — Already complete from Story 7.1
- `src/lib/billing/types.ts` — Interface already defined, implement it
- `src/components/features/books/UpgradePromptDialog.tsx` — CTA already links to /upgrade
- `src/components/features/books/AddToLibraryButton.tsx` — Book limit flow already complete
- `src/components/features/books/BookLimitBadge.tsx` — Already complete
- `src/components/features/books/LibraryView.tsx` — Already complete

### Critical Implementation Details

1. **PaymentProvider Implementation:** The `PolarPaymentProvider` class must implement all three methods from the interface (`createCheckout`, `verifyWebhook`, `getPaymentStatus`). For this story, only `createCheckout` needs a real implementation. The other two can throw `'Not implemented'` — Story 8.2 implements `verifyWebhook` and Story 8.3 implements `getPaymentStatus`.

2. **Environment Variable Validation:** The `polar.ts` module should fail fast if `POLAR_ACCESS_TOKEN` is missing. Use a runtime check at module initialization. `POLAR_PRODUCT_PREMIUM_ID` is needed only by the server action, not the client init.

3. **Redirect Pattern:** After `createCheckout` returns the `checkoutUrl`, the upgrade page must redirect using `window.location.href = checkoutUrl` (not `router.push`). This is an external URL to Polar's hosted checkout — Next.js router cannot handle external redirects.

4. **Success URL:** The `successUrl` passed to Polar uses `{CHECKOUT_ID}` as a template variable that Polar replaces with the actual checkout ID. Story 8.3 will create the `/upgrade/success` page that reads this query param. For now, this URL doesn't need to exist — Polar will redirect there after payment regardless.

5. **Upgrade Page Premium Guard:** The upgrade page should check if the user is already premium on mount (using `getBookLimitInfo` which already exists). If premium, show a "You're already premium!" message instead of the checkout button. This prevents wasted checkout sessions.

6. **Error Handling in createCheckout:** The Polar SDK may throw various errors (network, auth, invalid product ID). Catch all errors, log them, and return a generic error message. Do NOT expose Polar SDK error details to the client.

### UX Design Compliance

- **Celebratory tone:** The upgrade page should maintain the warm, encouraging tone from the UpgradePromptDialog ("You're a power reader!")
- **Warm amber palette:** Use existing primary button (amber) for the CTA
- **44px touch targets:** All interactive elements must meet minimum size
- **Loading states:** Show spinner on CTA button during checkout creation
- **Error feedback:** Use `toast.error()` from sonner for failures
- **No payment form on our site:** Polar handles the actual payment UI — we just redirect

### Testing Strategy

- **createCheckout server action tests:** Mock `@polar-sh/sdk` (mock `Polar` class constructor + `checkouts.create`), mock `@/lib/premium`, mock `@/lib/auth` + `next/headers`. Test auth guard, premium guard, successful checkout, and error handling.
- **Upgrade page tests:** Mock `@/actions/billing` and `@/actions/books`. Test rendering, button click triggering createCheckout, loading state, error state, already-premium state.
- **Do NOT test Polar SDK internals** — we mock the SDK boundary.
- **Polar client initialization tests are optional** — it's a thin wrapper with no logic beyond config.
- **Test file locations:** Co-located with source files per architecture document.

### File Structure Plan

```
src/
├── lib/
│   ├── polar.ts                          # NEW: Polar SDK client + PolarPaymentProvider
│   └── config/
│       └── constants.ts                  # MODIFIED: Add PREMIUM_PRICE_AMOUNT
├── actions/
│   └── billing/
│       ├── createCheckout.ts             # NEW: Server action for checkout creation
│       ├── createCheckout.test.ts        # NEW: Server action tests
│       └── index.ts                      # NEW: Barrel exports
├── app/
│   └── (main)/
│       └── upgrade/
│           ├── page.tsx                  # MODIFIED: Replace placeholder with checkout page
│           └── page.test.tsx             # NEW: Upgrade page tests
.env.example                              # MODIFIED: Add Polar env vars
```

### Previous Story Intelligence (Story 7.3)

- **Placeholder upgrade page:** `src/app/(main)/upgrade/page.tsx` currently shows "Premium Coming Soon" with Sparkles icon and "Back to Library" link. Story 8.1 REPLACES this entirely with the actual checkout flow.
- **UpgradePromptDialog CTA:** Already links to `/upgrade` — no change needed. The upgraded /upgrade page will handle the checkout.
- **Test count baseline:** 1717 tests passing across 184 test files. New tests must not break existing ones.
- **Pre-existing issues:** 3 TypeScript errors (Capacitor, Vercel modules) — all pre-existing, not in our files.
- **Prisma mock pattern from 7.3:** `vi.mock('@/lib/prisma', ...)` — extend for billing tests.
- **isPremium mock pattern:** `vi.fn().mockResolvedValue(true/false)` — reuse in createCheckout tests.
- **Story 7.3 dev notes:** "Epic 8 will replace the /upgrade placeholder with actual Polar checkout flow" — that's exactly what this story does.

### Git Intelligence

Recent commits show:
- `2242479`: feat: add book limit enforcement for free users (Story 7.2)
- `4e57cfd`: chore: fix build
- `bcb6090`: feat: add premium data model, payment schema, and isPremium utility (Story 7.1)
- Pattern: Feature commits use `feat:` prefix with story reference
- Files modified in 7.1: `schema.prisma`, `premium.ts`, `billing/types.ts`, `constants.ts`
- Files modified in 7.3: `UpgradePromptDialog.tsx`, `BookLimitBadge.tsx`, `upgrade/page.tsx`

### Project Structure Notes

- All new files follow established patterns: `src/lib/` for utilities, `src/actions/billing/` for server actions (new domain directory following existing `actions/books/`, `actions/profile/` pattern)
- The `/upgrade` page stays in `src/app/(main)/upgrade/` inside the authenticated route group with AppShell layout
- `src/lib/polar.ts` follows the same pattern as `src/lib/prisma.ts` (thin wrapper exporting configured client)
- No conflicts with existing code patterns

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Acceptance criteria for Polar Client Setup & Checkout Session
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2] — Polar Payment & Premium Unlock overview, FR3 (unlimited premium), FR4 (Polar integration), FR10 (unlock flow)
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — Server Actions for mutations, API Routes for webhooks
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — ActionResult<T> pattern, @/ import alias
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions] — Hybrid API pattern (Server Actions + API Routes)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy] — Primary amber button, 44px touch targets
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns] — Toast for errors, loading states
- [Source: src/lib/billing/types.ts] — PaymentProvider interface, CheckoutSession, WebhookEvent, PaymentResult types
- [Source: src/lib/premium.ts] — isPremium(userId) utility from Story 7.1
- [Source: src/lib/config/constants.ts] — FREE_TIER_BOOK_LIMIT from Story 7.2, add PREMIUM_PRICE_AMOUNT
- [Source: src/app/(main)/upgrade/page.tsx] — Placeholder page to replace from Story 7.3
- [Source: src/components/features/books/UpgradePromptDialog.tsx] — CTA links to /upgrade (unchanged)
- [Source: _bmad-output/implementation-artifacts/7-3-upgrade-prompt-premium-ui-hints.md] — Previous story learnings and patterns
- [Source: @polar-sh/sdk docs] — Polar SDK v0.42.x, checkout.create API, metadata support

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- **vi.mock hoisting fix (Task 6):** `createCheckout.test.ts` initially had `ReferenceError: Cannot access 'mockCheckoutsCreate' before initialization` because `vi.mock` factories are hoisted above variable declarations. Fixed by using `vi.hoisted()` to declare the mock function before the `vi.mock` call.
- **Polar SDK type verification (Task 2):** Read `node_modules/@polar-sh/sdk` `.d.ts` files to confirm `checkout.url`, `checkout.amount`, and `checkout.currency` are non-nullable fields. Removed unnecessary `?? 0` / `?? 'usd'` null coalescing operators.

### Completion Notes List

- **Task 1:** Installed `@polar-sh/sdk@0.43.0`. Added 4 env vars to `.env.example` (POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET, POLAR_PRODUCT_PREMIUM_ID, POLAR_SERVER). Added `PREMIUM_PRICE_AMOUNT = 999` to constants.
- **Task 2:** Created `src/lib/polar.ts` with Polar client initialization and `PolarPaymentProvider` class implementing the `PaymentProvider` interface from `@/lib/billing/types`. `verifyWebhook` and `getPaymentStatus` throw "Not implemented" per story spec (deferred to Stories 8.2/8.3). Typecheck passes.
- **Task 3:** Created `src/actions/billing/createCheckout.ts` server action with auth guard, premium guard, env var validation, Polar checkout creation, and error handling. Returns `ActionResult<{ checkoutUrl: string }>`.
- **Task 4:** Created `src/actions/billing/index.ts` barrel export for `createCheckout`.
- **Task 5:** Replaced placeholder upgrade page with full checkout flow. Detects premium status on mount via `getBookLimitInfo`. Shows "Already Premium" state or upgrade CTA with benefits. Uses `useTransition` for checkout creation with loading spinner. Redirects to Polar via `window.location.href`. Toast errors on failure. All interactive elements meet 44px touch target minimum.
- **Task 6:** Created 6 tests for `createCheckout` server action. Tests cover: unauthorized, already premium, successful checkout with URL return, userId metadata passing, Polar SDK error handling, missing POLAR_PRODUCT_PREMIUM_ID env var. All 6 pass.
- **Task 7:** Created 6 tests for upgrade page. Tests cover: renders benefits/CTA, calls createCheckout on click, loading state during checkout, error toast on failure, already-premium detection on mount, already-premium error from createCheckout. All 6 pass.
- **Regression:** Full suite: 1733 passed, 7 failed (all pre-existing in `src/actions/admin/getSessionHistory.test.ts` — parseUserAgent tests unrelated to this story).

### Change Log

- 2026-02-11: All 7 tasks implemented and tested. Story moved to review.
- 2026-02-11: Code review — fixed 6 issues (2 HIGH, 4 MEDIUM). Story moved to done.
  - [HIGH] Added POLAR_ACCESS_TOKEN runtime validation with fail-fast error
  - [HIGH] Refactored createCheckout to use polarPaymentProvider abstraction (NFR3)
  - [MEDIUM] Added error handling + fallback for getBookLimitInfo failure on upgrade page
  - [MEDIUM] Used PREMIUM_PRICE_AMOUNT constant for price display instead of hardcoded string
  - [MEDIUM] Added window.location.href redirect assertion in page test
  - [MEDIUM] Added loading spinner state while premium status is being checked
  - [LOW] Fixed POLAR_SERVER env var validation (safe parser instead of unsafe cast)
  - [LOW] Added afterEach env var cleanup in createCheckout tests
  - Added 2 new tests: initial loading state, getBookLimitInfo failure fallback (14 total)

### File List

**New Files:**
- `src/lib/polar.ts` — Polar SDK client initialization + PolarPaymentProvider class
- `src/actions/billing/createCheckout.ts` — Server action using PaymentProvider abstraction
- `src/actions/billing/createCheckout.test.ts` — 6 tests for createCheckout server action
- `src/actions/billing/index.ts` — Barrel exports for billing actions
- `src/app/(main)/upgrade/page.test.tsx` — 8 tests for upgrade page

**Modified Files:**
- `src/app/(main)/upgrade/page.tsx` — Full checkout flow with loading state and error handling
- `src/lib/config/constants.ts` — Added `PREMIUM_PRICE_AMOUNT = 999`
- `.env.example` — Added Polar environment variables section
- `package.json` / `package-lock.json` — Added `@polar-sh/sdk@0.43.0` dependency
