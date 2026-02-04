# Epic 2: Book Library & Discovery

## Story 2.1: Book Search via External APIs

As a **user**,
I want **to search for books by title, author, or ISBN**,
So that **I can find books to add to my library**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to the Search tab
**Then** I see a search input with placeholder "Search by title, author, or ISBN"
**And** the input is focused automatically on mobile

**Given** I am on the search page
**When** I type at least 3 characters
**Then** search results appear after 300ms debounce
**And** I see a loading skeleton while fetching
**And** results show book cover, title, author, and publication year

**Given** I search for a book
**When** results are returned from OpenLibrary API
**Then** I see up to 20 results
**And** if OpenLibrary fails, Google Books API is used as fallback
**And** results are deduplicated by ISBN when possible

**Given** I search by ISBN (10 or 13 digit)
**When** results are returned
**Then** the exact match appears first
**And** the ISBN is validated before search

**Given** my search returns no results
**When** the search completes
**Then** I see "No books found for '[query]'" message
**And** I see suggestions to try different search terms

**Given** the search API fails
**When** the error occurs
**Then** I see a friendly error message with retry option
**And** the error is logged to Sentry

---

## Story 2.2: Add Book to Library

As a **user**,
I want **to add books to my library with a reading status**,
So that **I can track what I'm reading, have read, or want to read**.

**Acceptance Criteria:**

**Given** I am viewing search results
**When** I tap on a book that's not in my library
**Then** I see an "Add to Library" button
**And** I can select a status: "Currently Reading", "Finished", or "Want to Read"

**Given** I select a status and tap "Add"
**When** the book is added
**Then** the book appears in my library immediately (optimistic UI)
**And** I see a success toast "Added to [status]"
**And** the Book record is created if it doesn't exist (upsert by ISBN)
**And** a UserBook record links me to the book with the selected status

**Given** a book is already in my library
**When** I view it in search results
**Then** I see a checkmark and current status instead of "Add" button
**And** I can tap to change status or go to the book

**Given** I add a book as "Currently Reading"
**When** the book is added
**Then** it appears at the top of my Library's "Currently Reading" section
**And** the book has a default progress of 0%

*Creates: Book table (isbn, title, author, coverUrl, pageCount, publishedYear, description), UserBook table (userId, bookId, status, dateAdded, dateFinished, progress)*

---

## Story 2.3: Book Detail Page

As a **user**,
I want **to view detailed information about a book**,
So that **I can learn more before adding it or while reading it**.

**Acceptance Criteria:**

**Given** I tap on a book from search or my library
**When** the book detail page loads
**Then** I see a hero section with large book cover
**And** I see title, author(s), publication year, page count
**And** I see book description (expandable if long)
**And** I see ISBN for reference

**Given** I am viewing a book detail page
**When** an author has claimed this book on the platform
**Then** I see an "Author Verified" badge next to the author name
**And** the badge has a subtle golden accent

**Given** I am viewing a book detail page
**When** other users have this book in their library
**Then** I see "X readers" count (social proof)
**And** I see "Y currently reading" if applicable
**And** this data comes from aggregated UserBook records

**Given** the book is not in my library
**When** I view the detail page
**Then** I see prominent "Add to Library" CTA

**Given** the book is in my library
**When** I view the detail page
**Then** I see my current status and progress
**And** I see quick actions to update status or log a session

---

## Story 2.4: Update Reading Status

As a **user**,
I want **to update the reading status of books in my library**,
So that **I can track my reading journey accurately**.

**Acceptance Criteria:**

**Given** I have a book in my library
**When** I view the book detail page or library card
**Then** I see my current status displayed
**And** I can tap to change it

**Given** I tap to change status
**When** the status picker appears
**Then** I see three options: "Currently Reading", "Finished", "Want to Read"
**And** my current status is highlighted

**Given** I select a new status
**When** I confirm the change
**Then** the status updates immediately (optimistic UI)
**And** I see a toast confirming the change
**And** the book moves to the appropriate section in my library

**Given** I change status to "Finished"
**When** the change is saved
**Then** dateFinished is set to current date
**And** progress is set to 100%

**Given** I change status from "Finished" back to "Currently Reading"
**When** the change is saved
**Then** dateFinished is cleared
**And** progress remains at 100% (user can adjust)

---

## Story 2.5: Remove Book from Library

As a **user**,
I want **to remove books from my library**,
So that **I can keep my library organized and relevant**.

**Acceptance Criteria:**

**Given** I have a book in my library
**When** I view the book detail page
**Then** I see a "Remove from Library" option (in menu or secondary action)

**Given** I tap "Remove from Library"
**When** the confirmation appears
**Then** I see "Remove [Book Title] from your library?"
**And** I see warning: "This will remove your reading history for this book"
**And** I see "Cancel" and "Remove" buttons

**Given** I confirm removal
**When** the book is removed
**Then** the book disappears from my library immediately
**And** I see a toast with "Undo" option (5 seconds)
**And** the UserBook record is soft-deleted

**Given** I tap "Undo" on the toast
**When** undo is processed
**Then** the book is restored to my library
**And** all previous data (status, progress, sessions) is preserved

---

## Story 2.6: Library View & Organization

As a **user**,
I want **to view my book library organized by reading status**,
So that **I can easily see what I'm reading and find my next book**.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to the Library tab
**Then** I see my books organized in sections: "Currently Reading", "Want to Read", "Finished"
**And** "Currently Reading" section appears first
**And** each section shows book count

**Given** I have books in "Currently Reading"
**When** I view that section
**Then** books are sorted by most recently active (last session or date added)
**And** each book card shows: cover, title, author, progress bar
**And** each book card shows presence indicator: "X reading now" (social proof)

**Given** I have books in "Finished"
**When** I view that section
**Then** books are sorted by dateFinished (most recent first)
**And** each book card shows completion date

**Given** I have no books in my library
**When** I view the Library tab
**Then** I see an empty state: "Start your reading journey"
**And** I see a CTA button: "Find a Book" (links to Search)

**Given** I have many books (10+)
**When** I scroll through a section
**Then** the list virtualizes for performance
**And** I can pull-to-refresh to update presence counts

---
