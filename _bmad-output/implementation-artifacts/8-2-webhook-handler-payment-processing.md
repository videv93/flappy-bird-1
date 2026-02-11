# Story 8.2: Webhook Handler & Payment Processing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who has completed payment on Polar,
I want my premium status activated automatically,
so that I can immediately start tracking unlimited books.

## Acceptance Criteria

1. **Valid webhook received** — Given Polar sends an `order.created` webhook to `/api/webhooks/polar`, When the webhook is received, Then the webhook signature is verified against `POLAR_WEBHOOK_SECRET` (NFR5), And a `Payment` record is created with polarCheckoutId, amount, currency, status=COMPLETED, And the User's `premiumStatus` is updated from FREE to PREMIUM, And the User's `polarCustomerId` is stored from the webhook payload.

2. **Invalid signature** — Given a webhook with an invalid signature, When it is received, Then the handler returns 401 Unauthorized, And no database changes are made.

3. **Duplicate webhook (idempotency)** — Given a duplicate webhook for an already-processed payment, When it is received, Then the handler is idempotent — no duplicate Payment records created, And returns 200 OK.

4. **Order not paid** — Given an `order.created` webhook where `paid` is false (status=pending), When received, Then create Payment record with status=PENDING but do NOT upgrade user to PREMIUM. Premium activation only happens when `paid` is true.

5. **Non-order events** — Given a webhook event that is not `order.created` (e.g. `checkout.updated`), When received, Then return 200 OK without processing (acknowledge to prevent retries).

## Tasks / Subtasks

