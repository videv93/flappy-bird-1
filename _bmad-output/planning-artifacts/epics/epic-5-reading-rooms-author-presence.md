# Epic 5: Reading Rooms & Author Presence

## Story 5.1: Pusher Presence Channel Spike

As a **developer**,
I want **to validate Pusher presence channels work as expected**,
So that **we de-risk the core differentiating feature before building on it**.

**Acceptance Criteria:**

**Given** Pusher is configured with app credentials
**When** I set up a test presence channel
**Then** I can subscribe to `presence-room-test` channel
**And** I receive member_added events when users join
**And** I receive member_removed events when users leave
**And** I can query current members list

**Given** multiple browser tabs/devices
**When** they join the same presence channel
**Then** each sees the others in the member list
**And** updates propagate within 5 seconds

**Given** a user disconnects unexpectedly (close tab, network drop)
**When** Pusher detects the disconnect
**Then** member_removed fires within 30 seconds
**And** other users see the updated member list

**Given** Pusher is unavailable
**When** the client attempts to connect
**Then** the app falls back to polling-only mode
**And** users see a subtle indicator that real-time is degraded
**And** presence still works (just slower updates)

**Spike Deliverables:**
- Working `/api/pusher/auth` endpoint for presence channel authorization
- Test page demonstrating join/leave/member list
- Documentation of any gotchas or limitations discovered
- Confirmation that hybrid polling + push architecture is viable

*Creates: Pusher server config, /api/pusher/auth route, usePresenceStore foundation*

---

## Story 5.2: Join Reading Room

As a **user**,
I want **to join a reading room for the book I'm reading**,
So that **I feel the ambient presence of other readers**.

**Acceptance Criteria:**

**Given** I am on a book detail page
**When** the page loads
**Then** I see a ReadingRoomPanel showing current room state
**And** I see how many readers are currently in the room
**And** I see a "Join Room" button (or auto-join based on settings)

**Given** I tap "Join Room"
**When** I join the room
**Then** I am subscribed to `presence-room-{bookId}` channel
**And** my avatar appears in the PresenceAvatarStack
**And** my presence is recorded in the RoomPresence table
**And** other users in the room see me join (within 5 seconds)

**Given** I start a reading session (timer)
**When** the timer starts
**Then** I am automatically joined to that book's reading room
**And** I see confirmation: "You're reading with X others"

**Given** I am in a reading room
**When** I navigate away from the book page
**Then** my presence is maintained for 30 minutes (background presence)
**And** I can return and still be "in" the room

**Given** I join a room that's empty
**When** I enter
**Then** I see encouraging message: "You're the first reader here!"
**And** the room doesn't feel lonely (warm, inviting UI)

*Creates: RoomPresence table (userId, bookId, joinedAt, lastActiveAt, isAuthor), ReadingRoomPanel component, usePresenceStore*

---

## Story 5.3: See Room Occupants

As a **user**,
I want **to see who else is in the reading room**,
So that **I feel connected to other readers**.

**Acceptance Criteria:**

**Given** I am in a reading room
**When** I view the ReadingRoomPanel
**Then** I see a PresenceAvatarStack showing current readers
**And** avatars are stacked with slight overlap (max 5 visible)
**And** if more than 5 readers, I see "+N more" indicator

**Given** the room has readers
**When** I view the avatar stack
**Then** each avatar has a gentle pulse animation (presence indicator)
**And** animations respect prefers-reduced-motion

**Given** a new reader joins the room
**When** they appear
**Then** their avatar slides into the stack smoothly
**And** I see a subtle indication of the new arrival
**And** the count updates in real-time

**Given** a reader leaves the room
**When** they disappear
**Then** their avatar fades out smoothly
**And** the stack reorders without jarring jumps

**Given** I tap on the avatar stack
**When** the detail view opens
**Then** I see a list of all current readers with names
**And** I can tap a reader to view their profile

**Given** presence polling (fallback mode)
**When** Pusher is unavailable
**Then** the avatar stack still updates (every 30 seconds via REST)
**And** the experience is slightly delayed but functional

*Creates: PresenceAvatarStack component with Framer Motion*

---

## Story 5.4: Leave Reading Room

As a **user**,
I want **to leave a reading room when I'm done**,
So that **my presence is accurate and I'm not shown as reading when I'm not**.

**Acceptance Criteria:**

**Given** I am in a reading room
**When** I tap "Leave Room" or end my session
**Then** I am unsubscribed from the presence channel
**And** my avatar is removed from the stack
**And** other users see me leave
**And** my RoomPresence record is updated (leftAt timestamp)

