# Epic 6: Administration & Platform Health

## Story 6.1: Admin Role & Access Control

As an **admin**,
I want **secure access to admin features**,
So that **only authorized users can perform moderation and management tasks**.

**Acceptance Criteria:**

**Given** I am a regular user
**When** I try to access /admin routes
**Then** I am redirected to home with message: "Access denied"
**And** the attempt is logged for security review

**Given** I am an admin user (role = "admin")
**When** I log in
**Then** I see an "Admin" option in my profile menu
**And** I can access the /admin dashboard

**Given** I am on the admin dashboard
**When** the page loads
**Then** I see navigation to: Moderation, Users, Authors, Metrics
**And** I see a summary of pending items (queue counts)
**And** I see recent admin activity log

**Given** I perform any admin action
**When** the action completes
**Then** an AdminAction log record is created
**And** the log includes: adminId, action type, targetId, timestamp, details

**Given** I need to add a new admin
**When** I am a super-admin
**Then** I can promote a user to admin role
**And** the change is logged and requires confirmation

*Creates: role field on User (user, author, admin, super-admin), AdminAction log table, admin middleware*

---

## Story 6.2: Moderation Queue

As an **admin**,
I want **to view flagged content in a queue**,
So that **I can review and act on policy violations efficiently**.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to Moderation Queue
**Then** I see a list of flagged items sorted by oldest first
**And** each item shows: content type, reporter, reported user, reason, timestamp
**And** I see the flagged content preview

**Given** users can flag content
**When** a user flags a reading room description or profile bio
**Then** a ModerationItem is created (contentType, contentId, reporterId, reportedUserId, reason, status: pending)
**And** the item appears in the admin queue

**Given** I view a moderation item
**When** I expand the details
**Then** I see the full content in context
**And** I see the reporter's reason/notes
**And** I see the reported user's history (previous flags, warnings)
**And** I see action buttons: Dismiss, Warn, Remove, Suspend

**Given** there are many items in the queue
**When** I view the list
**Then** I can filter by: content type, severity, date range
**And** I can sort by: date, severity, reporter
**And** items are paginated (20 per page)

**Given** the queue is empty
**When** I view moderation
**Then** I see: "No pending items. Great work!"

*Creates: ModerationItem table (id, contentType, contentId, reporterId, reportedUserId, reason, status, reviewedBy, reviewedAt, action)*

---

## Story 6.3: Content Removal

As an **admin**,
I want **to remove content that violates policies**,
So that **the platform remains safe and welcoming**.

**Acceptance Criteria:**

**Given** I am reviewing a flagged item
**When** I determine it violates policy
**Then** I can click "Remove Content"
**And** I am prompted to select violation type: Spam, Harassment, Spoilers, Inappropriate, Other
**And** I can add notes explaining the decision

**Given** I confirm content removal
**When** the removal is processed
**Then** the content is soft-deleted (not permanently erased)
**And** the ModerationItem status is updated to "removed"
**And** the content owner is notified: "Your [content type] was removed for violating [policy]"
**And** the action is logged in AdminAction

**Given** content is removed
**When** other users try to view it
**Then** they see: "[Content removed by moderator]"
**And** the removed content is not visible in feeds or search

**Given** I made a removal in error
**When** I need to undo within 24 hours
**Then** I can restore the content from the moderation log
**And** the user is notified: "Your content has been restored"

**Given** a user has content removed
**When** I view their profile in admin
**Then** I see their content removal history
**And** I can assess patterns of violations

---

## Story 6.4: User Warnings & Suspension

As an **admin**,
I want **to warn or suspend user accounts**,
So that **I can enforce community guidelines proportionally**.

**Acceptance Criteria:**

**Given** I am reviewing a moderation item or user profile
**When** I click "Warn User"
**Then** I can select warning type: First Warning, Final Warning
**And** I can add a custom message explaining the violation
**And** the warning is sent to the user via notification and email

**Given** a warning is issued
**When** the user receives it
**Then** they see a prominent in-app message on next login
**And** they must acknowledge the warning to continue
**And** the warning is recorded in their account history

**Given** I need to suspend a user
**When** I click "Suspend Account"
**Then** I select duration: 24 hours, 7 days, 30 days, Permanent
**And** I provide a reason
**And** the suspension is confirmed with a prompt

