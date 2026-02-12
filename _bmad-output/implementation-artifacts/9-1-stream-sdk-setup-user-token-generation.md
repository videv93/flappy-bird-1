# Story 9.1: Stream SDK Setup & User Token Generation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want the app to connect me to Stream Chat securely,
so that I can use discussion and chat features with my authenticated identity.

## Acceptance Criteria

1. **Given** the application codebase **When** dependencies are installed **Then** `stream-chat` and `@stream-io/stream-chat-react` packages are added **And** `STREAM_API_KEY` and `STREAM_API_SECRET` environment variables are configured **And** `src/lib/stream.ts` exports a server-side Stream client instance

2. **Given** an authenticated user loads any page requiring Stream features **When** the client initializes **Then** a `generateStreamToken` server action creates a valid Stream user token using the user's ID **And** the token is used to connect the Stream Chat client on the frontend **And** the Stream user profile is synced with the app user's name and avatar

3. **Given** an unauthenticated user **When** they access a page with Stream features **Then** Stream client is not initialized **And** discussions are visible in read-only mode (no posting)

## Tasks / Subtasks

- [x] Task 1: Install Stream SDK packages (AC: #1)
  - [x] Run `npm install stream-chat @stream-io/stream-chat-react`
  - [x] Add `STREAM_API_KEY`, `STREAM_API_SECRET`, `NEXT_PUBLIC_STREAM_API_KEY` to `.env.local`
  - [x] Add these env vars to `.env.example` with placeholder values
- [x] Task 2: Create server-side Stream client (AC: #1)
  - [x] Create `src/lib/stream.ts` exporting `streamServerClient` using `StreamChat.getInstance(API_KEY, API_SECRET)`
  - [x] Validate env vars are present, throw if missing
- [x] Task 3: Create `generateStreamToken` server action (AC: #2)
  - [x] Create `src/actions/stream/generateStreamToken.ts`
  - [x] Follow existing `ActionResult<T>` pattern (see createCheckout.ts for reference)
  - [x] Authenticate via `auth.api.getSession({ headers: await headers() })`
  - [x] Generate token with `streamServerClient.createToken(userId, expiration)`
  - [x] Set 1-hour token expiration
  - [x] Return `{ success: true, data: { token } }` or error
  - [x] Create `src/actions/stream/index.ts` re-export
- [x] Task 4: Create `StreamChatProvider` client component (AC: #2, #3)
  - [x] Create `src/components/features/stream/StreamChatProvider.tsx` as `'use client'` component
  - [x] Use `StreamChat.getInstance(NEXT_PUBLIC_STREAM_API_KEY)` on client
  - [x] Call `generateStreamToken` server action to get token
  - [x] Call `client.connectUser()` with user id, name, and image (syncs profile to Stream)
  - [x] Wrap children in Stream's `<Chat client={chatClient}>` provider
  - [x] Handle unauthenticated state: render children without Chat wrapper (read-only)
  - [x] Disconnect user on unmount via `client.disconnectUser()`
  - [x] Create `src/components/features/stream/index.ts` re-export
- [x] Task 5: Integrate provider into app layout (AC: #2, #3)
  - [x] Add `<StreamChatProvider>` inside the `(main)` layout so it wraps protected routes
  - [x] Ensure it sits inside existing `AuthProvider` so session data is available
- [x] Task 6: Write tests (AC: #1, #2, #3)
  - [x] Test `generateStreamToken` server action: authenticated returns token, unauthenticated returns error
  - [x] Test `StreamChatProvider`: renders children, connects when authenticated, skips when not
  - [x] Test `src/lib/stream.ts`: exports server client instance

## Dev Notes

### Architecture Patterns & Constraints

- **Server Action pattern**: Follow exactly the pattern in `src/actions/billing/createCheckout.ts` — uses `ActionResult<T>` discriminated union, `auth.api.getSession({ headers: await headers() })` for auth, try/catch with error return
- **Auth access**: Use `import { auth } from '@/lib/auth'` and `import { headers } from 'next/headers'`
- **Client components**: Must be marked `'use client'` — Stream Chat React components are client-only
- **Provider placement**: Inside `(main)` layout, nested under `AuthProvider` so `useSession` works
- **No Prisma models needed**: Stream handles all chat/discussion data storage externally

### Stream SDK Specifics (Latest as of 2026-02)

- **Packages**: `stream-chat@9.x` (server+client core), `@stream-io/stream-chat-react@13.x` (React UI components)
- **Server client**: `StreamChat.getInstance(apiKey, apiSecret)` — singleton, safe for serverless
- **Client client**: `StreamChat.getInstance(apiKey)` — no secret on client, use `NEXT_PUBLIC_` env var
- **Token generation**: `serverClient.createToken(userId, expirationTimestamp, issuedAtTimestamp)`
- **User connect**: `client.connectUser({ id, name, image }, token)` — auto-creates/updates user profile in Stream
- **Disconnect**: `client.disconnectUser()` — must call on unmount to avoid memory leaks
- **CSS**: Import `stream-chat-react/css/v2/index.css` where Stream components are used (or in global styles)

### Environment Variables

```bash
# Server-side only (never expose to client)
STREAM_API_KEY=your_api_key
STREAM_API_SECRET=your_api_secret

# Client-side (public, safe for browser)
NEXT_PUBLIC_STREAM_API_KEY=your_api_key
```

Note: `STREAM_API_KEY` and `NEXT_PUBLIC_STREAM_API_KEY` have the same value — the distinction is Next.js's convention for exposing to the browser.

### Project Structure Notes

New files to create:

```
src/
├── lib/
│   └── stream.ts                           # Server-side Stream client
├── actions/
│   └── stream/
│       ├── generateStreamToken.ts          # Token generation server action
│       └── index.ts                        # Re-exports
└── components/
    └── features/
        └── stream/
            ├── StreamChatProvider.tsx       # Client-side provider
            └── index.ts                    # Re-exports
```

Files to modify:

```
src/app/(main)/layout.tsx                   # Add StreamChatProvider wrapper
.env.local                                  # Add Stream env vars
.env.example                                # Add Stream env var placeholders
```

### References

- [Source: _bmad-output/planning-artifacts/epics-book-discussions-author-chat.md#Story 9.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Server Action Return Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Import Alias Enforcement]
- [Source: src/actions/billing/createCheckout.ts — ActionResult pattern reference]
- [Source: src/lib/auth.ts — Better Auth configuration]
- [Source: Stream Chat Docs — https://getstream.io/chat/docs/node/tokens_and_authentication/]
- [Source: Stream React Docs — https://getstream.io/chat/docs/react/init_and_users/]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial `@stream-io/stream-chat-react` package not found on npm; correct package name is `stream-chat-react`
- Fixed `vi.hoisted` requirement for mock variable in generateStreamToken test
- Fixed `NEXT_PUBLIC_STREAM_API_KEY` module-level capture issue — moved inside useEffect for testability
- Fixed lint error: moved `setChatClient(null)` from synchronous effect call to cleanup function

### Completion Notes List

- Installed `stream-chat` and `stream-chat-react` packages
- Created `src/lib/stream.ts` — server-side Stream client singleton with env var validation
- Created `generateStreamToken` server action following existing `ActionResult<T>` pattern with 1-hour token expiration
- Created `StreamChatProvider` client component that connects authenticated users to Stream Chat and renders read-only for unauthenticated users
- Integrated `StreamChatProvider` into `(main)` layout inside `SuspensionGuard`, wrapping `AppShell`
- Added Stream env var placeholders to `.env.example`
- 13 tests across 3 test files: 5 for generateStreamToken, 4 for StreamChatProvider, 4 for stream.ts
- All tests pass, typecheck clean, no new lint errors introduced

### File List

- `src/lib/stream.ts` (new) — Server-side Stream client (lazy initialization)
- `src/lib/stream.test.ts` (new) — Server client tests
- `src/actions/stream/generateStreamToken.ts` (new) — Token generation server action
- `src/actions/stream/generateStreamToken.test.ts` (new) — Server action tests
- `src/actions/stream/index.ts` (new) — Re-exports
- `src/components/features/stream/StreamChatProvider.tsx` (new) — Client-side provider
- `src/components/features/stream/StreamChatProvider.test.tsx` (new) — Provider tests
- `src/components/features/stream/index.ts` (new) — Re-exports
- `src/app/(main)/layout.tsx` (modified) — Added StreamChatProvider wrapper
- `.env.example` (modified) — Added Stream env var placeholders
- `package.json` (modified) — Added stream-chat, stream-chat-react dependencies
- `package-lock.json` (modified) — Lock file updated
- `src/types/index.ts` (modified) — Added shared ActionResult<T> type

### Change Log

- 2026-02-12: Implemented Story 9.1 — Stream SDK setup, server client, token generation server action, StreamChatProvider client component, layout integration, and tests (11 tests, all passing)
- 2026-02-12: Code review fixes — Lazy server client init (prevents app crash on missing env), connectUser error handling, shared ActionResult<T> type, disconnectUser unmount test added (13 tests total)

## Senior Developer Review (AI)

**Review Date:** 2026-02-12
**Reviewer Model:** Claude Opus 4.6
**Outcome:** Approve (after fixes)

### Findings Summary

- 3 HIGH, 2 MEDIUM, 2 LOW issues found
- 5 issues fixed automatically (3 HIGH, 2 MEDIUM)
- 2 LOW issues noted but not fixed (documentation accuracy, eslint-disable acceptable tradeoff)

### Action Items

- [x] [HIGH] Convert stream.ts to lazy initialization to prevent app crash on missing env vars
- [x] [HIGH] Add try/catch error handling around connectUser in StreamChatProvider
- [x] [MEDIUM] Extract ActionResult<T> to shared types (src/types/index.ts)
- [x] [MEDIUM] Add disconnectUser unmount test to StreamChatProvider
- [ ] [LOW] Package name mismatch in story task description (cosmetic, not fixed)
- [ ] [LOW] eslint-disable for exhaustive-deps on user name/image sync (acceptable tradeoff)
