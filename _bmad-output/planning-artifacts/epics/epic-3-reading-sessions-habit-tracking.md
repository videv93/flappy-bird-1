# Epic 3: Reading Sessions & Habit Tracking

## Story 3.1: Session Timer with Persistence

As a **user**,
I want **a timer that tracks my reading session**,
So that **I can accurately log how long I read**.

**Acceptance Criteria:**

**Given** I am on a book detail page for a book I'm "Currently Reading"
**When** I view the page
**Then** I see a "Start Reading" button prominently displayed

**Given** I tap "Start Reading"
**When** the timer starts
**Then** I see a running timer display (MM:SS, or HH:MM:SS after 1 hour)
**And** the button changes to "Stop Reading"
**And** the timer state is persisted to IndexedDB via Zustand
**And** the book ID is stored with the timer

**Given** I have an active timer
**When** I navigate to another page in the app
**Then** the timer continues running in the background
**And** I see a persistent indicator showing active session (e.g., in header)

**Given** I have an active timer
**When** I close the browser or app
**Then** the timer state is preserved in IndexedDB
**And** when I return, the timer resumes from where it was
**And** elapsed time is calculated correctly from start timestamp

**Given** I have an active timer for Book A
**When** I try to start a timer for Book B
**Then** I see a prompt: "You have an active session for [Book A]. End it first?"
**And** I can end the current session or cancel

*Creates: useTimerStore (Zustand with IndexedDB persist)*

---

## Story 3.2: Save Reading Session

As a **user**,
I want **to save my reading session**,
So that **it counts toward my streak and I can track my progress**.

**Acceptance Criteria:**

**Given** I have stopped the timer
**When** the session summary appears
**Then** I see: book title, session duration, current date
**And** I see a "Save Session" button
**And** I see a "Discard" option (secondary)

**Given** I tap "Save Session"
**When** the session is saved
**Then** a ReadingSession record is created with: userId, bookId, duration, startedAt, endedAt
**And** the book's progress is optionally updated (prompt: "Update progress?")
**And** my daily reading total is recalculated
**And** I see a success toast
**And** the timer state is cleared

**Given** I tap "Discard"
**When** I confirm the discard
**Then** the session is not saved
**And** the timer state is cleared
**And** I return to the book detail page

**Given** I save a session while offline
**When** the session is saved locally
**Then** it is queued in useOfflineStore
**And** I see a toast: "Session saved offline. Will sync when connected."
**And** the session syncs automatically when back online

**Given** I log a session of less than 1 minute
**When** I try to save
**Then** I see a message: "Sessions under 1 minute aren't saved. Keep reading!"
**And** the session is discarded

*Creates: ReadingSession table (id, userId, bookId, duration, startedAt, endedAt, syncedAt)*

---

## Story 3.3: Session History

As a **user**,
I want **to view my reading session history**,
So that **I can see my reading patterns and total time**.

**Acceptance Criteria:**

**Given** I am on a book detail page
**When** I scroll to the "Your Sessions" section
**Then** I see a list of my reading sessions for this book
**And** each session shows: date, duration, time of day
**And** sessions are sorted by most recent first

**Given** I have many sessions for a book
**When** I view the history
**Then** I see the first 10 sessions
**And** I can tap "Show more" to load additional sessions

**Given** I am on my profile page
**When** I view my reading statistics
**Then** I see my total reading time across all books
**And** I see total sessions count
**And** I see average session duration

**Given** I have sessions for multiple books
**When** I view my profile stats
**Then** the totals aggregate correctly across all books
**And** the data updates in real-time after logging a session

---

## Story 3.4: Daily Reading Goal

As a **user**,
I want **to set a daily reading goal**,
So that **I have a target to work toward each day**.

**Acceptance Criteria:**

**Given** I am a new user
**When** I complete onboarding (or first visit to Home)
**Then** I am prompted to set a daily reading goal
**And** I see preset options: 5 min, 15 min, 30 min, 60 min, Custom

**Given** I select a goal
**When** I confirm
**Then** my goal is saved to my user preferences
**And** I see confirmation: "Your daily goal is [X] minutes"

**Given** I want to change my goal
**When** I go to Profile > Settings > Reading Goal
**Then** I can select a new goal from the same options
**And** the change takes effect immediately
**And** my current day's progress is recalculated against the new goal

**Given** I have a daily goal
**When** I view the home page
**Then** I see my progress toward today's goal
**And** progress is shown as: "[X] of [Y] min today"

*Updates: User table to add dailyGoalMinutes field*

---

## Story 3.5: Streak Ring Display

As a **user**,
I want **to see my current streak prominently displayed**,
So that **I feel motivated to maintain my reading habit**.

**Acceptance Criteria:**

**Given** I am on the home page
**When** the page loads
**Then** I see the StreakRing component in the header area
**And** the ring shows my current streak count in the center (e.g., "7")
**And** the ring fill shows today's goal progress (0-100%)

