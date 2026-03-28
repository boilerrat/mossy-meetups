# Mossy Meetups — Architecture & Design Brief (Concept C)

> Living design document. Update this file when decisions change, not after the fact.

---

## 1. Executive Summary

- **What it is:** Private group planning tool for music-loving campers — coordinate dates, collect RSVPs, share calendars. No spreadsheets, no group texts.
- **Audience:** Music-loving families and friend groups (teens included); Dead-head / festival culture aesthetic.
- **Current state:** First product slice is live. Groups and Events are backed by Prisma + PostgreSQL. API routes exist for creating groups and events. Auth and RSVP submission are next.
- **Deployment target:** `moss.boilerhaus.org` via Dokploy on a self-hosted VPS.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Any member can create a group and invite others | Group creation → invite email delivered < 30 s |
| Members can propose and vote on dates | DateOption poll resolves to a confirmed date |
| RSVP count visible to all group members | RSVP count shown on EventCard in real time |
| Calendar export works | `.ics` download available on every confirmed event |
| No anonymous access | Magic-link auth required before any data is visible |

---

## 3. System Architecture

```mermaid
graph TD
    Browser["Browser (Next.js SSR + CSR)"]
    NextAPI["Next.js API Routes\n/api/groups\n/api/events\n/api/rsvps\n/api/invites\n/api/auth (NextAuth)"]
    Prisma["Prisma ORM"]
    Postgres["PostgreSQL 16"]
    Email["Email Provider\n(SMTP / Resend)"]
    Dokploy["Dokploy VPS\nmoss.boilerhaus.org"]

    Browser -->|HTTPS| NextAPI
    NextAPI --> Prisma
    Prisma --> Postgres
    NextAPI -->|Magic link| Email
    Dokploy -->|runs| Browser
    Dokploy -->|runs| Postgres
```

**Layers:**

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 13 (pages router), React 18 | SSR via `getServerSideProps`; CSR for form state |
| Styling | Tailwind CSS 3 + inline `<style jsx>` | Tailwind config not yet wired; inline styles on index page |
| API | Next.js API routes | REST-style; JSON request/response |
| Auth | NextAuth.js (planned) | Magic-link only; no password, no anonymous |
| ORM | Prisma 4 | Singleton client in `src/lib/prisma.ts` |
| Database | PostgreSQL 16 | Docker volume `db_data` for local dev |
| Deployment | Dokploy + Docker | Single container; DB separate |
| CI | GitHub Actions | lint + test on push to `main` |

---

## 4. Data Model

### 4a. Prisma Schema (current — `prisma/schema.prisma`)

```prisma
enum RSVPStatus {
  ATTENDING
  MAYBE
  NOT_ATTENDING
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  groups    Group[]
  rsvps     RSVP[]
  createdAt DateTime @default(now())
}

model Group {
  id        String   @id @default(uuid())
  name      String
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id], onDelete: Cascade)
  events    Event[]
  createdAt DateTime @default(now())
}

model Event {
  id          String       @id @default(uuid())
  groupId     String
  group       Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  title       String
  description String?
  location    String?
  mapLink     String?
  dateOptions DateOption[]
  rsvps       RSVP[]
  createdAt   DateTime     @default(now())
}

model DateOption {
  id        String   @id @default(uuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  date      DateTime
  createdAt DateTime @default(now())
}

model RSVP {
  id        String     @id @default(uuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventId   String
  event     Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  status    RSVPStatus @default(ATTENDING)
  createdAt DateTime   @default(now())

  @@unique([userId, eventId])
}
```

### 4b. Planned additions (not yet in schema)

```prisma
// Invite — track pending magic-link invitations
model Invite {
  id        String   @id @default(uuid())
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  email     String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

### 4c. Conceptual entity map

```
User ──< RSVP >── Event ──< DateOption
 │                  │
 └── admin ──── Group ──< Event
                  │
                  └──< Invite
