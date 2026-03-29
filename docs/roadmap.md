# Mossy Meetups — Development Roadmap

> Source of truth for development sequencing and feature status.
> Update this file when phases complete or priorities shift.

## Sequencing principle

```
Deploy → Auth → Membership → RSVP → WeekView → Polls → Tests → Polish
```

Nothing in Phase 2+ is safe to ship without Phase 1 (auth).
Everything in Phase 4+ is cosmetic relative to the core data flows in Phases 1–3.

---

## Phase 0 — Deployment stable ✓
**Goal:** Container builds and runs on `moss.boilerhaus.org`. Nothing else ships until this is green.

- [x] Docker image builds cleanly
- [x] App starts and serves at `moss.boilerhaus.org`
- [x] Postgres container reachable from app container
- [x] `prisma migrate deploy` runs as pre-deploy step
- [ ] CI passes on `main`

---

## Phase 1 — Auth (blocker for everything) ✓
**Goal:** All data is gated behind a magic-link session. No anonymous access.

- [x] Install `next-auth` + email provider (Resend or SMTP)
- [x] Add `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM` to env + `.env.example`
- [x] Wire `GET/POST /api/auth/[...nextauth]` with `EmailProvider`
- [x] Add `src/pages/_app.tsx` with `<SessionProvider>`
- [x] Add `getServerSession` guard to `POST /api/groups`
- [x] Add `getServerSession` guard to `POST /api/events`
- [x] Add `Invite` model to Prisma schema + migration (needed for Phase 2)
- [x] Login page (`/login`) + magic-link email working in staging

---

## Phase 1.5 — User profiles ✓
**Goal:** Users can set their identity once and the app uses it everywhere.

- [x] Add `phone`, `hometown`, and `bio` columns to `User` schema + migration
- [x] `GET /api/profile` — return current user's profile
- [x] `PATCH /api/profile` — update name, email, phone, hometown, bio
- [x] `/profile` page — edit form pre-filled from session user
- [x] Auto-redirect to `/profile` after first sign-in (when `name` is null)
- [ ] Pre-fill group/event forms from profile where applicable

Fields: display name, email (sign-in address, shown but not editable), phone, hometown, bio (short freeform).

---

## Phase 2 — Group membership ✓
**Goal:** Users can be invited to groups and see only their own groups.

- [x] `POST /api/invites` — group admin sends invite email with signed token
- [x] `/join/[token]` page — validates token, adds user to group, redirects to dashboard
- [x] Dashboard filters groups/events by membership (admin or accepted invite)
- [x] Group detail page `/groups/[id]` — members list, events, invite form
- [x] Membership tracked via `Invite.usedAt` + `userId`
- [x] `POST /api/groups` now uses session user as admin (removed `adminEmail` body field)

---

## Phase 3 — RSVP flow ✓
**Goal:** Members can RSVP to events. RSVP count is live on event cards.

- [x] `POST /api/rsvps` — upsert; one RSVP per user per event
- [x] `RSVPButton` component — ATTENDING / MAYBE / NOT_ATTENDING toggle
- [x] Event detail page `/events/[id]` with RSVP panel + attendee list
- [x] Live RSVP count on `EventCard`

---

## Phase 4 — WeekView & core UI ✓
**Goal:** The primary day-to-day experience — a week grid of upcoming events.

- [x] Wire Tailwind (`tailwind.config.js` + `src/styles/globals.css` + import in `_app.tsx`)
- [x] Extract `EventCard`, `GroupCard` out of `index.tsx` into `src/components/`
- [x] `WeekView` — 7-column grid, events plotted by `arrivalDate`
- [x] `AppShell` with `GroupSidebar` navigation
- [x] Mobile responsive collapse (single-column below 768px)
- [x] Calendar date picker modal — replace `datetime-local` inputs with a custom calendar popup
- [x] Google Maps embed is already wired (`mapEmbed` field + iframe render); no changes needed

---