**Given** I have not met today's goal yet
**When** I view the StreakRing
**Then** the ring is amber/orange colored
**And** the ring is partially filled based on progress
**And** I see text below: "X min to go"

**Given** I have met today's goal
**When** I view the StreakRing
**Then** the ring turns green with a checkmark
**And** the ring is fully filled
**And** I see a brief celebration animation (confetti for milestones)

**Given** I am using a streak freeze today
**When** I view the StreakRing
**Then** the ring is blue with a snowflake icon
**And** text shows "Freeze day"

**Given** I have a streak of 7, 30, or 100 days
**When** I complete today's goal
**Then** I see a milestone celebration (enhanced animation)
**And** I see a toast: "Amazing! 7-day streak!"

**Accessibility:**
**Given** a screen reader is active
**When** the StreakRing is focused
**Then** it announces: "Reading streak: X days. Y minutes of Z minute goal completed today."

*Creates: StreakRing component with Framer Motion, respects prefers-reduced-motion*

---

## Story 3.6: Streak Credit & Reset Logic

As a **user**,
I want **my streak to increment when I meet my goal**,
So that **I am rewarded for consistent reading**.

**Acceptance Criteria:**

**Given** I have not met today's goal
**When** I log a session that brings my total to or above my daily goal
**Then** today is marked as "goal_met" in my streak record
**And** if yesterday was also met (or frozen), my streak count increments
**And** I see the StreakRing update in real-time

**Given** I have a streak and met yesterday's goal
**When** I meet today's goal
**Then** my streak count increases by 1
**And** the streak is updated server-side for data integrity

**Given** I missed yesterday's goal without a freeze
**When** I log any session today
**Then** my streak resets to 1 (today's the new start)
**And** I see a compassionate message: "Fresh start! Day 1 of your new streak."
**And** no guilt language is used

**Given** it's a new day (midnight in user's timezone)
**When** the day changes
**Then** the system evaluates if yesterday's goal was met
**And** streak is updated accordingly (met = continue, missed = reset unless frozen)

**Given** edge case: user logs sessions across midnight
**When** a session spans midnight
**Then** the session is attributed to the day it started
**And** streak calculation handles timezone correctly (store UTC, calculate in user TZ)

*Creates: UserStreak table (userId, currentStreak, longestStreak, lastGoalMetDate, freezesAvailable, freezesUsed), DailyProgress table (userId, date, minutesRead, goalMet, freezeUsed)*

---

## Story 3.7: Streak Freeze

As a **user**,
I want **to use a streak freeze to protect my streak**,
So that **I don't lose my progress when life gets in the way**.

**Acceptance Criteria:**

**Given** I have available streak freezes (freezesAvailable > 0)
**When** I view my streak settings or end-of-day prompt
**Then** I see my freeze count: "X freezes available"

**Given** I missed my goal today and have freezes available
**When** the day ends (or next day begins)
**Then** the system prompts: "Use a freeze to protect your streak?"
**And** I can choose "Use Freeze" or "Let Streak Reset"

**Given** I choose "Use Freeze"
**When** the freeze is applied
**Then** today is marked as "frozen" (not goal_met, but streak continues)
**And** my freezesAvailable decreases by 1
**And** my streak count is preserved
**And** the StreakRing shows blue/frozen state

**Given** I have no freezes available
**When** I miss my goal
**Then** I am not offered the freeze option
**And** my streak resets at the end of the day

**Earning Freezes:**
**Given** I complete a 7-day streak
**When** the 7th day goal is met
**Then** I earn 1 freeze (up to max 5)
**And** I see a toast: "You earned a streak freeze!"

**Given** I complete a 30-day streak
**When** the 30th day goal is met
**Then** I earn 3 additional freezes (up to max 5)

**Given** I have 5 freezes (maximum)
**When** I would earn more
**Then** the extra freezes are not added
**And** I see: "Freeze bank full (5/5)"

---

## Story 3.8: Streak History

As a **user**,
I want **to view my streak history**,
So that **I can see my reading consistency over time**.

**Acceptance Criteria:**

**Given** I am on my profile page
**When** I tap on my streak count or "View Streak History"
**Then** I see a streak history view

**Given** I am viewing streak history
**When** the view loads
**Then** I see a calendar-style heatmap of the last 90 days
**And** each day is colored: green (goal met), blue (freeze used), gray (missed), empty (no data)
**And** I see my current streak count
**And** I see my longest streak ever

**Given** I tap on a specific day
**When** the day detail appears
**Then** I see: total minutes read, goal for that day, sessions logged
**And** I see if a freeze was used

**Given** I have a long history
**When** I scroll the heatmap
**Then** I can view older months
**And** performance remains smooth (virtualized if needed)

---
