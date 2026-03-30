# Mossy Meetups — Development Roadmap

> Source of truth for sequencing, status, and next execution targets.
> This document now reflects the work already completed to stabilize deployment and evolve the product.

## Sequencing principle

```text
Stabilize runtime → Core planning flows → Polling + calendar → UX polish → Communications → Full-suite hardening → Launch
```

The earlier roadmap tested too early relative to runtime and product volatility. Going forward:

- runtime and core workflow correctness come first
- UX and feature shape settle next
- comprehensive testing and coverage expansion happen after the major interaction model is in place

---

## Current product snapshot

Mossy Meetups currently supports:

- magic-link auth
- groups, invites, and profile setup
- event creation and editing
- RSVP tracking
- TBD date voting
- location voting
- event and all-events `.ics` export
- list, rolling week, and month homepage calendar views
- Celsius-first multi-day weather previews
- per-event discussion threads
- Docker/Dokploy deployment via a custom production server
- self-contained local E2E testing with isolated Postgres + MailHog

---

## Phase 0 — Runtime Stabilization ✓
**Goal:** App builds, deploys, and stays healthy in Docker/Dokploy before feature work continues.

### Completed

- [x] Investigated production `502 Bad Gateway` failures down to the actual container/runtime path
- [x] Hardened `GET /api/health` so Prisma-init failures degrade cleanly instead of throwing 500s
- [x] Switched Prisma client usage to a singleton pattern in production
- [x] Added static `/healthz` route for container liveness
- [x] Diagnosed Next 13.4.4 production worker-loop issues inside Docker
- [x] Replaced `next start` in production with a custom Node server in [server.js](/home/boilerrat/mossy-meetups/server.js)
- [x] Updated Docker runtime to use the custom server and stable healthcheck path
- [x] Restored required providers in `_app.tsx` after temporary debugging simplification
- [x] Confirmed live Dokploy container health on VPS

### Notes

- Docker/Dokploy now uses `node server.js`
- `/healthz` is the container liveness endpoint
- `/api/health` remains the application/database health endpoint

---

## Phase 1 — Auth, Profiles, and Membership ✓
**Goal:** Only invited/authorized users can access their groups and events.

- [x] Magic-link auth with NextAuth email provider
- [x] Session gating across protected pages and APIs
- [x] User profile editing
- [x] Group creation owned by the signed-in user
- [x] Group invites and join-by-token flow
- [x] Membership-based dashboard and group visibility

---

## Phase 2 — Core Planning Flows ✓
**Goal:** Users can create and manage the actual trips they care about.

- [x] Group and event creation flows
- [x] Event editing and deletion
- [x] Potluck flag
- [x] Nights-based trip duration instead of manual departure entry
- [x] RSVP flow with attendee breakdown
- [x] Auto-join to group on RSVP
- [x] Maps link/embed support

---

## Phase 3 — Polling and Calendar Coordination ✓
**Goal:** Events can move from “idea” to “confirmed plan.”

### Date voting

- [x] TBD events appear in a dedicated `Needs a date` section
- [x] Date proposal model and vote model
- [x] Date availability grid
- [x] Admin confirm-date action

### Location voting

- [x] Location option model and vote model
- [x] Event-page location voting grid
- [x] Admin confirm-location action
- [x] Comma-separated location option seeding during event create/edit
- [x] Dedicated `Needs a location` homepage section for date-confirmed / location-unconfirmed events

### Calendar

- [x] Per-event `.ics` export
- [x] All-events `.ics` export from homepage

---

## Phase 4 — UX and Product Polish ✓
**Goal:** The app should feel intentional, legible, and easier to operate.

### Completed UX work

- [x] AppShell and sidebar navigation
- [x] List cards, rolling week view, and month view
- [x] Default homepage calendar mode switched to `List`
- [x] Rolling week view now starts from today instead of Monday
- [x] Weather previews shown in week view when location is available
- [x] Celsius-first weather on event cards
- [x] Multi-day weather forecast tiles for multi-night trips
- [x] Group names and event-detail links restyled from plain hyperlinks into buttons/pills
- [x] Nav icon underline cleanup and stronger username button styling
- [x] Larger wordmark presence in the top nav
- [x] Event-page breadcrumb/back link converted to a real button
- [x] Better helper copy around location voting
- [x] FAQ and README brought in line with current product behavior

### Completed content / aesthetic work

- [x] Theme toggle
- [x] Moss textures / field-guide styling direction
- [x] Custom 404/500 pages
- [x] Camp guide / etiquette / safety / personality content

---

## Phase 5 — Communications Threads ✓
**Goal:** Every event gets one simple conversation space that stays with it through planning, voting, and the trip itself.