```

All cascading deletes flow downward: deleting a User removes their Groups → Events → DateOptions → RSVPs.

---

## 5. API Surface

All routes live under `src/pages/api/`. Auth will gate every route once NextAuth is wired (session required; 401 otherwise).

### 5a. Existing routes

#### `POST /api/groups`

Create a group and upsert the admin user.

```json
// Request
{
  "name": "Boilerhaus Camp Crew",
  "adminEmail": "alex@example.com",
  "adminName": "Alex"
}

// 201 Response
{
  "group": {
    "id": "uuid",
    "name": "Boilerhaus Camp Crew",
    "adminId": "uuid",
    "createdAt": "2026-03-27T00:00:00.000Z"
  }
}

// 400 — missing name or email
{ "error": "Group name is required" }
```

#### `POST /api/events`

Create an event with up to three date options.

```json
// Request
{
  "groupId": "uuid",
  "title": "Friday campfire set",
  "description": "Casual acoustic set and shared snacks.",
  "location": "North Grove",
  "mapLink": "https://maps.google.com/...",
  "dateOption1": "2026-08-01T19:00",
  "dateOption2": "2026-08-08T19:00",
  "dateOption3": ""
}

// 201 Response
{
  "event": {
    "id": "uuid",
    "title": "Friday campfire set",
    "dateOptions": [
      { "id": "uuid", "date": "2026-08-01T19:00:00.000Z" },
      { "id": "uuid", "date": "2026-08-08T19:00:00.000Z" }
    ]
  }
}
```

### 5b. Planned routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/groups` | List groups the authenticated user belongs to |
| `GET` | `/api/groups/[id]` | Single group with events |
| `POST` | `/api/rsvps` | Submit or update RSVP for an event |
| `POST` | `/api/invites` | Send invite email to a new member |
| `GET` | `/api/invites/[token]` | Validate invite token (used by NextAuth callback) |
| `GET` | `/api/events/[id]/ics` | Download `.ics` calendar file |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth magic-link handler |

### 5c. Response envelope (adopt when adding new routes)

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}
```

---

## 6. UI & Component Map

### 6a. Current page tree

```
src/pages/
  index.tsx           ← Dashboard: stats + create group/event forms + event/group lists
  api/
    groups/index.ts
    events/index.ts
src/lib/
  prisma.ts           ← PrismaClient singleton (global dev guard)
  home-data.ts        ← getHomePageData() — SSR data for index
```

### 6b. Target component tree (MVP)

```
pages/
  index.tsx           ← Public landing / redirect to /dashboard
  dashboard.tsx       ← Authenticated shell
  groups/
    [id].tsx          ← Group detail + event list
  events/
    [id].tsx          ← Event detail + RSVP panel + date vote

components/
  layout/
    AppShell.tsx      ← Nav + sidebar wrapper
    PageHeader.tsx
  groups/
    GroupCard.tsx     ← Name, admin, event count, link
    GroupSidebar.tsx  ← List of user's groups for nav
    CreateGroupModal.tsx
  events/
    EventCard.tsx     ← Title, date, location, RSVP pill
    WeekView.tsx      ← 7-column calendar grid (MVP primary view)
    DatePoll.tsx      ← Vote on date options
    RSVPButton.tsx    ← ATTENDING / MAYBE / NOT_ATTENDING toggle
    EventForm.tsx     ← Create/edit event
  invite/
    InviteForm.tsx    ← Email input → POST /api/invites
  shared/
    Pill.tsx
    EmptyState.tsx
    LoadingSpinner.tsx
```

### 6c. WeekView MVP spec

- 7 columns (Mon–Sun), responsive collapse to single-day scroll on mobile.
- Each cell shows `EventCard` stubs for events whose earliest `DateOption` falls in that week.
- Clicking an `EventCard` navigates to `/events/[id]`.
- No drag-and-drop in MVP.

---

## 7. Design System

### 7a. Color tokens (from `branding/MossyMeetups_branding.md`)

| Token | Hex | Use |
|---|---|---|
| `--color-base` | `#F3F6F1` | Page background (light mode) |
| `--color-surface` | `#FFFFFF` | Cards, modals |
| `--color-text` | `#1A1A18` | Body text |
| `--color-pinecone` | `#5B3A2E` | Headings, emphasis |
| `--color-forest` | `#2E7D32` | Links, active states |
| `--color-moss` | `#6A9A4F` | Borders, secondary actions |
| `--color-cta` | `#D97706` | Primary buttons |
| `--color-cta-hover` | `#E4A11B` | Button hover |

