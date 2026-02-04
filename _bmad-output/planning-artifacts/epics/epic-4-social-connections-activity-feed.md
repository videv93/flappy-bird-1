# Epic 4: Social Connections & Activity Feed

## Story 4.1: Follow & Unfollow Users

As a **user**,
I want **to follow other readers**,
So that **I can see their reading activity in my feed**.

**Acceptance Criteria:**

**Given** I am viewing another user's profile
**When** I am not following them
**Then** I see a "Follow" button

**Given** I tap "Follow"
**When** the follow is processed
**Then** the button immediately changes to "Following" (optimistic UI)
**And** a Follow record is created (followerId, followingId, createdAt)
**And** my following count increases by 1
**And** their follower count increases by 1

**Given** I am following a user
**When** I view their profile
**Then** I see a "Following" button (checkmark icon)
**And** tapping it shows options: "Unfollow"

**Given** I tap "Unfollow"
**When** confirmation appears
**Then** I see "Unfollow [username]?"
**And** I can confirm or cancel

**Given** I confirm unfollow
**When** the unfollow is processed
**Then** the button changes back to "Follow" (optimistic UI)
**And** the Follow record is deleted
**And** counts are decremented

**Given** I search for users
**When** I view search results
**Then** each user card shows a Follow/Following button
**And** I can follow directly from search results

*Creates: Follow table (id, followerId, followingId, createdAt)*

---

## Story 4.2: View Other User Profiles

As a **user**,
I want **to view another user's public profile**,
So that **I can learn about their reading habits and decide to follow them**.

**Acceptance Criteria:**

**Given** I tap on a user's name or avatar anywhere in the app
**When** their profile page loads
**Then** I see their display name and avatar
**And** I see their bio (if set)
**And** I see their follower and following counts
**And** I see their current streak count
**And** I see a Follow/Following button

**Given** I am viewing a user's profile
**When** they have public reading activity enabled
**Then** I see their "Currently Reading" books (up to 3)
**And** I see their recent reading activity (last 5 sessions)
**And** I see their recent finished books

**Given** the user has privacy enabled
**When** I view their profile
**Then** I see limited info: name, avatar, bio, streak count
**And** I see "Reading activity is private"
**And** I can still follow them

**Given** I am viewing my own profile
**When** the page loads
**Then** I see an "Edit Profile" button instead of Follow
**And** I see all my own data regardless of privacy settings

---

## Story 4.3: Activity Feed

As a **user**,
I want **to see what people I follow are reading**,
So that **I feel connected to my reading community**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to the Activity tab
**Then** I see a chronological feed of activity from people I follow
**And** the feed loads the most recent 20 items
**And** I can pull-to-refresh to get new items

**Given** the feed contains activity
**When** I view feed items
**Then** I see different item types styled appropriately:
- **Reading session**: "[User] read [Book] for [X] minutes" with book cover
- **Finished book**: "[User] finished [Book]" with celebration icon
- **Streak milestone**: "[User] hit a [X]-day streak!" with streak badge

**Given** a feed item is a reading session
**When** I view it
**Then** I see: user avatar, username, book cover thumbnail, book title, duration, timestamp
**And** I see a KudosButton to encourage them

**Given** I scroll to the bottom of the feed
**When** more items exist
**Then** more items load automatically (infinite scroll)
**And** I see a loading indicator while fetching

**Given** I follow no one
**When** I view the Activity tab
**Then** I see an empty state: "Follow readers to see their activity"
**And** I see a CTA: "Find Readers" linking to user search

**Given** people I follow have no recent activity
**When** I view the feed
**Then** I see: "No recent activity from people you follow"
**And** I see suggestions of active users to follow

*Creates: ActivityFeedItem component*

---

## Story 4.4: Give Kudos

As a **user**,
I want **to give kudos to someone's reading session**,
So that **I can encourage them and show I noticed their effort**.

**Acceptance Criteria:**

**Given** I see a reading session in the activity feed
**When** I view the session card
**Then** I see a heart icon (KudosButton) with current kudos count

**Given** I have not given kudos to this session
**When** I tap the heart icon (or double-tap the card)
**Then** the heart fills with coral color immediately (optimistic UI)
**And** a scale animation plays (1.2x → 1.0x, 150ms)
**And** small heart particles float upward (optional, respect reduced-motion)
**And** haptic feedback triggers on mobile
**And** the kudos count increments
**And** a Kudos record is created (giverId, receiverId, sessionId, createdAt)

**Given** I have already given kudos to this session
**When** I tap the heart icon again
**Then** the heart unfills (toggle off)
**And** the kudos count decrements
**And** the Kudos record is deleted

**Given** I give kudos while offline
**When** the kudos is queued
**Then** I see the optimistic UI immediately
**And** the kudos syncs when back online

**Given** accessibility requirements
**When** the KudosButton is focused
**Then** aria-label reads "Give kudos" or "You gave kudos, X total"
**And** aria-pressed indicates the toggle state

*Creates: Kudos table (id, giverId, receiverId, sessionId, createdAt), KudosButton component*

---

## Story 4.5: Kudos Notifications

As a **user**,
I want **to be notified when someone gives me kudos**,
So that **I feel seen and encouraged**.

**Acceptance Criteria:**

**Given** someone gives kudos to my reading session
**When** the kudos is created
**Then** a push notification is sent to me via Pusher (< 5 seconds)
**And** I see a toast notification if I'm in the app: "[User] sent you kudos!"
**And** the toast has a gentle gold accent (no sound by default)
**And** tapping the toast navigates to the session that received kudos

**Given** I receive multiple kudos in quick succession
**When** notifications arrive
**Then** they are batched: "3 people sent you kudos"
**And** individual notifications don't spam me

**Given** I have notifications disabled
**When** someone gives me kudos
**Then** I do not receive push or in-app toast
**And** the kudos is still recorded and visible in my kudos list

**Given** the Activity tab has unread notifications
**When** I view the tab bar
**Then** I see a red badge with the count of new kudos/activity since last visit
**And** the badge clears when I open the Activity tab

*Sets up: Pusher private channel `private-user-{userId}` for kudos events*

---

## Story 4.6: View Kudos Received

As a **user**,
I want **to see all the kudos I've received**,
So that **I can appreciate my supporters and feel motivated**.

**Acceptance Criteria:**

**Given** I am on my profile page
**When** I tap "Kudos Received" or a kudos summary section
**Then** I see a list of kudos I've received

**Given** I am viewing my kudos list
**When** the list loads
**Then** I see each kudos with: giver's avatar and name, which session/book it was for, timestamp
**And** kudos are sorted by most recent first
**And** I can tap a kudos to view the original session

**Given** I view a specific reading session of mine
**When** the session has kudos
**Then** I see: "X kudos" with a heart icon
**And** I can tap to see who gave kudos (list of avatars/names)

**Given** I have received no kudos
**When** I view my kudos section
**Then** I see: "No kudos yet. Keep reading!"
**And** the empty state is encouraging, not discouraging

---
