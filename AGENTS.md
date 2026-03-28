# AGENTS.md

## Project Snapshot

- Repo: `mossy-meetups`
- Purpose: MVP scaffold for a private group planning + RSVP + calendar sharing tool for music-loving campers
- Status: early scaffold, not a feature-complete application

## Current Stack

- Framework: Next.js 13.4.4 using the `pages` router
- UI: React 18
- Language: TypeScript, but `tsconfig.json` is currently non-strict and `allowJs` is enabled
- Data layer: Prisma with PostgreSQL
- Styling: `tailwindcss` is installed, but there is no visible Tailwind config or stylesheet wiring in the current repo
- Runtime: Node 18 in Docker

## Repo Layout

- `src/pages/index.tsx`: only application page right now; renders a minimal scaffold message
- `prisma/schema.prisma`: initial Prisma schema for `User`, `Group`, `Event`, `DateOption`, and `RSVP`
- `Dockerfile`: container image for the app
- `docker-compose.yml`: local app + Postgres orchestration
- `Dokploy.yml`: basic deployment stub
- `.env.example`: example `DATABASE_URL`
- `README.md`: minimal project description only

## Development Commands

- Install deps: `npm ci`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`

## Environment

- Required env var: `DATABASE_URL`
- Local Compose database default:
  - user: `MossyMeetupsUser`
  - password: `changeme`
  - db: `mossymeetups`

## Database Notes

- Prisma schema exists, but there are no migrations checked in
- There is no visible Prisma client usage in `src/` yet
- The schema is very early and currently sparse:
  - `Event` stores `groupId` but does not define a Prisma relation to `Group`
  - `RSVP` stores `userId` and `eventId` without Prisma relations
- If you evolve the schema, prefer adding proper relations and generating migrations instead of editing models casually

## Working Agreements For Agents

- Treat this repo as a scaffold. Confirm whether a requested feature should stay lightweight or whether it should establish missing app foundations first
- Preserve the current `pages`-router approach unless the task explicitly calls for an App Router migration
- When touching data access:
  - update `prisma/schema.prisma`
  - create a migration if Prisma is being used for real persistence
  - keep `DATABASE_URL`-based setup working in Docker Compose
- When touching UI:
  - keep changes simple unless the repo gains a real design system
  - do not assume Tailwind is wired correctly without verifying config and global CSS
- When touching deployment:
  - verify whether the Docker image should run `npm run build` before `npm run start`
  - keep `Dokploy.yml` and `docker-compose.yml` aligned with actual runtime requirements

## Known Gaps

- No tests exist
- No ESLint config is present in the repository
- No Prisma migrations are present
- No API routes, auth flow, or database integration are implemented yet
- README does not document setup beyond a one-line description

## Safe First Checks Before Larger Changes

1. Read `package.json`, `prisma/schema.prisma`, and `src/pages/index.tsx`
2. Verify whether dependencies are installed with `npm ci`
3. Confirm app boot path with `npm run dev` or container workflow with `docker-compose up`
4. If working on production/runtime behavior, verify the Docker startup path rather than assuming the current `Dockerfile` is sufficient