The current `index.tsx` uses an inverse dark-mode palette (`#10231d` background, `#f3ebdc` text). These dark-mode values should become a `[data-theme="dark"]` variant once CSS variables are wired.

### 7b. Typography

| Role | Font | Fallback |
|---|---|---|
| Display / headings | Fraunces or Playfair Display | Georgia, serif |
| Body | Inter or Source Sans Pro | system-ui, sans-serif |

Scale: base `1rem`; headings step up by `1.25–1.5×` (CSS `clamp()` for fluid sizes).

### 7c. Spacing & shape

- Border-radius: cards `20–28px`; pills `999px`; inputs `16px`.
- Grid gap: `16px` base unit, `24px` between sections.
- Backdrop blur + semi-transparent surfaces for the dark mode aesthetic.

### 7d. Tailwind setup gap

`tailwindcss` is installed but there is no `tailwind.config.js` and no `globals.css` with `@tailwind` directives. Before using Tailwind utility classes in new components:

1. Add `tailwind.config.js` with `content: ['./src/**/*.{ts,tsx}']`.
2. Add `src/styles/globals.css` with the three Tailwind base directives.
3. Import `globals.css` in `src/pages/_app.tsx`.

### 7e. Accessibility baseline

- All interactive elements must have focus-visible outlines.
- Color contrast: WCAG AA minimum (4.5:1 for body, 3:1 for large text).
- `<button>` elements must have visible labels (no icon-only buttons without `aria-label`).
- Form inputs must use `<label>` with explicit `htmlFor` associations.

---

## 8. Deployment & Ops

### 8a. Local development

```bash
cp .env.example .env          # set DATABASE_URL
npm ci
npx prisma migrate dev        # run migrations
npm run dev                   # http://localhost:3000
```

Or with Docker Compose (app + Postgres):

```bash
docker compose up --build
```

The Compose stack wires `DATABASE_URL` automatically. The app container runs `npm run build` then `npm run start` (production mode).

### 8b. Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db` | Prisma connection string |
| `NEXTAUTH_URL` | Yes (auth) | `https://moss.boilerhaus.org` | Full public URL |
| `NEXTAUTH_SECRET` | Yes (auth) | `openssl rand -base64 32` | Random 32-byte secret |
| `EMAIL_SERVER` | Yes (auth) | `smtp://user:pass@host:587` | SMTP for magic links |
| `EMAIL_FROM` | Yes (auth) | `noreply@boilerhaus.org` | Sender address |

Never commit real values. Use a secrets manager or Dokploy environment variable injection.

### 8c. Dokploy

`Dokploy.yml` points to `moss.boilerhaus.org`. Dokploy builds the Docker image from `Dockerfile` and exposes port `3000`. The Postgres container is managed separately (not in `Dokploy.yml` today — wire it or use an external managed DB).

### 8d. Dockerfile