**Given** I stop my reading timer
**When** the session ends
**Then** I am automatically removed from the room after save
**And** I see: "Session saved! You've left the reading room."

**Given** I've been idle for 30 minutes
**When** the idle timeout triggers
**Then** I am automatically removed from the room
**And** my presence record is marked as timed out
**And** if I return, I can rejoin easily

**Given** I close the browser/app
**When** the connection is lost
**Then** Pusher removes me from presence after disconnect timeout
**And** the RoomPresence record is cleaned up by background job

**Given** I leave a room
**When** I was the last person
**Then** the room shows "Empty" gracefully
**And** I see: "Be the first to return!"

---

## Story 5.5: Author Claim & Verification

As an **author**,
I want **to claim my books on the platform**,
So that **I can connect with my readers and have special presence**.

**Acceptance Criteria:**

**Given** I am logged in and viewing my book (that I wrote)
**When** I see the book detail page
**Then** I see an "Are you the author?" link

**Given** I tap "Are you the author?"
**When** the claim flow starts
**Then** I see verification options:
- Link to Amazon author page
- Link to personal website/social media
- Manual verification request

**Given** I provide an Amazon author page URL
**When** I submit the claim
**Then** the system validates the URL format
**And** an AuthorClaim record is created (userId, bookId, verificationMethod, verificationUrl, status: pending)
**And** I see: "Claim submitted! We'll verify within 24-48 hours."

**Given** an admin approves my claim
**When** verification is complete
**Then** my AuthorClaim status changes to "approved"
**And** I receive a notification: "You're now verified as the author of [Book]!"
**And** my user record is updated with isAuthor flag
**And** I see a golden author badge on my profile

**Given** I am a verified author
**When** I view my claimed books
**Then** I see reader engagement metrics:
- Number of readers with this book in library
- Number currently reading
- Reading room activity

*Creates: AuthorClaim table (id, userId, bookId, verificationMethod, verificationUrl, status, reviewedBy, reviewedAt), isAuthor flag on User*

---

## Story 5.6: Author Presence Display

As a **user**,
I want **to see when an author has been in a reading room**,
So that **I experience the magic of shared space with creators**.

**Acceptance Criteria:**

**Given** I am viewing a book where the author is verified
**When** the author was in the reading room within the last 24 hours
**Then** I see the AuthorShimmerBadge on the book detail page
**And** the badge shows: "Author was here [X hours ago]"
**And** the badge has a subtle golden shimmer animation

**Given** I am in a reading room
**When** the author is currently present
**Then** the author's avatar has a golden ring/shimmer effect
**And** the ReadingRoomPanel has a golden border glow
**And** I see "Author is here!" indicator

**Given** I view the PresenceAvatarStack
**When** the author is among the readers
**Then** the author's avatar is visually distinct (golden ring)
**And** the author appears first in the stack
**And** tapping shows "Author • [Name]"

**Given** I tap on the author's presence badge
**When** the detail appears
**Then** I see when they were last active
**And** I see their author profile (linked to their books)

**Given** the author has multiple books on the platform
**When** they are present in one room
**Then** only that specific book's room shows author presence
**And** other books show "Author verified" but not "here now"

*Creates: AuthorShimmerBadge component with CSS shimmer animation*

---

## Story 5.7: Author Join Notification

As a **user**,
I want **to be notified when an author joins a room I'm in**,
So that **I don't miss the magical moment**.

**Acceptance Criteria:**

**Given** I am in a reading room
**When** the verified author of that book joins
**Then** I receive a push notification via Pusher (< 5 seconds)
**And** I see a special toast notification with golden styling:
"[Author Name] just joined the reading room!"
**And** the toast stays visible longer than normal (6 seconds)
**And** the toast has a subtle sparkle animation

**Given** the author joins
**When** I see the notification
**Then** the ReadingRoomPanel updates with author presence
**And** the golden border glow activates
**And** the overall "room temperature" feels warmer

**Given** I have notifications disabled
**When** the author joins
**Then** I don't receive the toast
**But** the UI still updates to show author presence
**And** I can discover it naturally when I look

**Given** the author leaves the room
**When** they disconnect
**Then** I see a subtle update (no dramatic notification)
**And** the AuthorShimmerBadge updates to "was here X minutes ago"
**And** the golden glow fades gracefully

**Given** accessibility requirements
**When** the author join notification appears
**Then** screen readers announce: "[Author Name], the author, has joined the reading room"
**And** the announcement uses aria-live="polite"

---
