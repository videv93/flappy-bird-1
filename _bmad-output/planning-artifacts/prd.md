---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain-skipped, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - "_bmad-output/analysis/brainstorming-session-2026-01-15.md"
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: "SaaS Consumer Social with Creator Features"
  domain: "Social/Community (Consumer)"
  complexity: "Medium-High"
  projectContext: "Greenfield"
  keyInsight: "Community with author visibility, not marketplace"
---

# Product Requirements Document - flappy-bird-1

**Author:** vitr
**Date:** 2026-01-15

## Executive Summary

A book tracking social platform where readers build habits together and authors inhabit the same spaces as their readers. Unlike Goodreads' "graveyard of finished books," this app focuses on the active reading experience—streaks, kudos, and silent reading rooms that cure reader loneliness.

**Core Innovation:** Ambient author presence—authors inhabit reader spaces, creating the feeling of shared space without pressure of live observation.

## Success Criteria

### User Success

**Primary Aha Moment:** First author presence experience
- User discovers an author they're reading has engaged with the book on the platform
- Creates emotional connection: "The author is here too"
- Target: 25% of active readers experience author presence within first 14 days

**Core Engagement:**
- Users maintain 7+ day reading streaks (habit formation)
- Users receive kudos within 48 hours of first session (social validation)
- Users join a reading room within first week (co-presence)

**Emotional Outcomes:**
- Readers feel "seen" when friends give kudos
- Readers feel "not alone" when in reading rooms with others
- Readers feel "understood" when discussing in spoiler-safe spaces

### Business Success

**Primary Metric:** DAU/MAU ratio of 30%+
- Signals strong daily engagement and habit formation
- Benchmark: Above average for social apps (~20%), approaching strong community apps (~40%)

**Growth Targets:**

| Metric | Target (3 months) | Target (12 months) |
|--------|-------------------|-------------------|
| Registered users | 1,000 | 25,000 |
| Authors claimed | 50 | 500 |
| Daily active users | 300 | 7,500 |
| 7-day retention | 40% | 50% |

**Author-Side Success:**
- 50+ indie authors claim books in first 3 months
- Authors log at least 1 reading room session
- Authors see reader engagement metrics for their books

### Technical Success

- Page load time < 3 seconds on 4G
- Reading room presence update < 30 seconds
- 99.5% uptime
- Mobile-responsive web experience
- Data export capability (user owns their reading history)

### Measurable Outcomes

| Outcome | Metric | MVP Target |
|---------|--------|------------|
| Habit formation | 7-day streak completion | 25% of active users |
| Social engagement | Kudos given per user per week | 3+ |
| Co-presence | Reading room sessions per week | 1+ per active user |
| Author supply | Authors with claimed books | 50+ |
| Retention | 7-day retention | 40% |

## Product Scope

### MVP - Minimum Viable Product

**Core Features:**
- User authentication and profiles
- Book library (currently reading, finished, want to read)
- Reading session logging with duration
- Streak system (daily reading goals)
- Activity feed (friend reading activity)
- Kudos (one-tap encouragement)
- Reading rooms with ambient presence
- Author claim and basic profile
- Author presence indicator ("Author was here recently")

**Technical Infrastructure:**
- Web-first responsive application (Next.js)
- Hybrid presence system (polling + Pusher for high-impact events)
- Book data integration (OpenLibrary/Google Books API)
- Social graph (follow/friend)

### Growth Features (Post-MVP)

- Chapter-gated discussions (spoiler-safe)
- Comprehension quizzes
- Author-certified badges
- Enhanced author dashboard
- Reading presence indicators in feed
- Book clubs / group reads

### Vision (Future)

- Collectible book creatures ("Bookemon")
- Reading Wrapped (annual summary)
- Reader matching / compatibility
- Beta reader marketplace
- Author reading events
- Voice/audio reading rooms

## User Journeys

### Journey 1: Maya - The Lonely Reader Finds Community

**Persona:** Maya, 28, Software Developer
- Reads 2-3 books/month
- Feels disconnected from other readers
- Goodreads feels like a "graveyard of finished books"
- Wants: Someone to share the experience with

**Journey Narrative:**