```dockerfile
FROM node:18-bullseye-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run prisma:generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Migration note: the Dockerfile does **not** run `prisma migrate deploy`. Run migrations as a pre-deploy step or a Compose `command` override before the app starts.

### 8e. Health check

Add to `Dockerfile` once the app has a `/api/health` route:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### 8f. CI (`.github/workflows/ci.yml`)

Runs on push to `main`: `npm ci` → `npm run lint` → `npm test`. Tests currently echo a placeholder. Replace with real test runner once tests exist.

---

## 9. Testing Plan

### 9a. Current state

- `npm test` is a placeholder (`echo No tests yet`).
- No test framework is installed.

### 9b. Target setup

Install Vitest (or Jest) + React Testing Library + `@testing-library/user-event`:

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

### 9c. Coverage targets (80% minimum per project rules)

| Layer | Test type | Tool | Key scenarios |
|---|---|---|---|
| API route handlers | Unit | Vitest + mocked Prisma | 400/405/500 paths; happy path |
| `getHomePageData` | Unit | Vitest + mocked Prisma | DB error → `databaseReady: false` |
| `parseDateOptions` | Unit | Vitest | empty string filtering; invalid dates |
| `GroupCard`, `EventCard` | Component | React Testing Library | renders name; RSVP count pill |
| Create group flow | Integration | Vitest + real DB (test schema) | upsert admin, create group |
| Auth + RSVP flow | E2E | Playwright | magic link → RSVP → count updates |

### 9d. TDD mandate

Write the test first (RED) before any new feature code. See global `testing.md` rule.

---

## 10. Milestones & Roadmap

> **Source of truth for development sequencing and task status: [docs/roadmap.md](docs/roadmap.md)**
>
> This section is a summary only. Track progress, mark items complete, and update priorities in the roadmap file — not here.

| Phase | Goal | Blocker |
|---|---|---|
| 0 | Deployment stable at `moss.boilerhaus.org` | — |
| 1 | Magic-link auth; all routes gated | Phase 0 |
| 2 | Group membership + invites | Phase 1 |
| 3 | RSVP flow | Phase 1 |
| 4 | WeekView + component extraction | Phase 3 |
| 5 | Date polling + `.ics` export | Phase 4 |
| 6 | Test suite (80% coverage) + hardening | Phase 5 |
| 7 | Design polish + accessibility | Phase 6 |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Magic-link email goes to spam | Medium | High | SPF/DKIM on sender domain; test with real email addresses early |
| Prisma migration drift between local and prod | Medium | High | Always run `prisma migrate deploy` as a pre-deploy step; never edit the DB directly |
| No auth → public data leak | High (currently) | High | Block all API routes behind `getServerSession` before merging auth branch |
| Tailwind not wired → styles lost on Vercel/Docker | Low | Medium | Add `tailwind.config.js` before first component uses utilities |
| Single-admin Group model limits collab | Medium | Medium | Add `UserGroup` pivot (Phase 2) to allow multiple admins |
| Node 18 EOL (April 2025) | High | Low | Upgrade Dockerfile to Node 20 LTS |

---

## 12. Open Questions

1. **Date poll vs. confirmed date** — Should `Event` have a `confirmedDateOptionId` FK, or is the earliest `DateOption` always canonical? Current code uses earliest date as "next option."
2. **Group membership model** — Admin-only or any member can invite? The `Invite` model assumes admin sends invites; open if members can share a join link.
3. **Notification strategy** — In-app notifications vs. email only vs. both? Branding doc mentions "email + in-app notif" but in-app requires a notification table.
4. **Multi-admin groups** — Single `adminId` on `Group` is simpler but limits handoff. Track as tech debt.
5. **`next/font` vs. Google Fonts CDN** — Fraunces and Inter are available via `next/font/google`; prefer this to avoid external CDN dependency.
6. **Node version** — Should move from Node 18 to Node 20 LTS. Update Dockerfile + CI matrix.
7. **Tailwind vs. CSS-in-JS** — Current `index.tsx` uses `<style jsx>`. Decision needed: commit to Tailwind utilities or keep styled-jsx across new components.

---

## Appendix A — Full Prisma Schema (target MVP)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum RSVPStatus {
  ATTENDING
  MAYBE
  NOT_ATTENDING
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  groups    Group[]
  rsvps     RSVP[]
  invites   Invite[]
  createdAt DateTime @default(now())
}

model Group {
  id        String   @id @default(uuid())
  name      String
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id], onDelete: Cascade)
  events    Event[]
  invites   Invite[]
  createdAt DateTime @default(now())
}

model Event {
  id                    String      @id @default(uuid())
  groupId               String
  group                 Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  title                 String
  description           String?
  location              String?
  mapLink               String?
  confirmedDateOptionId String?
  dateOptions           DateOption[]
  rsvps                 RSVP[]
  createdAt             DateTime    @default(now())
}

model DateOption {
  id        String   @id @default(uuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  date      DateTime
  createdAt DateTime @default(now())
}

model RSVP {
  id        String     @id @default(uuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventId   String
  event     Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  status    RSVPStatus @default(ATTENDING)
  createdAt DateTime   @default(now())

  @@unique([userId, eventId])
}

model Invite {
  id        String    @id @default(uuid())
  groupId   String
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  email     String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

---

## Appendix B — API Contract Snippets

### POST /api/rsvps

```
POST /api/rsvps
Authorization: session cookie (NextAuth)
Content-Type: application/json

