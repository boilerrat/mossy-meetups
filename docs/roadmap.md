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

## Phase 0 — Deployment stable
**Goal:** Container builds and runs on `moss.boilerhaus.org`. Nothing else ships until this is green.

- [ ] Docker image builds cleanly
- [ ] App starts and serves at `moss.boilerhaus.org`
- [ ] Postgres container reachable from app container
- [ ] `prisma migrate deploy` runs as pre-deploy step
- [ ] CI passes on `main`

---

## Phase 1 — Auth (blocker for everything)
**Goal:** All data is gated behind a magic-link session. No anonymous access.

- [ ] Install `next-auth` + email provider (Resend or SMTP)
- [ ] Add `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM` to env + `.env.example`
- [ ] Wire `GET/POST /api/auth/[...nextauth]` with `EmailProvider`
- [ ] Add `src/pages/_app.tsx` with `<SessionProvider>`
- [ ] Add `getServerSession` guard to `POST /api/groups`
- [ ] Add `getServerSession` guard to `POST /api/events`
- [ ] Add `Invite` model to Prisma schema + migration (needed for Phase 2)
- [ ] Login page (`/login`) + magic-link email working in staging

---

## Phase 2 — Group membership
**Goal:** Users can be invited to groups and see only their own groups.

- [ ] `POST /api/invites` — group admin sends invite email with signed token
- [ ] `GET /api/invites/[token]` — validates token, adds user to group, redirects to dashboard
- [ ] `GET /api/groups` — returns only groups the authed user belongs to
- [ ] Group detail page `/groups/[id]`
- [ ] Membership tracked via `Invite.usedAt` (or `UserGroup` pivot table)

---

## Phase 3 — RSVP flow
**Goal:** Members can RSVP to events. RSVP count is live on event cards.

- [ ] `POST /api/rsvps` — upsert; one RSVP per user per event
- [ ] `RSVPButton` component — ATTENDING / MAYBE / NOT_ATTENDING toggle
- [ ] Event detail page `/events/[id]` with RSVP panel + attendee list
- [ ] Live RSVP count on `EventCard`

---

## Phase 4 — WeekView & core UI
**Goal:** The primary day-to-day experience — a week grid of upcoming events.

- [ ] Wire Tailwind (`tailwind.config.js` + `src/styles/globals.css` + import in `_app.tsx`)
- [ ] Extract `EventCard`, `GroupCard` out of `index.tsx` into `src/components/`
- [ ] `WeekView` — 7-column grid, events plotted by earliest `DateOption`
- [ ] `AppShell` with `GroupSidebar` navigation
- [ ] Mobile responsive collapse (single-column below 768px)

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

---

## Completed

_Move items here with a date when a phase is done._