## Phase 5 — Date & location voting + calendar export ✓
**Goal:** Members coordinate "when and where" for TBD events. Confirmed events export to calendar.

> **UX model:** Events with no `arrivalDate` are "TBD" — they surface in a separate section and
> get a voting interface instead of a date display. Once the admin confirms a date (and optionally
> a location), the event graduates to the Upcoming section automatically.

### TBD event section (dashboard + group pages)
- [x] Events without `arrivalDate` appear in a **"Needs a date"** section below Upcoming Events
- [x] TBD event cards show a "Vote on date →" prompt linking to the event detail voting panel
- [x] Once `arrivalDate` is set, the event disappears from TBD and appears in Upcoming

### Date voting (LettuceMeet-style availability grid)
- [x] `DateProposal` model — id, eventId, date (DateTime), createdBy (userId), votes
- [x] `DateVote` model — id, dateProposalId, userId; `@@unique([dateProposalId, userId])`
- [x] `DateVoteGrid` component — proposed dates as columns, members as rows; click cell to toggle green/grey
- [x] `POST /api/date-proposals` — any group member adds a candidate date to a TBD event
- [x] `DELETE /api/date-proposals/[id]` — proposer or admin removes a candidate
- [x] `POST /api/date-votes` — toggle current user's availability on a proposed date (delete-first pattern)
- [x] Admin "Confirm date" action → writes `arrivalDate` on Event; event moves to Upcoming

### Location voting (creator-defined options)
- [x] `LocationOption` model — id, eventId, name, mapLink?, mapEmbed?, createdBy (userId)
- [x] `LocationVote` model — id, locationOptionId, userId; `@@unique([eventId, userId])` (one vote per event)
- [x] `LocationPoll` component — list of options with vote bar/count; click to cast or change vote
- [x] `POST /api/location-options` — creator adds a candidate location (admin only, max 4)
- [x] `DELETE /api/location-options/[id]` — creator removes a candidate
- [x] `POST /api/location-votes` — upsert one vote per user per event
- [x] Admin "Confirm location" action → writes `location`, `mapLink`, `mapEmbed` on Event

### Calendar export
- [x] `GET /api/events/[id]/ics` — `.ics` download for events with a confirmed `arrivalDate`

---

## Phase 6 — Test suite & hardening ✓
**Goal:** 80% coverage, rate limiting, health checks. Required before public launch.

- [x] Install Vitest + React Testing Library + Playwright
- [x] Unit tests for all API route handlers (happy path + error paths)
- [x] Unit tests for `getHomePageData` and `parseDateOptions`
- [x] Integration test: create group → create event
- [x] Playwright E2E: magic-link → RSVP flow
- [x] Rate limiting on all `POST` routes
- [x] `GET /api/health` endpoint
- [x] Docker `HEALTHCHECK` directive in `Dockerfile`
- [x] Upgrade Node 18 → 20 LTS in `Dockerfile` and CI

---

## Phase 7 — Design polish ✓
**Goal:** Brand tokens wired, typography loaded, accessibility clean. Ship last.

- [x] CSS custom properties for all brand color tokens
- [x] Dark / light theme toggle
- [x] Fraunces + Inter via `next/font/google`
- [x] WCAG AA contrast audit
- [x] Error boundary component
- [x] Custom 404 and 500 pages
- [x] Design SVG Logo
- [x] Hero Section redesign with logo and rewording. Logo on right side of hero.
- [x] Create a new project readme, making it as beautiful as markdown can be. It should match the project where possible, utilizing graphics, badges and banners to make it look amazing.

## Phase 8a — Bug Fixes & Critical UX Corrections
**Goal:** Fix known bugs and UX gaps that break or obscure core functionality.