**Given** a user is suspended
**When** they try to log in
**Then** they see: "Your account is suspended until [date]. Reason: [reason]"
**And** they cannot access any features
**And** their reading room presence is terminated
**And** their content remains visible but they cannot interact

**Given** a suspension expires
**When** the time period ends
**Then** the user can log in normally
**And** they see a message: "Your suspension has ended. Please review our community guidelines."

**Given** I view a user's admin profile
**When** the page loads
**Then** I see: warnings issued, suspensions, content removals, flag count
**And** I can see the full history of moderation actions

*Updates: User table with suspendedUntil, suspensionReason fields. Creates: UserWarning table*

---

## Story 6.5: Author Verification Review

As an **admin**,
I want **to review and approve author verification requests**,
So that **only legitimate authors receive author badges**.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to Author Verifications
**Then** I see pending AuthorClaim requests sorted by oldest first
**And** each shows: user name, book title, verification method, submitted date
**And** I see the count of pending requests

**Given** I click on a verification request
**When** the detail view opens
**Then** I see the user's profile and history
**And** I see the book they're claiming
**And** I see their verification evidence (URL, screenshots)
**And** I can click through to verify the evidence (opens in new tab)

**Given** I review a valid author claim
**When** I click "Approve"
**Then** the AuthorClaim status is set to "approved"
**And** the user's isAuthor flag is set to true
**And** the user is notified: "Congratulations! You're verified as the author of [Book]"
**And** the action is logged

**Given** I review an invalid claim
**When** I click "Reject"
**Then** I select rejection reason: Insufficient evidence, Not the author, Duplicate claim, Other
**And** I can add notes for the user
**And** the user is notified with the reason
**And** the AuthorClaim status is set to "rejected"

**Given** a claim is rejected
**When** the user receives the rejection
**Then** they see what was missing
**And** they can submit a new claim with better evidence (after 7 days)

---

## Story 6.6: Platform Health Metrics

As an **admin**,
I want **to view platform health metrics**,
So that **I can monitor growth and identify issues**.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to Metrics
**Then** I see a dashboard with key platform metrics

**Given** I view the metrics dashboard
**When** the page loads
**Then** I see user metrics:
- Total registered users
- New users (today, this week, this month)
- Daily active users (DAU)
- Monthly active users (MAU)
- DAU/MAU ratio

**And** I see engagement metrics:
- Total reading sessions logged
- Total reading time (hours)
- Average session duration
- Active streaks count
- Average streak length

**And** I see social metrics:
- Total kudos given (today, all-time)
- Active reading rooms
- Total follows

**And** I see content metrics:
- Books in system
- Verified authors
- Pending author claims

**Given** I want to see trends
**When** I view any metric
**Then** I see a sparkline or chart showing 30-day trend
**And** I see percentage change vs. previous period

**Given** I want detailed data
**When** I click on a metric
**Then** I see a detailed breakdown
**And** I can filter by date range
**And** I can export data as CSV

**Given** there's an anomaly (spike or drop)
**When** metrics deviate significantly (>2 standard deviations)
**Then** I see a visual alert on that metric
**And** I can investigate further

---

## Story 6.7: User & Session Lookup

As a **support admin**,
I want **to look up user accounts and session history**,
So that **I can help users with issues and investigate problems**.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to User Lookup
**Then** I see a search bar to find users

**Given** I search for a user
**When** I enter email, username, or user ID
**Then** I see matching results
**And** I can click to view the user's admin profile

**Given** I view a user's admin profile
**When** the page loads
**Then** I see their account details:
- Email, name, avatar, join date
- Role, verification status
- Current streak, total reading time
- Follower/following counts

**And** I see their recent activity:
- Last login
- Recent sessions (last 10)
- Recent kudos given/received
- Current reading room (if any)

**And** I see their moderation history:
- Warnings, suspensions
- Flags received, flags submitted

**Given** I need to help with a technical issue
**When** I view session details
**Then** I see: device/browser info, session timestamps, any errors logged
**And** I can identify patterns (e.g., sessions not saving)

**Given** I need to take action
**When** I view the user profile
**Then** I have quick actions: Send Message, Warn, Suspend, Reset Password
**And** actions are logged appropriately

**Given** privacy requirements
**When** I access user data
**Then** my access is logged for audit purposes
**And** I can only see data necessary for support
**And** sensitive data (e.g., full session history) requires confirmation