- [x] Task 1: Create webhook API route handler (AC: #1, #2, #5)
  - [x] 1.1 Create `src/app/api/webhooks/polar/route.ts` with POST handler
  - [x] 1.2 Read raw request body as text (required for signature verification)
  - [x] 1.3 Extract webhook headers and pass to `validateEvent()` from `@polar-sh/sdk/webhooks`
  - [x] 1.4 Catch `WebhookVerificationError` → return 401
  - [x] 1.5 Check event type is `order.created`, return 200 for other events
  - [x] 1.6 Check `data.paid === true` before activating premium
- [x] Task 2: Implement payment processing logic (AC: #1, #3, #4)
  - [x] 2.1 Extract `checkoutId`, `customerId`, `totalAmount`, `currency`, `metadata.userId` from Order payload
  - [x] 2.2 Check for existing Payment with same `polarCheckoutId` (idempotency)
  - [x] 2.3 Create Payment record via Prisma with appropriate status
  - [x] 2.4 If `paid === true`: update User's `premiumStatus` to PREMIUM and store `polarCustomerId` in a single transaction
  - [x] 2.5 Return 200 OK on success
- [x] Task 3: Implement `verifyWebhook` in PolarPaymentProvider (AC: #1, #2)
  - [x] 3.1 Update `src/lib/polar.ts` — implement `verifyWebhook` method using `validateEvent` from `@polar-sh/sdk/webhooks`
  - [x] 3.2 Validate `POLAR_WEBHOOK_SECRET` env var exists at call time
- [x] Task 4: Write tests for webhook route handler (AC: #1-5)
  - [x] 4.1 Test: valid `order.created` webhook creates Payment and activates premium
  - [x] 4.2 Test: invalid signature returns 401, no DB changes
  - [x] 4.3 Test: duplicate webhook returns 200, no duplicate records
  - [x] 4.4 Test: unpaid order creates PENDING payment, no premium upgrade
  - [x] 4.5 Test: non-order event returns 200 without processing
  - [x] 4.6 Test: missing userId in metadata returns error
- [x] Task 5: Write tests for PolarPaymentProvider.verifyWebhook (AC: #1, #2)
  - [x] 5.1 Test: valid signature returns parsed event
  - [x] 5.2 Test: invalid signature throws WebhookVerificationError

## Dev Notes

### Critical: Polar SDK v0.43.0 Webhook API

The Polar SDK provides webhook verification via a **standalone export**:

```typescript
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
```

**`validateEvent(body, headers, secret)`** — Takes raw body string, request headers object, and webhook secret. Returns a typed union of all webhook payload types. Throws `WebhookVerificationError` on invalid signature.

**Important:** The epics file references `checkout.completed` but Polar SDK v0.43.0 uses `order.created` as the event for completed purchases. The `Order` type has:
- `data.id` — order ID
- `data.checkoutId` — links back to the checkout session (use as `polarCheckoutId`)
- `data.customerId` — Polar customer ID (store as `polarCustomerId` on User)
- `data.totalAmount` — amount in **cents** (divide by 100 for Decimal storage, or store cents)
- `data.currency` — currency string
- `data.paid` — boolean, whether payment is complete
- `data.status` — `"pending" | "paid" | "refunded" | "partially_refunded"`
- `data.metadata` — contains `{ userId: string }` set during checkout in Story 8.1
- `data.billingReason` — `"purchase"` for one-time products

### Architecture Patterns

**API Route (not Server Action):** Webhooks MUST use API routes per architecture decision tree. Create `src/app/api/webhooks/polar/route.ts`.

**Error handling pattern:**
```typescript
// Return NextResponse with appropriate status codes
// 200 = success or acknowledged (even for duplicate/irrelevant events)
// 401 = signature verification failed
// 500 = internal error (Polar will retry)
```

**Database transaction:** Use `prisma.$transaction()` to atomically create Payment + update User premium status.

### Existing Code to Build On

- **`src/lib/polar.ts`** — Has `PolarPaymentProvider` class with `verifyWebhook` stub (throws "Not implemented"). Implement it.
- **`src/lib/billing/types.ts`** — Has `WebhookEvent` and `PaymentProvider` interfaces. The `verifyWebhook` method signature: `verifyWebhook(body: string, signature: string): Promise<WebhookEvent>`
- **`src/lib/premium.ts`** — `isPremium()` utility, single source of truth for premium checks
- **`src/actions/billing/createCheckout.ts`** — Sets `metadata: { userId }` during checkout (this is how we link webhook back to user)
- **Prisma schema** — `Payment` model and `PremiumStatus` enum already exist:
  - `Payment.polarCheckoutId` is `@unique` — natural idempotency key
  - `Payment.amount` is `Decimal(10,2)` — convert cents to dollars
  - `Payment.status` uses `PaymentStatus` enum: `PENDING | COMPLETED | FAILED`
  - `User.premiumStatus` uses `PremiumStatus` enum: `FREE | PREMIUM`
  - `User.polarCustomerId` is optional String

### Amount Conversion

Polar sends `totalAmount` in **cents** (integer). Prisma `Payment.amount` is `Decimal(10,2)`. Convert: `totalAmount / 100`.

### Project Structure Notes

- Webhook route: `src/app/api/webhooks/polar/route.ts` (new file)
- Updated: `src/lib/polar.ts` (implement `verifyWebhook`)
- No new dependencies needed — `@polar-sh/sdk` v0.43.0 already installed

### Middleware Consideration

No custom middleware.ts exists in this project — auth is handled via Better Auth session checks in server actions/components. The webhook API route at `/api/webhooks/polar` will be publicly accessible by default. No middleware changes needed.

### Environment Variables

Already configured in `.env.example`:
- `POLAR_WEBHOOK_SECRET` — Required for `validateEvent()`. Format: `whsec_...`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2/Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Routes vs Server Actions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling]
- [Source: prisma/schema.prisma#Payment model]
- [Source: src/lib/polar.ts#PolarPaymentProvider.verifyWebhook]
- [Source: src/lib/billing/types.ts#PaymentProvider interface]
- [Source: node_modules/@polar-sh/sdk/dist/commonjs/webhooks.d.ts#validateEvent]
- [Source: _bmad-output/implementation-artifacts/8-1-polar-client-setup-checkout-session.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- All 15 tests pass after review fixes (7 route handler + 3 verifyWebhook + 5 billing types)
- Full suite: 187/188 files pass (7 pre-existing failures in getSessionHistory.test.ts, unrelated)
- TypeScript typecheck passes clean
- Code review: 4 issues fixed (1 HIGH, 3 MEDIUM), 2 LOW accepted

### Completion Notes List

- Implemented Polar webhook handler at `src/app/api/webhooks/polar/route.ts` using Next.js API route pattern
- Used `validateEvent` from `@polar-sh/sdk/webhooks` for signature verification (not custom HMAC)
- Updated `PolarPaymentProvider.verifyWebhook` — changed interface from `(body, signature)` to `(body, headers)` to match SDK's `validateEvent` API
- Updated `PaymentProvider` interface in `src/lib/billing/types.ts` accordingly
- Fixed existing `types.test.ts` to match updated interface signature
- Payment processing uses `prisma.$transaction` for atomic Payment creation + User premium upgrade
- Idempotency via `polarCheckoutId` unique constraint check before processing
- Amount conversion: Polar cents → Prisma Decimal (divide by 100)
- Handles unpaid orders (PENDING status, no premium upgrade) and non-order events (200 OK, no processing)
- Re-exported `WebhookVerificationError` from `src/lib/polar.ts` for route handler instanceof checks

### File List

- src/app/api/webhooks/polar/route.ts (new)
- src/app/api/webhooks/polar/route.test.ts (new)
- src/lib/polar.ts (modified)
- src/lib/polar.test.ts (new)
- src/lib/billing/types.ts (modified)
- src/lib/billing/types.test.ts (modified)