**Opening Scene:** Maya scrolls Instagram and sees her friend Priya's story: "Day 47 of my reading streak! Just got kudos from the author of the book I'm reading." Maya thinks: "Wait, you can get kudos from authors?"

**Rising Action:**
1. Signs up via Google auth (30 seconds)
2. Adds current read: "Project Hail Mary"
3. App shows: "4 readers currently in reading room for this book"
4. Joins silent reading room—sees presence dots, no chat required
5. Reads 20 minutes in comfortable silence with strangers

**Climax:** After logging her session, Maya receives kudos from a fellow reader: "Great choice! Chapter 12 will blow your mind." She feels SEEN—someone knows exactly where she is in the book.

**Resolution:** Maya's streak grows. The reading room becomes ritual. She discovers author engagement indicators. She realizes: "This isn't just tracking. It's community."

**Capabilities Revealed:**
- Social signup flow
- Book search/add
- Reading room presence
- Session logging
- Streak system
- Kudos notifications
- Author presence indicators

---

### Journey 2: Theo - The Indie Author Connects

**Persona:** Theo, 34, Self-Published Sci-Fi Author
- 3 books on Amazon, 2,000 total sales
- No connection to actual readers
- Desperate to know: "Did anyone GET what I was saying?"

**Journey Narrative:**

**Opening Scene:** Theo receives email: "3 readers are currently reading 'The Quantum Garden' on [App Name]." Clicks skeptically.

**Rising Action:**
1. Creates account, searches for his book (already in system via ISBN)
2. Claims book as author (Amazon author page verification)
3. Views reader dashboard: 7 readers logged, 2 currently in reading room
4. Sees reader progress and emoji reactions on specific chapters
5. Notices reaction on Chapter 5 twist

**Climax:** Theo joins his book's reading room. His author badge appears. After the session, a reader sends kudos: "The twist in Chapter 5. Wow." For the first time in 3 years, direct validation.

**Resolution:** Theo becomes a regular presence. Readers share his book knowing "the author shows up." His next launch announces a release-day reading room. Sales triple through presence, not ads.

**Capabilities Revealed:**
- Author claim/verification flow
- Author dashboard (reader metrics)
- Reading room with author badge
- Reader progress visibility
- Chapter-level reactions
- Author-reader kudos exchange

---

### Journey 3: Alex - Platform Guardian (Admin)

**Persona:** Alex, 30, Platform Operations Manager
- Responsible for content policy and community health
- Monitors platform for violations and abuse

**Journey Narrative:**

**Opening Scene:** Morning review of overnight platform activity. Flagged content queue shows 3 items.

**Rising Action:**
1. Reviews reading room report: user shared spoilers in room description
2. Checks user history: first offense, otherwise good standing
3. Sends warning with policy link, removes spoiler content
4. Reviews author verification appeal: rejected claim, insufficient proof
5. Escalates to manual verification team
6. Checks platform health metrics: reading room usage up 15%, no anomalies

**Resolution:** Platform runs smoothly. Community feels safe. Violations caught early.

**Capabilities Revealed:**
- Moderation queue
- User history/context
- Content removal tools
- Warning/communication system
- Verification workflow
- Platform metrics dashboard

---

### Journey 4: Jordan - Technical Support

**Persona:** Jordan, 26, Customer Success Specialist
- First line support for user issues
- Helps readers and authors with technical problems

**Journey Narrative:**

**Opening Scene:** Support ticket: "Reading room won't load. Error message appears."

**Rising Action:**
1. Looks up user account and session history
2. Identifies: WebSocket connection failing, likely firewall/VPN
3. Sends troubleshooting guide (try different network, check VPN)
4. User responds: VPN was blocking. Now working.
5. Marks resolved, adds to knowledge base

**Resolution:** Quick resolution. User back to reading. Pattern logged for future fixes.

**Capabilities Revealed:**
- User lookup tools
- Session/error logs
- Knowledge base integration
- Ticket management
- Communication templates

---

### Journey Requirements Summary