### MVP shape

- [x] One flat discussion thread per event
- [x] Available on all event states:
  - [x] TBD date
  - [x] date confirmed / location vote active
  - [x] fully confirmed event
- [x] Chronological comments, no nested replies in MVP
- [x] Event members/admin can read and post
- [x] Comment authors can edit/delete their own messages
- [x] Group admin can moderate/delete any event comment

### Backend steps

- [x] Add `EventComment` model to Prisma schema
  - Fields: `id`, `eventId`, `userId`, `body`, `createdAt`, `updatedAt`
- [x] Add relation from `Event` to `EventComment`
- [x] Add relation from `User` to `EventComment`
- [x] Create Prisma migration
- [x] Reuse event-membership guard helpers for discussion APIs

### API steps

- [x] `GET /api/events/[id]/comments`
- [x] `POST /api/events/[id]/comments`
- [x] `PATCH /api/events/[id]/comments/[commentId]`
- [x] `DELETE /api/events/[id]/comments/[commentId]`
- [x] Validate body length and trim empty messages

### UI steps

- [x] Add `Discussion` panel to the event detail page
- [x] Render author name, timestamp, and message body
- [x] Add composer textarea + submit button
- [x] Empty state copy for events with no comments yet
- [x] Mobile-safe spacing and scrolling behavior

### Post-MVP candidates

- [ ] Comment count badge on event cards
- [ ] Unread indicator
- [ ] Realtime refresh / polling
- [ ] Mentions
- [ ] Attachments
- [ ] Nested replies if flat threads prove insufficient

---

## Phase 6 — Full Test Suite and Release Hardening
**Goal:** Comprehensive testing happens after the interaction model stabilizes, not before.

### Why this moved later

- The app changed significantly during stabilization and UI redesign
- Early tests locked in behavior that was later replaced
- Docker/runtime bugs mattered more than nominal handler coverage

### Completed in the current pass

- [x] Audited current tests for outdated assumptions after runtime and product changes
- [x] Refreshed API tests for:
  - [x] nights-based event date calculation
  - [x] location-option seeding during event create/edit
  - [x] confirmed-location vs location-vote-option validation
  - [x] weather forecast multi-day endpoint behavior
  - [x] current RSVP auto-join behavior
  - [x] discussion-thread API behavior
- [x] Refreshed data-layer tests for homepage serialization, including location option names used by edit forms and location-vote cards
- [x] Refreshed Playwright coverage for:
  - [x] unauthenticated redirect behavior
  - [x] login page render
  - [x] login form submission confirmation
  - [x] full magic-link sign-in + RSVP flow against seeded local data
- [x] Added isolated local E2E harness:
  - [x] local Postgres test database
  - [x] local MailHog SMTP sink
  - [x] schema reset before Playwright runs
  - [x] Playwright no longer depends on VPS `.env` database settings
- [x] Verified current suite locally:
  - [x] `npm run lint`
  - [x] `npm test`
  - [x] `npm run test:e2e`

### Remaining work

- [ ] Expand API tests to cover:
  - [ ] all-events calendar export
- [ ] Expand data-layer tests to cover homepage event splitting:
  - [ ] needs-a-location coverage explicitly
- [ ] Add component-level tests for:
  - [ ] `WeekView`
  - [ ] `MonthView`
  - [ ] `LocationVoteCard`
  - [ ] weather widget range rendering
- [ ] Expand Playwright coverage around current UI:
  - [ ] core dashboard render
  - [ ] RSVP flow
  - [ ] location-vote event visibility
  - [ ] calendar export affordances
- [ ] Add production-smoke verification for:
  - [ ] `/healthz`
  - [ ] `/api/health`
  - [ ] custom server boot path
- [ ] Decide target coverage and CI gating after the test inventory is current

### Current verification snapshot

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run test:e2e`
- [ ] production Docker build
- [ ] VPS smoke check

---

## Phase 7 — Launch Readiness
**Goal:** Finish the remaining product/ops polish once communications and tests are in place.

- [ ] Revisit email delivery configuration and document SMTP requirements cleanly
- [ ] Add clearer onboarding for first-time users
- [ ] Review accessibility and contrast after latest UI pass
- [ ] Add analytics/observability only if useful
- [ ] Decide whether event discussions should trigger email notifications
- [ ] Prepare shareable demo data / screenshots

---

## Immediate next execution target

When execution resumes, work in this order:

1. Expand the refreshed test suite into the remaining UI and export gaps.
2. Expand test coverage into the remaining dashboard, export, and component gaps.
3. Re-run full verification after the next milestone lands.
