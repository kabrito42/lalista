# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LaLista** is a household grocery/shopping list web app — the successor to weeklyshop, rebuilt on a modern stack. Users manage shopping lists in a React frontend; a local Python agent automates grocery ordering via browser automation.

## Architecture

Three-tier: **Vercel** (React frontend) + **Supabase** (database, auth, edge functions) + **local Python agent** (browser automation).

```
lalista/
  app/          React 19 + TypeScript + Vite 6 SPA (deployed to Vercel)
  agent/        Python agent — Playwright browser automation (runs locally, never deployed)
  supabase/     Supabase CLI project — migrations, edge functions, seed data
  scripts/      Deploy scripts
```

### Session State Machine

The core workflow is a weekly session that progresses linearly through 6 states, enforced at the DB level via a PL/pgSQL trigger (`enforce_session_transition`):

```
draft → planning → picking → review → finalised → dispatched
```

Each state maps to a frontend page: Session → Meals → Picker → Review → Finalise. The `advance_session(session_id)` RPC function moves a session to the next valid status. Sessions store intermediate data as JSONB columns (meal_ingredients, confirmed_other_items, final_list).

### Auth & Household Provisioning

On signup, a DB trigger (`on_auth_user_created`) automatically creates a household and a profile for the new user. All subsequent data is scoped to that household — there is no user-level data isolation, only household-level.

### RLS Pattern

All RLS policies use `current_household_id()` (a `SECURITY DEFINER` function) to look up the current user's household. This avoids infinite recursion that would occur if RLS policies on `profiles` queried `profiles` directly.

### Data Fetching Pattern

Pages follow a consistent pattern: get `householdId` from the `useHousehold()` hook, then fetch with `useCallback` + `useEffect`, filtering all queries by `.eq('household_id', householdId)`. No data-fetching library — all direct Supabase client calls.

### Supabase Client

Singleton in `app/src/lib/supabase.ts`, configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.

## Development Commands

### Frontend (`app/`)

```bash
cd app
npm install
npm run dev          # Vite dev server on localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run format       # Prettier (100 char width, no semis, single quotes)
npm run gen:types    # Regenerate Supabase types (needs SUPABASE_PROJECT_REF env var)
```

### Supabase (`supabase/`)

```bash
cd supabase
supabase start       # Local Supabase (requires Docker)
supabase db reset    # Apply migrations + seed
supabase functions serve  # Local edge functions
```

Copy `.env.local.example` to `.env.local` and fill in Supabase URL/anon key from `supabase start` output.

### Agent (`agent/`)

```bash
cd agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && playwright install
python agent.py
```

The agent is **local-only** — it reads lists from Supabase and drives a browser to place grocery orders.

## Coding Conventions

### TypeScript (frontend)

- **TypeScript strict mode** enabled (`tsconfig.json`)
- React 19 with functional components
- **Tailwind CSS 4** with CSS-first `@theme` config in `src/index.css` (no `tailwind.config.ts`)
- Design tokens mapped from weeklyshop: DM Sans (body), DM Serif Display (headings), DM Mono (code)
- ESLint 9 flat config + Prettier (semi: false, singleQuote, trailingComma: all, printWidth: 100)
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities — match existing patterns
- Database types are auto-generated in `app/src/types/database.ts` — regenerate with `npm run gen:types`, do not edit manually

### Database

- **Row Level Security (RLS)** on all tables — use `current_household_id()` helper in policies
- **UUID primary keys** (`gen_random_uuid()`)
- **Household scoping** — all user-facing data scoped to a household, not individual users
- Migrations in `supabase/migrations/` — use `supabase migration new <name>`
- Seed data in `supabase/seed.sql`
- **pg_trgm** extension enabled — GIN indexes on searchable text fields for fuzzy matching

### Edge Functions

- Written in TypeScript (Deno runtime)
- Located in `supabase/functions/<function-name>/index.ts`
- Use `supabase functions new <name>` to scaffold

## Deployment

- **Frontend**: Vercel auto-deploys from `main` branch (`vercel.json` builds from `/app`)
- **Supabase**: migrations applied via `supabase db push` or Supabase dashboard
- **Agent**: runs locally on the user's machine (macOS)

### Commands

- "commit and publish" = commit + push + Vercel preview deploy
- "commit and deploy" = stage task-relevant files first (`git add <files>`), then run `bash scripts/deploy.sh "your commit message"`. The script requires staged changes and a commit message — it will not run `git add` for you.

## Git Workflow

- Branch from `main`
- Stage only task-relevant files (no `git add -A`)
- Conventional commit messages

## Key Design Decisions

- **Household-scoped data**: all shopping lists, items, and order history belong to a household — multiple users can share a household
- **Local agent architecture**: browser automation runs on the user's machine for security (grocery store credentials never leave the local machine)
- **Weeklyshop design language**: reuses the DM Sans/Serif/Mono font stack and green-accent colour palette from weeklyshop

## Testing

```bash
cd app
npm run lint         # ESLint (0 errors expected)
npm run build        # TypeScript + Vite production build
```

No test framework configured yet. Add `vitest` when unit tests are needed.

## ClickUp

- Workspace: `90161526129`
- Space: `90166604892` (LaLista)
- Backlog list: `901614384227`
- Status flow: `Ready for Build` -> `In Progress` -> `Review`