| Journey | Key Capabilities Needed |
|---------|------------------------|
| Maya (Reader) | Auth, book search, reading rooms, sessions, streaks, kudos, feed |
| Theo (Author) | Author claim, verification, dashboard, reader metrics, presence badge |
| Alex (Admin) | Moderation queue, user management, content tools, platform metrics |
| Jordan (Support) | User lookup, logs, knowledge base, ticket system |

**Core Platform Capabilities:**
1. **Authentication & Profiles** - Social login, user/author profiles
2. **Book System** - ISBN lookup, book pages, reading lists
3. **Session & Streaks** - Time logging, streak tracking, goals
4. **Social Layer** - Kudos, feed, follows, reactions
5. **Reading Rooms** - Ambient presence, hybrid infrastructure
6. **Author System** - Claim, verify, dashboard, engagement
7. **Admin Tools** - Moderation, user management, metrics
8. **Support Tools** - User lookup, logs, tickets

## Innovation & Novel Patterns

The user journeys above reveal a consistent theme: readers and authors occupying the same digital spaces creates magic. This section formalizes that innovation.

### Core Innovation: Ambient Author Presence

**Innovation Statement:** "The only reading app where authors inhabit the same spaces as readers."

Authors *inhabit* the same digital spaces as readers, rather than being present in real-time. This creates the feeling of shared space without the pressure of live observation.

**Why This Is Innovative:**
1. **Truly novel** - No competitor offers "ambient creator presence"
2. **Technically simpler** - Activity tracking vs always-on WebSocket infrastructure
3. **Better UX** - Possibility > Pressure for contemplative reading
4. **Author-friendly** - Authors visit when convenient, not always-on

**User Experience:**
- Reader sees: "Andy Weir was in this room 3 hours ago"
- Reader feels: "He actually comes here. I'm reading in his space."
- The magic is in the *possibility* of connection, not the *certainty*

### Secondary Innovations

1. **"Depth Over Speed" Philosophy** - Counter-positioning against Goodreads' book count culture
2. **Silent Reading Rooms** - Digital adaptation of physical library "silent study" spaces
3. **Chapter-Gated Social** - Spoiler-prevention by architecture, not moderation (post-MVP)

### Market Context & Competitive Landscape

| Competitor | What They Do | What They Don't Do |
|------------|--------------|-------------------|
| Goodreads | Book tracking, reviews | Social during reading, author presence |
| Literal.club | Modern book tracking | Real-time community, author connection |
| StoryGraph | Mood-based recommendations | Social reading, presence |
| Discord | Reading servers | Chapter-aware, progress tracking |
| Fable | Book clubs | Silent co-reading, author presence |

### Validation Approach

| Metric | Target | Measures |
|--------|--------|----------|
| Author visit frequency | 1x/week | Authors returning to their book rooms |
| Reader return lift | +20% | Retention when author has recent activity |
| Session length increase | +15% | Time spent when "author was here today" |
| Reader sentiment | Positive | "Author presence" mentioned in feedback |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Authors don't visit at all | Lower bar than real-time; incentivize with reader metrics |
| Doesn't feel "innovative" | Marketing emphasizes unique "shared space" concept |
| Readers want real-time | Add live presence as growth feature (Phase 2) |

## Technical Architecture

### Project-Type Overview

**Type:** Consumer Social SaaS with Creator Features
**Model:** Web-first responsive application
**Revenue:** Free MVP (monetization post-launch)
**Architecture:** Next.js monolith with managed services

### Data Model

**Core Entities:**

| Entity | Scope | Notes |
|--------|-------|-------|
| Users | Global | Readers and authors in same table with role flag |
| Books | Global | Shared across all users, keyed by ISBN |
| Reading Rooms | Per-book | One room per book, all readers can join |
| Sessions | Per-user | Reading time logs, private to user |
| Kudos | Social | User-to-user, attached to sessions |
| Streaks | Per-user | Daily reading tracking |

### Permission Model

**Simple Role-Based Access:**

| Role | Capabilities |
|------|-------------|
| Reader | Track books, log sessions, join rooms, give kudos, follow users |
| Author | All reader capabilities + claim books, view reader metrics, author badge |
| Admin | All capabilities + moderation, user management, platform metrics |

### Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, API routes, single codebase |
| ORM | Prisma | Type-safe, migrations, great DX |
| Database | PostgreSQL (Supabase/Railway) | Managed, includes auth options |
| Real-time | Pusher Channels | Managed, free tier, zero maintenance |
| Hosting | Vercel | Zero-config, edge functions, preview deploys |
| Analytics | Mixpanel | Event tracking, funnels |

### Architecture Pattern: Hybrid Presence

**Presence Model:**
- **Polling (30s):** Who's in the room - REST endpoint
- **Push events:** Author joins, kudos received - Pusher
- **Source of truth:** Database (PostgreSQL)
- **Graceful degradation:** Polling-only if Pusher unavailable

**Why Hybrid:**
- Ambient presence doesn't need real-time
- Push only for high-impact moments (author arrival, kudos)
- Simpler infrastructure, lower cost, faster to ship

### Integration Requirements

| Integration | Purpose | Priority |
|-------------|---------|----------|
| OpenLibrary API | ISBN lookup, book metadata | MVP |
| Google Books API | Fallback for book data | MVP |
| Google OAuth | Social sign-in | MVP |
| Apple Sign-In | iOS compliance | MVP |
| Pusher Channels | Real-time events | MVP |
| Mixpanel | User analytics | MVP |

### Implementation Priorities

1. Core user flows (signup, add book, log session)
2. Streak system (habit formation driver)
3. Activity feed (social engagement)
4. Reading rooms with hybrid presence (differentiator)
5. Author claim flow (supply side)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Goal: Prove we can solve reader loneliness and create reading habit
- Focus: Streak mechanics + social validation + co-presence
- Validation: Do readers return daily? Do they feel less alone?

**Key Risk to Mitigate:** Readers won't form habit
- If the streak/feed/kudos loop doesn't create daily behavior, nothing else matters
- Author presence is enhancement, not proof point

**Resource Requirements:**
- 1-2 full-stack developers (Next.js proficient)
- 1 designer (part-time, UI/UX)
- Estimated MVP timeline: 6-8 weeks

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Maya (Reader): Full journey - signup to streak habit
- Theo (Author): Partial - claim book, basic presence indicator

**Must-Have Capabilities:**

| Capability | Description | Why MVP |
|------------|-------------|---------|
| User auth | Google/Apple sign-in | Table stakes |
| Book tracking | Add books, mark reading status | Core utility |
| Session logging | Log reading time | Streak input |
| Streak system | Daily goals, streak count, streak freezes | Habit driver |
| Activity feed | Friend reading activity | Social visibility |
| Kudos | One-tap encouragement | Social validation |
| Follow system | Build reading network | Feed source |
| Reading rooms | Join room, see presence | Loneliness cure |
| Author claim | Basic verification flow | Supply side start |
| Presence indicator | "Author was here recently" | Differentiation hint |

**Explicitly Out of MVP:**
- Chapter-gated discussions
- Comprehension quizzes
- Author dashboard with detailed metrics
- Collectible creatures
- Reading Wrapped
- Reader matching

### Post-MVP Roadmap

**Phase 2 - Growth (Month 3-6):**
- Chapter discussions (spoiler-free social)
- Enhanced author dashboard
- Reading clubs
- Streak leaderboards
- Mobile PWA optimization

**Phase 3 - Expansion (Month 6-12):**
- Comprehension quizzes
- Author-certified badges
- Collectible book creatures
- Reading Wrapped
- Reader matching

**Phase 4 - Platform (Year 2+):**
- Beta reader marketplace
- Premium tiers
- API for integrations
- Publisher partnerships

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Mitigation |
|------|------------|
| Reading rooms don't scale | Hybrid presence (polling + push) |
| Pusher reliability | Graceful degradation to polling-only |
| Database performance | Connection pooling from day one |

**Market Risks:**

| Risk | Mitigation |
|------|------------|
| Readers don't form habit | A/B test streak mechanics; iterate fast |
| Authors don't show up | Reader community works standalone |
| Competition copies | Brand + community > features |

**Resource Risks:**

| Risk | Mitigation |
|------|------------|
| Fewer developers | Cut author dashboard, keep core loop |
| Longer timeline | Launch reading rooms as "beta" |
| Higher costs | Stick to free tier services |

## Functional Requirements