- [x] **Map embed input** — the map field expects a Google Maps `<iframe>` embed snippet, not a plain URL. Update the input label, placeholder, and help text to reflect this. If the user pastes a full `<iframe>` tag, parse the `src` attribute automatically rather than storing raw HTML.
- [x] **Single vote enforcement on date proposals** — verify that `POST /api/date-votes` enforces the `@@unique([dateProposalId, userId])` constraint at the API layer, not just the database, and that the UI disables or un-highlights a cell the user has already voted on so the state is always visible.
- [x] **Location voting UX overhaul** — current location voting is confusing or non-functional. Replace it with a LettuceMeet-style grid (locations as columns, members as rows, click a cell to cast or change your vote) that mirrors the date voting experience. Enforce one vote per user per event.
- [x] **Edit and delete for your own groups** — group admins should see "Edit" and "Delete" controls on the group detail page. Deleting a group must confirm before proceeding and cascade-removes all events, RSVPs, and invites.

---

## Phase 8b — Event & Group Feature Enhancements
**Goal:** Improve the event planning workflow with focused additions that remove friction.

- [x] **Nights counter replaces departure date** — swap the departure date field for a "How many nights?" number input. Departure date is calculated automatically (`arrivalDate + nights`). For TBD events, apply the same nights offset to each date proposal so the full stay window shows in the availability grid.
- [x] **Auto-join group on RSVP** — when a user RSVPs "Attending" or "Maybe" to an event, add them to the event's group as a member automatically if they are not already one. Email invites remain available in parallel as a way to reach people before they find the event.
- [x] **Potluck flag on events** — add a "Potluck" checkbox to event creation and the event edit form. Show a potluck badge on EventCards and on the event detail page when enabled.
- [x] **Countdown pill on EventCards** — for events with a confirmed arrival date, display "X days away", "Tomorrow", "Today!", or "Happening now" as a small pill. Update the label appropriately once the event is in the past.
- [x] **"My RSVPs" filter on the dashboard** — add a toggle that switches the event list between "All upcoming events" and "Events I've responded to". Remember the last-used preference in local state.

---

## Phase 8c — Polish & Interaction Delight
**Goal:** Add the small touches that make the app feel alive and easy to use.

- [ ] **Contextual tooltips** — add helpful tooltips in at least these locations: date vote grid cells (what a filled vs. empty cell means), the nights counter input, the RSVP status buttons (what MAYBE implies for headcount), and the "Confirm date" admin action.
- [ ] **Links as buttons** — audit all inline text links and replace any that look like plain body text with clearly styled link or button components. Every clickable affordance should look clickable.
- [ ] **Weather on event cards** — integrate [Open-Meteo](https://open-meteo.com/) (free, no API key required) to fetch a forecast for each confirmed event date and location. Show a weather condition icon and temperature on the EventCard. Add a subtle CSS animation (sun rays, drifting clouds, rain drops) that matches the forecast — keep it tasteful but fun.

---

## Phase 8d — Content & Personality ("More Moss")
**Goal:** Lean into the Dead-head / festival camping aesthetic with useful, playful content that makes the site feel like a living camp community.

- [ ] **Visual moss** — add illustrated or SVG moss textures to card edges, the sidebar footer, section dividers, and the page footer. The goal is organic shapes and textures, not just green colour.
- [ ] **Camping essentials checklist** — a page or collapsible panel listing packing must-haves written in the spirit of a vintage Boy Scout field manual. Make it practical and printable.
- [ ] **First aid quick-reference** — basic wilderness first-aid reminders (cuts, burns, sprains, bee stings). Keep the tone earnest and the content actually useful.
- [ ] **Tick safety guide** — how to check after a hike, how to remove a tick properly, and when to see a doctor. Practical tone; no need to be scary.
- [ ] **Rainy day activities** — a fun list of things to do when the skies open up at camp. Lean into the culture.
- [ ] **Campers' etiquette** — a playful, slightly tongue-in-cheek set of camp commandments for good citizens of the site (quiet hours, shared fire wood, leave no trace, etc.).
- [ ] **FAQ / How-to guide** — a short explainer covering the core flows: creating a group, sending invites, proposing and voting on dates, confirming a date, RSVPing, and exporting to calendar. Link it from the nav or footer.

---

## Completed

_Move items here with a date when a phase is done._
