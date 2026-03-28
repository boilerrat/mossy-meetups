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

## Phase 4 — WeekView & core UI
**Goal:** The primary day-to-day experience — a week grid of upcoming events.

- [ ] Wire Tailwind (`tailwind.config.js` + `src/styles/globals.css` + import in `_app.tsx`)
- [ ] Extract `EventCard`, `GroupCard` out of `index.tsx` into `src/components/`
- [ ] `WeekView` — 7-column grid, events plotted by earliest `DateOption`
- [ ] `AppShell` with `GroupSidebar` navigation
- [ ] Mobile responsive collapse (single-column below 768px)
- [ ] Calendar date picker modal — replace `datetime-local` inputs with a custom calendar popup
- [ ] Google Maps embed is already wired (`mapEmbed` field + iframe render); no changes needed

---

## Phase 5 — Date polling & calendar export
**Goal:** The "which weekend works?" flow and calendar handoff.

- [ ] `DatePoll` component — members vote on date options per event
- [ ] `confirmedDateOptionId` FK on `Event` + admin confirm action
- [ ] `GET /api/events/[id]/ics` — `.ics` download for confirmed events

---

## Phase 6 — Test suite & hardening
**Goal:** 80% coverage, rate limiting, health checks. Required before public launch.

- [ ] Install Vitest + React Testing Library + Playwright
- [ ] Unit tests for all API route handlers (happy path + error paths)
- [ ] Unit tests for `getHomePageData` and `parseDateOptions`
- [ ] Integration test: create group → create event
- [ ] Playwright E2E: magic-link → RSVP flow
- [ ] Rate limiting on all `POST` routes
- [ ] `GET /api/health` endpoint
- [ ] Docker `HEALTHCHECK` directive in `Dockerfile`
- [ ] Upgrade Node 18 → 20 LTS in `Dockerfile` and CI

---

## Phase 7 — Design polish
**Goal:** Brand tokens wired, typography loaded, accessibility clean. Ship last.

- [ ] CSS custom properties for all brand color tokens
- [ ] Dark / light theme toggle
- [ ] Fraunces + Inter via `next/font/google`
- [ ] WCAG AA contrast audit
- [ ] Error boundary component
- [ ] Custom 404 and 500 pages
- [ ] Design SVG Logo
- [ ] Hero Section redsign with logo and rewording. Logo on right side of hero


---

## Completed

_Move items here with a date when a phase is done._