### User Management

- **FR1:** Users can create an account using Google or Apple sign-in
- **FR2:** Users can view and edit their profile (name, bio, reading preferences)
- **FR3:** Users can follow other users to see their reading activity
- **FR4:** Users can unfollow users they previously followed
- **FR5:** Users can view another user's public profile and reading activity
- **FR6:** Authors can claim authorship of their books with verification

### Book Library

- **FR7:** Users can search for books by title, author, or ISBN
- **FR8:** Users can add books to their library with status (reading, finished, want-to-read)
- **FR9:** Users can update the reading status of books in their library
- **FR10:** Users can remove books from their library
- **FR11:** Users can view book details including metadata and cover
- **FR12:** Users can see if an author has claimed a book

### Reading Sessions

- **FR13:** Users can log a reading session with duration
- **FR14:** Users can view their reading session history for any book
- **FR15:** Users can see their total reading time across all books
- **FR16:** System tracks reading sessions for streak calculation

### Streak System

- **FR17:** Users can set a daily reading goal (time-based)
- **FR18:** Users can view their current streak count
- **FR19:** Users receive streak credit when daily goal is met
- **FR20:** Users can use a streak freeze to protect their streak
- **FR21:** System resets streak when goal is missed without freeze
- **FR22:** Users can view their streak history

### Social & Activity

- **FR23:** Users can view an activity feed of followed users' reading activity
- **FR24:** Users can give kudos to another user's reading session
- **FR25:** Users receive notifications when they get kudos
- **FR26:** Users can view kudos received on their sessions
- **FR27:** Feed shows reading sessions, finished books, and streak milestones

### Reading Rooms

- **FR28:** Users can join a reading room for any book
- **FR29:** Users can see who else is currently in a reading room
- **FR30:** Users can see when an author was last present in a room
- **FR31:** Users receive notification when an author joins a room they're in
- **FR32:** Users can leave a reading room
- **FR33:** Authors are visually distinguished in reading rooms

### Administration

- **FR34:** Admins can view a moderation queue of flagged content
- **FR35:** Admins can remove content that violates policies
- **FR36:** Admins can warn or suspend user accounts
- **FR37:** Admins can review and approve author verification requests
- **FR38:** Admins can view platform health metrics
- **FR39:** Support can look up user accounts and session history

## Non-Functional Requirements

### Performance

**Response Times:**
- Page load: < 3 seconds on 4G mobile connection
- Core actions (log session, give kudos): < 2 seconds
- Reading room presence update: < 30 seconds (polling interval)
- Push notifications (kudos, author join): < 5 seconds

**Concurrency:**
- Support 100 concurrent users in MVP
- Individual reading room capacity: 50 concurrent users

### Security

**Authentication:**
- OAuth 2.0 via Google and Apple providers
- JWT tokens with 24-hour expiration
- Secure token refresh mechanism

**Data Protection:**
- All data encrypted in transit (HTTPS/TLS 1.3)
- Database encryption at rest
- Reading history treated as private by default

**Privacy:**
- Users control visibility of reading activity
- GDPR-compliant data export and deletion
- No selling of user data to third parties

### Scalability

**MVP Baseline:**
- Support 1,000 registered users
- Support 300 daily active users
- Handle 10 reading rooms with 20 concurrent users each

**Growth Path:**
- Architecture supports 10x growth without re-architecture
- Database connection pooling from day one
- Stateless application layer for horizontal scaling

### Accessibility

**Compliance Target:** WCAG 2.1 Level AA

**Core Requirements:**
- Keyboard navigation for all core flows
- Screen reader compatibility (semantic HTML, ARIA labels)
- Sufficient color contrast (4.5:1 for text)
- Focus indicators on interactive elements
- Alt text for book covers
- Readable text sizing (minimum 16px base)

### Reliability

**Availability:**
- Target 99.5% uptime
- Planned maintenance during low-usage hours

**Data Integrity:**
- Streak data never lost due to system error
- Session logs preserved even if push fails
- Daily database backups with 30-day retention

**Graceful Degradation:**
- App functions without real-time if Pusher unavailable
- Fallback to polling if push connection fails
- Clear user messaging during outages
