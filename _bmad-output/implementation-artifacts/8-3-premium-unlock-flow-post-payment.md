# Story 8.3: Premium Unlock Flow & Post-Payment Experience

Status: done

## Story

As a user who just paid for premium,
I want to be redirected back to the app with premium unlocked,
so that I can immediately add more books.

## Acceptance Criteria

1. **Success redirect** — User completes Polar checkout → redirected to `/upgrade/success?checkout_id={CHECKOUT_ID}` → success page confirms premium activation → page shows "Welcome to Premium!" with CTA to add books → `getPaymentStatus` server action confirms premium status.

2. **Payment failure/cancellation** — User's payment fails or is cancelled on Polar → user returns to app → friendly message with option to retry checkout → no premium status change occurs.

3. **Post-premium experience** — Newly premium user returns to book add flow → adds 4th+ book → book added successfully with no limit → "X/3 books" `BookLimitBadge` no longer shown (already handled by existing `isPremium` checks in Stories 7.2/7.3).

## Tasks / Subtasks

- [x] Task 1: Implement `PolarPaymentProvider.getPaymentStatus()` (AC: #1)
  - [x] 1.1 Implement the stubbed method in `src/lib/polar.ts` — query Polar API via `this.client.checkouts.get(checkoutId)` to retrieve checkout status, then query local DB for Payment record and User premium status
  - [x] 1.2 Return `PaymentResult` with `success`, `checkoutId`, `customerId`, `amount`, `currency` fields
  - [x] 1.3 Handle cases: checkout not found on Polar, payment not yet in DB (webhook pending), user already premium
  - [x] 1.4 Write tests in `src/lib/polar.test.ts` (add to existing test file)

- [x] Task 2: Create `getPaymentStatus` server action (AC: #1)
  - [x] 2.1 Create `src/actions/billing/getPaymentStatus.ts` following established server action pattern
  - [x] 2.2 Accept `checkoutId: string` parameter, validate with Zod
  - [x] 2.3 Auth check (must be logged in)
  - [x] 2.4 Call `polarPaymentProvider.getPaymentStatus(checkoutId)` and also query `prisma.user` for current `premiumStatus`
  - [x] 2.5 Return `ActionResult<{ isPremium: boolean; paymentStatus: string }>` — where `isPremium` reflects the DB `premiumStatus` field (source of truth, not Polar API)
  - [x] 2.6 Handle edge case: webhook hasn't arrived yet (Payment record not in DB) — return `isPremium: false, paymentStatus: 'PROCESSING'` so the UI can show a "verifying payment" state
  - [x] 2.7 Export from `src/actions/billing/index.ts`
  - [x] 2.8 Write tests in `src/actions/billing/getPaymentStatus.test.ts`

- [x] Task 3: Create `/upgrade/success` page (AC: #1, #2)
  - [x] 3.1 Create `src/app/(main)/upgrade/success/page.tsx` as a Client Component
  - [x] 3.2 Read `checkout_id` from `useSearchParams()`
  - [x] 3.3 On mount, call `getPaymentStatus(checkoutId)` to verify premium activation
  - [x] 3.4 **Success state**: "Welcome to Premium!" celebration with Sparkles icon, benefits confirmation, CTA "Start Adding Books" → links to `/search`
  - [x] 3.5 **Processing state**: "Verifying your payment..." with spinner and auto-retry polling (poll `getPaymentStatus` every 3 seconds, max 5 attempts) for webhook race condition
  - [x] 3.6 **Error/cancelled state**: "Something went wrong" with "Try Again" link to `/upgrade` and "Contact Support" option
  - [x] 3.7 **Missing checkout_id**: Redirect to `/upgrade` or show error
  - [x] 3.8 Match existing UX patterns: warm amber accents, celebratory tone, 44px touch targets, Loader2 spinner
  - [x] 3.9 Write tests in `src/app/(main)/upgrade/success/page.test.tsx`

- [x] Task 4: Update checkout to include cancel URL (AC: #2)
  - [x] 4.1 In `src/lib/polar.ts` `createCheckout()`, add `returnUrl` parameter pointing to `/upgrade?cancelled=true` (Polar SDK uses `returnUrl` not `cancelUrl`)
  - [x] 4.2 In `src/app/(main)/upgrade/page.tsx`, check for `?cancelled=true` query param and show a toast: "Payment cancelled. You can try again whenever you're ready."
  - [x] 4.3 Update existing createCheckout tests if needed — added `useSearchParams` mock to existing page tests

## Dev Notes

### Architecture & Patterns

- **Server Action pattern**: All actions return `ActionResult<T>` discriminated union. See `src/actions/billing/createCheckout.ts` for the exact pattern to follow.
- **Import convention**: Always use `@/` alias for cross-boundary imports.
- **PaymentProvider interface**: `getPaymentStatus` is already declared in `src/lib/billing/types.ts` returning `Promise<PaymentResult>`. The `PaymentResult` type has fields: `success`, `checkoutId`, `customerId?`, `amount`, `currency`.
- **Premium source of truth**: `src/lib/premium.ts` `isPremium(userId)` queries `User.premiumStatus` field. The success page should rely on the DB state (set by webhook in 8.2), NOT on the Polar API response alone.
- **Webhook race condition**: The webhook from Polar (`order.created`) may arrive before or after the user is redirected to the success page. The success page MUST handle the case where the webhook hasn't been processed yet by polling.

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `PolarPaymentProvider` class | `src/lib/polar.ts` | Add `getPaymentStatus` implementation to existing stub |
| `polarPaymentProvider` singleton | `src/lib/polar.ts:94` | Use this instance in server action |
| `PaymentResult` type | `src/lib/billing/types.ts` | Already defined, return this from `getPaymentStatus` |
| `isPremium()` utility | `src/lib/premium.ts` | Use for DB-side premium check |
| Upgrade page patterns | `src/app/(main)/upgrade/page.tsx` | Match styling, icons (Sparkles, Loader2, CheckCircle), layout |
| `PREMIUM_PRICE_AMOUNT` | `src/lib/config/constants.ts` | 999 (cents) |
| `createCheckout` server action | `src/actions/billing/createCheckout.ts` | Reference for action pattern |
| Billing barrel exports | `src/actions/billing/index.ts` | Add `getPaymentStatus` export here |
| `getBookLimitInfo` action | `src/actions/books/getBookLimitInfo.ts` | Reference for how premium status is checked client-side |

### Polar SDK API Reference

**Getting checkout status** (for `getPaymentStatus` implementation):
```typescript
// Polar SDK v0.43.0
const checkout = await this.client.checkouts.get({ id: checkoutId });
// checkout.status: 'open' | 'expired' | 'confirmed' | 'succeeded' | 'failed'
// checkout.customerId: string | null
```

**Success URL template**: Already configured in Story 8.1:
```
`${process.env.BETTER_AUTH_URL}/upgrade/success?checkout_id={CHECKOUT_ID}`
```
`{CHECKOUT_ID}` is a Polar template variable that gets replaced with the actual checkout ID.

### Webhook Timing Consideration

The `/api/webhooks/polar` handler (Story 8.2) processes `order.created` events and atomically:
1. Creates a `Payment` record with `polarCheckoutId`
2. Updates `User.premiumStatus` to `PREMIUM`

The success page redirect and webhook delivery are **asynchronous** — either can arrive first. The polling strategy in Task 3.5 handles this race condition.

### Testing Approach

- Mock `polarPaymentProvider` in server action tests (same pattern as `createCheckout.test.ts`)
- Mock `getPaymentStatus` server action in page tests
- Test all states: loading, success, processing/polling, error, missing checkout_id
- Use `vi.hoisted()` for mock hoisting (established pattern from 8.1/8.2)
- Co-locate test files with source files

### Project Structure Notes

- Success page at `src/app/(main)/upgrade/success/page.tsx` follows App Router convention and inherits the `(main)` layout with AppShell/navigation
- No new route protection needed — `/upgrade/success` is under `(main)` which is already protected by middleware
- No new Prisma schema changes needed — all models exist from Stories 7.1/8.2

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR10, FR12]
- [Source: _bmad-output/planning-artifacts/architecture.md — Payment Integration, API Routes]
- [Source: _bmad-output/implementation-artifacts/8-1-polar-client-setup-checkout-session.md — Checkout flow, success URL]
- [Source: _bmad-output/implementation-artifacts/8-2-webhook-handler-payment-processing.md — Webhook handler, Payment model]
- [Source: src/lib/polar.ts — PolarPaymentProvider stub]
- [Source: src/lib/billing/types.ts — PaymentProvider interface, PaymentResult type]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Implemented `PolarPaymentProvider.getPaymentStatus()` using Polar SDK `checkouts.get({ id })` — maps `succeeded` status to `success: true`, returns `customerId` from checkout
- Created `getPaymentStatus` server action with Zod validation, auth check, and DB-as-source-of-truth pattern. Gracefully handles webhook race condition by returning `PROCESSING` status when Polar confirms but DB not yet updated
- Built `/upgrade/success` page with 5 states: loading, success (celebration), processing (polling with 3s interval, 5 max attempts), slow (max attempts exhausted with manual retry), and error. Handles missing checkout_id with dedicated error view
- Added `returnUrl` to checkout creation (Polar SDK uses `returnUrl` not `cancelUrl`) pointing to `/upgrade?cancelled=true`
- Updated upgrade page to detect `?cancelled=true` query param and show checkout-not-completed toast
- Added `useSearchParams` mock to existing upgrade page tests to prevent regression
- TypeScript strict mode passes cleanly
- 35 new/updated tests across 5 test files, all passing. No regressions in full suite

**Code Review Fixes (Claude Opus 4.6):**
- [HIGH] Fixed `returnUrl` toast wording: changed "Payment cancelled" to "Checkout not completed" for accuracy
- [MEDIUM] Added "Taking Longer Than Expected" slow state with "Check Again" manual retry when polling exhausts max attempts
- [MEDIUM] Added test for max polling exhaustion boundary condition
- [MEDIUM] Fixed `useEffect` dependency: extracted `cancelled` variable to prevent re-firing on searchParams object reference changes

### File List

- `src/lib/polar.ts` — Modified: implemented `getPaymentStatus()`, added `returnUrl` to `createCheckout()`
- `src/lib/polar.test.ts` — Modified: added 3 tests for `getPaymentStatus`, added `mockCheckoutsGet`
- `src/actions/billing/getPaymentStatus.ts` — New: server action with Zod validation, auth, webhook race handling
- `src/actions/billing/getPaymentStatus.test.ts` — New: 7 tests covering auth, validation, all status scenarios
- `src/actions/billing/index.ts` — Modified: added `getPaymentStatus` export
- `src/app/(main)/upgrade/success/page.tsx` — New: success page with polling, 5 states (loading/success/processing/slow/error), celebration UX
- `src/app/(main)/upgrade/success/page.test.tsx` — New: 8 tests covering all page states, polling, and max-poll exhaustion
- `src/app/(main)/upgrade/page.tsx` — Modified: added `useSearchParams` for `?cancelled=true` toast, fixed useEffect dependency
- `src/app/(main)/upgrade/page.test.tsx` — Modified: added `useSearchParams` mock