{
  "eventId": "uuid",
  "status": "ATTENDING" | "MAYBE" | "NOT_ATTENDING"
}

201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "eventId": "uuid",
    "status": "ATTENDING",
    "createdAt": "2026-08-01T00:00:00.000Z"
  }
}

401 Unauthorized  — not logged in
409 Conflict      — upsert silently merges; not returned
```

### POST /api/invites

```
POST /api/invites
Authorization: session cookie (group admin only)
Content-Type: application/json

{
  "groupId": "uuid",
  "email": "friend@example.com"
}

201 Created
{
  "success": true,
  "data": { "inviteId": "uuid" }
}

403 Forbidden  — caller is not group admin
400 Bad Request — invalid email
```

### GET /api/events/:id/ics

```
GET /api/events/uuid/ics
Authorization: session cookie

200 OK
Content-Type: text/calendar
Content-Disposition: attachment; filename="event.ics"

BEGIN:VCALENDAR
...
END:VCALENDAR
```

---

## Appendix C — Patch Notes (feature/init-scaffold → main)

### Changes since `main`

| File | Change | Why |
|---|---|---|
| `Dockerfile` | Added `npm run prisma:generate` + `npm run build` before `CMD` | Production container was starting without a built app |
| `package.json` | Added `eslint`, `eslint-config-next`, `@types/node`, `typescript` to devDeps | Enable TS compilation + lint in CI |
| `.eslintrc.json` | Added `next/core-web-vitals` config | Consistent lint rules across the project |
| `src/pages/index.tsx` | Full dashboard UI with group/event forms and live data | First functional product slice |
| `src/pages/api/groups/index.ts` | `POST /api/groups` | Create groups with admin upsert |
| `src/pages/api/events/index.ts` | `POST /api/events` | Create events with date options |
| `src/lib/prisma.ts` | PrismaClient singleton with dev global guard | Prevent connection pool exhaustion in dev hot reload |
| `src/lib/home-data.ts` | `getHomePageData()` SSR query | Centralized server-side data fetching |
| `prisma/schema.prisma` | Full relations wired (Group→User, Event→Group, etc.) | Fix dangling FKs from initial schema |
| `prisma/migrations/` | `20260328003500_init_mvp` migration added | Initial DB schema is now migration-tracked |

### How to merge into `main`

```bash
git checkout main
git merge --no-ff feature/init-scaffold
# review diff, then:
npx prisma migrate deploy   # run against prod DB
git push origin main
```

### Verification steps after merge

1. `npm ci && npm run lint` — should pass with zero errors.
2. `docker compose up --build` — app + Postgres start cleanly.
3. Open `http://localhost:3000` — dashboard loads with "Database not ready" banner if DB hasn't been migrated.
4. Run `npx prisma migrate dev` (local) or `npx prisma migrate deploy` (prod).
5. Reload — banner disappears; create a group, then an event; verify both appear in the UI.

---

## Next Steps

See [docs/roadmap.md](docs/roadmap.md) for the full prioritized task list.

Immediate actions:
1. **Merge `feature/init-scaffold` → `main`** and verify with the steps in Appendix C.
2. **Start Phase 1 (auth)** — install NextAuth, gate all routes behind `getServerSession`.
3. **Add `tailwind.config.js`** before any new component uses Tailwind utilities.
4. **Bootstrap the test suite** (Phase 6) — install Vitest, first test for `parseDateOptions`.
5. **Upgrade Node 18 → 20** in `Dockerfile` and CI workflow.
