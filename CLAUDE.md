# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LaLista** is a household grocery/shopping list web app — the successor to weeklyshop, rebuilt on a modern stack. Users manage shopping lists in a React frontend; a local Python agent automates grocery ordering via browser automation.

## Architecture

Three-tier: **Vercel** (React frontend) + **Supabase** (database, auth, edge functions) + **local Python agent** (browser automation).

```
lalista/
  app/          React 19 + TypeScript + Vite 6 frontend (deployed to Vercel)
  agent/        Python agent — Playwright browser automation (runs locally, never deployed)
  supabase/     Supabase CLI project — migrations, edge functions, seed data
  docs/         Product spec, technical summary, architecture docs
```

## Development Setup

### Frontend (`app/`)

```bash
cd app
npm install
npm run dev          # Vite dev server on localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run format       # Prettier
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
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install
python agent.py
```

The agent is **local-only** — it reads lists from Supabase and drives a browser to place grocery orders.

## Coding Conventions

### TypeScript (frontend)

- **TypeScript strict mode** enabled (`tsconfig.json`)
- React 19 with functional components
- **Tailwind CSS 4** with CSS-first `@theme` config in `src/index.css` (no `tailwind.config.ts`)
- Design tokens mapped from weeklyshop: DM Sans (body), DM Serif Display (headings), DM Mono (code)
- ESLint 9 flat config + Prettier (semi: false, singleQuote, trailingComma: all)
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities — match existing patterns

### Database

- **Row Level Security (RLS)** on all tables
- **UUID primary keys** (`gen_random_uuid()`)
- **Household scoping** — all user-facing data scoped to a household, not individual users
- Migrations in `supabase/migrations/` — use `supabase migration new <name>`
- Seed data in `supabase/seed.sql`

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
- "commit and deploy" = commit + push + Vercel production deploy

## Git Workflow

- Branch from `main`
- Stage only task-relevant files (no `git add -A`)
- Conventional commit messages

## Key Design Decisions

- **Household-scoped data**: all shopping lists, items, and order history belong to a household — multiple users can share a household
- **Local agent architecture**: browser automation runs on the user's machine for security (grocery store credentials never leave the local machine)
- **Weeklyshop design language**: reuses the DM Sans/Serif/Mono font stack and green-accent colour palette from weeklyshop

## ClickUp

- Workspace: `90161526129`
- Space: `90166604892` (LaLista)
- Status flow: `Ready for Build` -> `In Progress` -> `Review`

## Documentation

- Product specification: `docs/product-specification.md` (to be created)
- Technical summary: `docs/technical-summary.md` (to be created)
