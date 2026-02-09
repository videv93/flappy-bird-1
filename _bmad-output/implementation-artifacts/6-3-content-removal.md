# Story 6.3: Content Removal

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want **to remove content that violates policies**,
so that **the platform remains safe and welcoming**.

## Acceptance Criteria

1. **Given** I am reviewing a flagged item, **When** I determine it violates policy, **Then** I can click "Remove Content", **And** I am prompted to select violation type: Spam, Harassment, Spoilers, Inappropriate, Other, **And** I can add notes explaining the decision.

2. **Given** I confirm content removal, **When** the removal is processed, **Then** the content is soft-deleted (not permanently erased), **And** the ModerationItem status is updated to "REMOVED", **And** the content owner is notified: "Your [content type] was removed for violating [policy]", **And** the action is logged in AdminAction.

3. **Given** content is removed, **When** other users try to view it, **Then** they see: "[Content removed by moderator]", **And** the removed content is not visible in feeds or search.

4. **Given** I made a removal in error, **When** I need to undo within 24 hours, **Then** I can restore the content from the moderation log, **And** the user is notified: "Your content has been restored".

5. **Given** a user has content removed, **When** I view their profile in admin, **Then** I see their content removal history, **And** I can assess patterns of violations.

## Tasks / Subtasks

- [x] Task 1: Add `ViolationType` enum and `ContentRemoval` model to Prisma schema (AC: #1, #2, #4)
  - [x] 1.1 Add `ViolationType` enum to `prisma/schema.prisma`: `SPAM`, `HARASSMENT`, `SPOILERS`, `INAPPROPRIATE`, `OTHER`
  - [x] 1.2 Add `ContentRemoval` model: `id` (cuid), `moderationItemId` (unique relation to ModerationItem), `violationType` (ViolationType), `adminNotes` (String?), `removedById` (relation to User), `removedAt` (DateTime), `restoredAt` (DateTime?), `restoredById` (String?, relation to User), `originalContent` (String - stored for restore), `createdAt`, `updatedAt`
  - [x] 1.3 Add `contentRemoval` optional relation on `ModerationItem` model
  - [x] 1.4 Add `bioRemovedAt` (DateTime?) field on `User` model for soft-delete of profile bios
  - [x] 1.5 Add `removalsPerformed` and `restoresPerformed` relations on `User` model
  - [x] 1.6 Add indexes on `moderationItemId`, `removedById`, `removedAt`
  - [x] 1.7 Run `npx prisma generate` (no db push - dev has no DB connection)

- [x] Task 2: Create Zod validation schemas for content removal (AC: #1, #4)
  - [x] 2.1 Add to `src/lib/validation/admin.ts`: `removeContentSchema` (moderationItemId, violationType enum, adminNotes?), `restoreContentSchema` (contentRemovalId, reason?)
  - [x] 2.2 Add `violationTypeEnum` Zod enum matching Prisma `ViolationType`

- [x] Task 3: Create `removeContent` server action (AC: #1, #2, #3)
  - [x] 3.1 Create `src/actions/admin/removeContent.ts`:
    - Validate input with `removeContentSchema`
    - Auth check + admin role check (same pattern as `reviewModerationItem.ts`)
    - Verify ModerationItem exists and status is `PENDING` or `REMOVED` (allow re-review)
    - Read the original content based on `contentType`:
      - `PROFILE_BIO`: read `User.bio` where `id = contentId`
      - `READING_ROOM_DESCRIPTION`: read `Book.description` where `id = contentId` (if applicable)
    - In `$transaction`: create `ContentRemoval` (store originalContent), update `ModerationItem.status` to `REMOVED`, soft-delete the content (set `User.bioRemovedAt` for bio, or clear field), update `ModerationItem.reviewedById`/`reviewedAt`, create `AdminAction`
    - Push Pusher notification to `private-user-{reportedUserId}` with event `moderation:content-removed` and payload `{ contentType, violationType }`
    - Return `ActionResult<ContentRemoval>`
  - [x] 3.2 Write tests for `removeContent.ts`: success for PROFILE_BIO, success for READING_ROOM_DESCRIPTION, non-admin rejection, already-reviewed item, item not found, original content snapshot verified

- [x] Task 4: Create `restoreContent` server action (AC: #4)
  - [x] 4.1 Create `src/actions/admin/restoreContent.ts`:
    - Validate input with `restoreContentSchema`
    - Auth check + admin role check
    - Find `ContentRemoval` by id, verify it exists and `restoredAt` is null
    - Check 24-hour window: if `removedAt` > 24 hours ago, return error "Restore window has expired"
    - In `$transaction`: restore original content (set `User.bio` back, clear `User.bioRemovedAt`), set `ContentRemoval.restoredAt` + `restoredById`, update `ModerationItem.status` back to `PENDING`, create `AdminAction` with type `RESTORE_CONTENT`
    - Push Pusher notification to `private-user-{reportedUserId}` with event `moderation:content-restored`
    - Return `ActionResult<ContentRemoval>`
  - [x] 4.2 Write tests: success restore, expired window (>24h), already restored, non-admin, not found

- [x] Task 5: Create removal confirmation dialog component (AC: #1)
  - [x] 5.1 Create `src/components/features/admin/RemoveContentDialog.tsx`:
    - Uses `AlertDialog` from shadcn (`src/components/ui/alert-dialog.tsx`)
    - Props: `open`, `onOpenChange`, `moderationItemId`, `onSuccess`
    - Violation type selector: radio group or select with options (Spam, Harassment, Spoilers, Inappropriate, Other)
    - Admin notes `Textarea` (optional, max 1000 chars)
    - Cancel + "Remove Content" (destructive variant) buttons
    - Loading state during submission
    - Calls `removeContent` server action
    - Shows `toast.success("Content removed successfully")` or `toast.error()` on failure
  - [x] 5.2 Write tests: renders dialog, validates violation type required, submits successfully, shows loading state, error handling

- [x] Task 6: Update `ModerationItemCard` to integrate removal dialog (AC: #1, #4)
  - [x] 6.1 Update `src/components/features/admin/ModerationItemCard.tsx`:
    - "Remove" button now opens `RemoveContentDialog` instead of calling `reviewModerationItem` directly
    - After successful removal, show "Restore" button if within 24h window
    - "Restore" button calls `restoreContent` server action directly with confirmation toast
    - Keep existing Dismiss/Warn/Suspend buttons unchanged
  - [x] 6.2 Update tests to cover new Remove flow + Restore button

- [x] Task 7: Display removed content as "[Content removed by moderator]" (AC: #3)
  - [x] 7.1 Update `src/app/(main)/user/[userId]/page.tsx` (user profile page):
    - When rendering bio, check if `user.bioRemovedAt` is set
    - If removed, display `[Content removed by moderator]` in muted text instead of bio
  - [x] 7.2 Update any other locations that display user bio (profile components)
  - [x] 7.3 Write tests for removed bio display

- [x] Task 8: Add content removal history to admin user detail (AC: #5)
  - [x] 8.1 Create `src/actions/admin/getUserRemovalHistory.ts`:
    - Admin-only action
    - Query `ContentRemoval` records via `ModerationItem.reportedUserId`
    - Return list with violationType, removedAt, restoredAt, contentType, adminNotes
  - [x] 8.2 Create `src/components/features/admin/UserRemovalHistory.tsx`:
    - Renders table/list of removal history items
    - Shows violation type badge, date, restored status
    - Shows pattern indicator if 3+ removals
  - [x] 8.3 Write tests for both

- [x] Task 9: Add Pusher notification listener for content removal events (AC: #2)
  - [x] 9.1 Update `src/components/providers/NotificationProvider.tsx`:
    - Add binding for `moderation:content-removed` event
    - Show toast: "Your [bio/room description] was removed for violating our [violation type] policy"
    - Add binding for `moderation:content-restored` event
    - Show toast: "Your content has been restored"
  - [x] 9.2 Write tests for new event bindings

- [x] Task 10: Update admin exports and barrel files (AC: all)
  - [x] 10.1 Update `src/actions/admin/index.ts` to export `removeContent`, `restoreContent`, `getUserRemovalHistory`
  - [x] 10.2 Update `src/components/features/admin/index.ts` to export `RemoveContentDialog`, `UserRemovalHistory`

## Dev Notes

### Existing Admin Infrastructure (CRITICAL - USE, DO NOT REINVENT)

Story 6.1 and 6.2 established the complete admin + moderation infrastructure. ALL of these must be reused:

- **`src/lib/admin.ts`** - `isAdmin(user)` for admin auth checks. DO NOT create a new role checking mechanism.
- **`src/app/(admin)/admin/layout.tsx`** - Parent admin layout with role-based guard. ALL `/admin/*` pages inherit this guard.
- **`src/actions/admin/logAdminAction.ts`** - Use for audit logging all removal/restore actions. DO NOT create new logging.
- **`src/actions/admin/reviewModerationItem.ts`** - Current implementation only updates ModerationItem status. Story 6.3 adds actual content removal behavior alongside this. The Remove button will now use the NEW `removeContent` action instead of `reviewModerationItem` for the "remove" case.
- **`src/components/features/admin/ModerationItemCard.tsx`** - Update existing component, do NOT create a new one.
- **`src/components/providers/NotificationProvider.tsx`** - Add new event bindings to existing provider. Pattern: `channel.bind('event', handler)`.
- **`src/lib/pusher-server.ts`** - `getPusher()` singleton for triggering events server-side. Usage: `const pusher = getPusher(); if (pusher) { await pusher.trigger(channel, event, data); }`
- **`src/actions/books/types.ts`** - `ActionResult<T>` discriminated union. ALL server actions must return this type.

### Architecture Compliance

- **Server Actions pattern**: All mutations follow `ActionResult<T>`:
  ```typescript
  export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
  ```
- **Auth check pattern**: `const headersList = await headers(); const session = await auth.api.getSession({ headers: headersList });`
- **Admin actions pattern**: Fetch user with role from DB, then `isAdmin(adminUser)`. See `getDashboardStats.ts` for the exact pattern.
- **Transaction pattern**: Use `prisma.$transaction([...])` for atomic operations. See `reviewModerationItem.ts` line 53-77 for the exact pattern: status update + AdminAction log in single transaction.
- **Soft delete pattern (ESTABLISHED)**: `UserBook.deletedAt` in `removeFromLibrary.ts` - set DateTime instead of hard deleting. Apply same pattern for bio removal via `User.bioRemovedAt`.
- **Pusher trigger pattern**: Import `getPusher` from `@/lib/pusher-server`, null-check, then `pusher.trigger()`. See `reviewClaim.ts` for the pattern used in author claim notifications.
- **Validation**: Zod schemas at boundaries. Add to existing `src/lib/validation/admin.ts`.
- **Database**: Use `@map("snake_case")` and `@@map("table_name")` conventions per schema.

### Content Type Handling Strategy

The `ModerationItem.contentType` determines what content to remove:

| ContentType | contentId refers to | Content field | Soft-delete mechanism |
|---|---|---|---|
| `PROFILE_BIO` | User.id | `User.bio` | Set `User.bioRemovedAt = new Date()`, keep `bio` value for restore |
| `READING_ROOM_DESCRIPTION` | Book.id | `Book.description` | Store in `ContentRemoval.originalContent`, set field to null |

**CRITICAL**: Before removing, ALWAYS snapshot the original content into `ContentRemoval.originalContent` for the 24-hour restore window.

### Notification Events

| Event | Channel | Payload | Toast Message |
|---|---|---|---|
| `moderation:content-removed` | `private-user-{userId}` | `{ contentType, violationType }` | "Your [type] was removed for violating our [policy] policy" |
| `moderation:content-restored` | `private-user-{userId}` | `{ contentType }` | "Your content has been restored" |

### UI/UX Requirements

- **Violation type selector**: Radio group or Select dropdown with 5 options (Spam, Harassment, Spoilers, Inappropriate, Other)
- **AlertDialog**: Use shadcn `AlertDialog` for removal confirmation (same pattern as `FlagContentDialog.tsx`)
- **Destructive button**: "Remove Content" uses `variant="destructive"` (red)
- **Restore button**: Only visible within 24h of removal. Use `variant="outline"` with amber text
- **Toast notifications**: `toast.success()` / `toast.error()` from sonner (auto-dismiss 4s)
- **Removed content display**: `[Content removed by moderator]` in `text-muted-foreground` (gray/muted)
- **Touch targets**: Minimum 44x44px on all interactive elements
- **Loading states**: Disable buttons and show spinner during action execution

### Testing Requirements

- **Unit tests**: removeContent, restoreContent, getUserRemovalHistory server actions
- **Component tests**: RemoveContentDialog (validation, submission, error), ModerationItemCard (updated Remove flow, Restore button), UserRemovalHistory, NotificationProvider (new event bindings)
- **Mock patterns**: Mock `@/lib/prisma`, `@/lib/auth`, `next/headers`, `@/lib/pusher-server` per project convention
- **Auth mocking**: Mock `auth.api.getSession()` returning `{ user: { id, role } }` where role is from `UserRole` enum
- **Transaction mocking**: Mock `prisma.$transaction` as callback function per `reviewModerationItem.test.ts` pattern
- **Pusher mocking**: Mock `getPusher()` to return `{ trigger: vi.fn() }` or `null`
- **Test file location**: Co-locate `.test.tsx` / `.test.ts` with source files
- **Date mocking**: Use `vi.useFakeTimers()` for 24-hour window tests in restoreContent

### Previous Story Intelligence (Story 6.2)

Key learnings from Story 6.2 implementation:
- `prisma.$transaction` works with array of promises for atomic operations (status update + AdminAction in single call)
- Prisma `db push` fails in dev environment (no DB connection) - validate via `prisma generate` instead
- 2 pre-existing test failures exist: `middleware.test.ts` and `AppShell.test.tsx` - these are NOT regressions, ignore them
- `Record<string, unknown>` needs cast to `object` for Prisma `Json` type: `details: (input.details as object) ?? undefined`
- `z.record()` in Zod needs two arguments: `z.record(z.string(), z.unknown())`
- `vi.mock` hoisting issues: follow project's established mock pattern (see any `.test.ts` in `src/actions/admin/`)
- Component tests: use `getByRole` instead of `getByText` for buttons to avoid "multiple elements" errors
- `ModerationItemCard` uses `ModerationQueueItem` type from `getModerationQueue.ts`

### Git Intelligence

Recent commits show Story 6.2 (moderation queue) was the last major implementation:
- `3d84ea4` - feat: implement moderation queue with content flagging and admin review (Story 6.2)
- `37399ca` - feat: implement author presence display, join notifications, and admin role access control (Stories 5.6, 5.7, 6.1)

The admin infrastructure is fresh and well-established. Story 6.3 builds directly on 6.2's ModerationItem foundation.

### Project Structure Notes

```
src/
  actions/
    admin/
      removeContent.ts              # NEW
      removeContent.test.ts         # NEW
      restoreContent.ts             # NEW
      restoreContent.test.ts        # NEW
      getUserRemovalHistory.ts      # NEW
      getUserRemovalHistory.test.ts # NEW
      reviewModerationItem.ts       # UNCHANGED (Remove button bypasses this now)
      index.ts                      # UPDATE - add new exports
  components/
    features/
      admin/
        RemoveContentDialog.tsx     # NEW
        RemoveContentDialog.test.tsx # NEW
        UserRemovalHistory.tsx      # NEW
        UserRemovalHistory.test.tsx # NEW
        ModerationItemCard.tsx      # UPDATE - Remove opens dialog, add Restore
        ModerationItemCard.test.tsx # UPDATE - new test cases
        index.ts                    # UPDATE - add new exports
    providers/
      NotificationProvider.tsx      # UPDATE - add content removal event bindings
  app/
    (main)/
      user/[userId]/page.tsx        # UPDATE - show removed bio placeholder
  lib/
    validation/
      admin.ts                      # UPDATE - add removal/restore schemas
prisma/
  schema.prisma                     # UPDATE - ViolationType enum, ContentRemoval model, User.bioRemovedAt
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-administration-platform-health.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Pattern Decision Tree]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#FR35 - Admins can remove content that violates policies]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 3: Alex - Platform Guardian]
- [Source: src/actions/admin/reviewModerationItem.ts - current review pattern with $transaction]
- [Source: src/actions/books/removeFromLibrary.ts - established soft-delete pattern]
- [Source: src/components/features/admin/ModerationItemCard.tsx - existing card to update]
- [Source: src/components/providers/NotificationProvider.tsx - Pusher event binding pattern]
- [Source: src/lib/pusher-server.ts - server-side Pusher trigger singleton]
- [Source: src/lib/admin.ts - admin role checking utilities]
- [Source: src/lib/validation/admin.ts - existing Zod schemas to extend]
- [Source: prisma/schema.prisma - ModerationItem model, UserBook.deletedAt soft-delete pattern]
- [Source: _bmad-output/implementation-artifacts/6-2-moderation-queue.md - previous story learnings]

## Dev Agent Record

### Agent Model Used

Unknown (not recorded by dev agent)

### Debug Log References

None recorded.

### Completion Notes List

- Code review performed by Claude Opus 4.6 on 2026-02-09
- Fixed: ModerationQueue.test.tsx regression (missing mocks for transitive deps)
- Fixed: removeContent status check now allows PENDING and REMOVED (per Task 3.1 spec)
- Fixed: Removed eslint-disable any[] in removeContent.ts and restoreContent.ts (spread pattern)
- Fixed: ModerationItemCard restore window now uses contentRemoval.removedAt (consistent with server)
- Fixed: RemoveContentDialog Textarea now has maxLength={1000}
- Fixed: getModerationQueue type and query updated to include contentRemoval.removedAt

### File List

**New Files:**
- `src/actions/admin/removeContent.ts` - Server action for content removal (Task 3)
- `src/actions/admin/removeContent.test.ts` - Tests for removeContent (Task 3.2)
- `src/actions/admin/restoreContent.ts` - Server action for content restoration (Task 4)
- `src/actions/admin/restoreContent.test.ts` - Tests for restoreContent (Task 4.2)
- `src/actions/admin/getUserRemovalHistory.ts` - Server action for removal history (Task 8.1)
- `src/actions/admin/getUserRemovalHistory.test.ts` - Tests for getUserRemovalHistory (Task 8.3)
- `src/components/features/admin/RemoveContentDialog.tsx` - Content removal confirmation dialog (Task 5)
- `src/components/features/admin/RemoveContentDialog.test.tsx` - Tests for RemoveContentDialog (Task 5.2)
- `src/components/features/admin/UserRemovalHistory.tsx` - User removal history component (Task 8.2)
- `src/components/features/admin/UserRemovalHistory.test.tsx` - Tests for UserRemovalHistory (Task 8.3)

**Modified Files:**
- `prisma/schema.prisma` - Added ViolationType enum, ContentRemoval model, User.bioRemovedAt (Task 1)
- `src/lib/validation/admin.ts` - Added removeContentSchema, restoreContentSchema, violationTypeEnum (Task 2)
- `src/actions/admin/getModerationQueue.ts` - Added contentRemoval relation with removedAt to query and type
- `src/actions/admin/index.ts` - Added exports for removeContent, restoreContent, getUserRemovalHistory (Task 10.1)
- `src/actions/social/getUserProfile.ts` - Added bioRemovedAt to user select and UserProfileData type (Task 7.2)
- `src/actions/social/searchUsers.ts` - Added bioRemovedAt to user select and UserSearchResult type (Task 7.2)
- `src/app/(main)/user/[userId]/page.tsx` - Show removed bio placeholder (Task 7.1)
- `src/components/features/admin/ModerationItemCard.tsx` - Remove opens dialog, added Restore button (Task 6.1)
- `src/components/features/admin/ModerationItemCard.test.tsx` - Tests for new Remove flow and Restore button (Task 6.2)
- `src/components/features/admin/ModerationQueue.test.tsx` - Updated mock data types, added transitive dep mocks
- `src/components/features/admin/index.ts` - Added RemoveContentDialog, UserRemovalHistory exports (Task 10.2)
- `src/components/features/profile/ProfileView.tsx` - Show removed bio placeholder in own profile (Task 7.2)
- `src/components/features/profile/ProfileView.test.tsx` - Test for removed bio display (Task 7.3)
- `src/components/features/social/UserCard.tsx` - Show removed bio placeholder in search results (Task 7.2)
- `src/components/features/social/UserCard.test.tsx` - Test for removed bio display (Task 7.3)
- `src/components/providers/NotificationProvider.tsx` - Added content-removed and content-restored event bindings (Task 9.1)
- `src/components/providers/NotificationProvider.test.tsx` - Tests for new event bindings (Task 9.2)
