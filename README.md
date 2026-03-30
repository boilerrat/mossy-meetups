# Mossy Meetups

> **Private group planning for music-loving campers.**
> Coordinate dates, collect RSVPs, and share calendars — no spreadsheets, no group texts.

Mossy Meetups is a private planning app for friend groups and families who camp together and need a shared place to:

- create host groups
- invite people by email
- schedule events or leave them TBD
- vote on dates and locations
- RSVP and track attendance
- keep an event-specific planning thread
- view events in list, rolling week, or month layouts
- export individual events or the full schedule to calendar
- check trip weather at a glance

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 13 (pages router) + React 18 |
| Styling | Tailwind CSS 3 + styled-jsx |
| Auth | NextAuth.js — magic-link email |
| ORM | Prisma 4 |
| Database | PostgreSQL |
| Deployment | Dokploy + Docker on `moss.boilerhaus.org` |
| Runtime | Custom Node server (`server.js`) serving the built Next app |
| Testing | Vitest + React Testing Library + Playwright |

---

## Current features

### Planning

- Create and manage private groups
- Invite members by email with magic-link sign-in
- Create events with:
  - confirmed date and location
  - confirmed date but location vote options
  - TBD date with date voting
- Set potluck flag and trip length in nights

### Voting

- **Date voting**
  - Members can propose candidate dates
  - Members vote availability in a grid
  - Group admin confirms the winning date
- **Location voting**
  - Admin can seed location options during event creation/editing with comma-separated names
  - Admin can also add location options on the event detail page
  - Members cast one vote per event
  - Admin confirms the winning location

### Attendance and event detail

- RSVP buttons on event cards and event pages
- Attendee breakdown on each event page
- Event detail pages with:
  - RSVP
  - date voting
  - location voting
  - discussion thread
  - map link/embed
  - `.ics` download for that event

### Calendar and forecast

- Homepage views:
  - `List` view by default
  - rolling `Week` view starting from today
  - `Month` view
- `Export all events` calendar download from the homepage
- Multi-day weather forecast on event cards in Celsius-first display

---

## Getting started

### Prerequisites

- Node 18 LTS
- Docker + Docker Compose (for local DB)
- A working SMTP server for magic-link email

### Local setup

```bash
# 1. Clone and install
git clone <repo-url>
cd mossy-meetups
npm ci

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, EMAIL_SERVER, EMAIL_FROM

# 3. Start the database
docker-compose up -d db

# 4. Run Prisma migrations
npx prisma migrate dev

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

### Production-style local run

```bash
npm run build
node server.js
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma connection string |
| `NEXTAUTH_URL` | Yes | Full public URL (e.g. `https://moss.boilerhaus.org`) |
| `NEXTAUTH_SECRET` | Yes | Random 32-byte secret — `openssl rand -base64 32` |
| `EMAIL_SERVER` | Yes | SMTP URL — `smtp://user:pass@host:587` |
| `EMAIL_FROM` | Yes | Sender address — `noreply@boilerhaus.org` |

Never commit real values. Use a secrets manager or Dokploy environment variable injection.

Note: if your SMTP password contains spaces or special characters, URL-encode it in `EMAIL_SERVER`.

---

## Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build
npm run start        # Start Next's default production server
node server.js       # Start the repo's production custom server
npm run lint         # ESLint
npm test             # Vitest unit + integration tests
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E tests with isolated Postgres + MailHog
npm run prisma:generate   # Regenerate Prisma client
```

`npm run test:e2e` does not depend on your checked-in `.env` database host. It boots an isolated Postgres test database on `127.0.0.1:54329`, a MailHog SMTP sink on `127.0.0.1:3025`, resets the schema, and then runs Playwright against a local dev server with those env vars injected.

---

## Project structure

```
src/
  components/       UI components (AppShell, EventCard, WeekView, Logo, ...)
  lib/              Server utilities (auth, prisma, home-data, rate-limit, ...)
  pages/            Next.js pages + API routes
    api/            REST handlers (groups, events, rsvps, invites, ...)
  styles/           globals.css — CSS custom properties + Tailwind base
  __tests__/        Vitest unit + integration tests
server.js           Custom production server used by Docker/Dokploy

e2e/                Playwright E2E tests
prisma/             Schema + migrations
branding/           Brand guidelines
docs/               Roadmap + architecture notes
```

---

## Design system

The project uses CSS custom properties for all brand tokens defined in [src/styles/globals.css](src/styles/globals.css). A `[data-theme="light"]` override enables the light mode variant. Toggle with the sun/moon button in the nav bar.

**Core palette:**

| Token | Dark | Light | Use |
|---|---|---|---|
| `--accent` | `#d7b97f` | `#D97706` | Links, CTAs, highlights |
| `--text` | `#f3ebdc` | `#1A1A18` | Body text |
| `--text-muted` | `#c9c2b3` | `#5B5B58` | Secondary text |
| `--bg-card` | `rgba(13,28,23,.74)` | `rgba(255,255,255,.9)` | Cards + panels |
| `--border` | `rgba(243,235,220,.12)` | `rgba(26,26,24,.12)` | Borders |

The app uses CSS custom properties for color, spacing, and radii, with dark mode as the default visual system and a light-theme override via `[data-theme="light"]`.

---

## Notes

- `npm run start` still works, but Docker and Dokploy use `node server.js`
- Location voting works best when you leave the confirmed `Location` blank and enter comma-separated options instead
- Events with confirmed dates but unconfirmed locations surface in a dedicated `Needs a location` section on the homepage

---

*Plan together. Camp together. Mossy vibes.*
