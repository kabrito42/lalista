# LaLista — Solution Overview

> Summary of the solution as designed and delivered. This is a living document — update it as the product evolves.

---

## What is LaLista?

LaLista is a household grocery shopping app that streamlines the weekly Coles shop. Users plan meals from a personal cookbook, build a consolidated shopping list, and dispatch it to the Coles website via browser automation. It replaces the earlier weeklyshop prototype with a modern, multi-user stack.

---

## Architecture

Three-tier: **Vercel** (React SPA) + **Supabase** (database, auth, storage) + **local Python agent** (browser automation).

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Production)                                        │
│  React 19 + Vite 6 SPA                                     │
│  ─────────────────────                                      │
│  Auth (email/password, Google OAuth)                        │
│  Meal planning workflow (6 pages)                           │
│  Reference data management (4 pages)                        │
│  Dashboard analytics                                        │
└────────────────────┬────────────────────────────────────────┘
                     │ Supabase JS client
┌────────────────────▼────────────────────────────────────────┐
│  Supabase (Hosted)                                          │
│  PostgreSQL 17 + Auth + Realtime + Storage                  │
│  ──────────────────────────────────────                     │
│  12 tables, all household-scoped with RLS                   │
│  Session state machine (DB trigger-enforced)                │
│  recipe-images storage bucket                               │
│  Realtime subscriptions (automation logs)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ Supabase Python client
┌────────────────────▼────────────────────────────────────────┐
│  Local Agent (macOS only)                                   │
│  Python + Playwright (real Chrome)                          │
│  ──────────────────────────────                             │
│  Polls for finalised sessions                               │
│  Automates Coles cart via browser                           │
│  Streams logs to Supabase Realtime                          │
│  Credentials never leave the local machine                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Entity Relationship

```
households
  ├── profiles (1:many — users in the household)
  ├── categories (shopping aisle categories)
  ├── recipes
  │     └── recipe_ingredients (per-recipe, ordered)
  ├── pantry_items (always in stock — excluded from lists)
  ├── longlist_items (standing shopping items, categorised)
  ├── coles_preferences (preferred brand/pack per product)
  └── weekly_sessions (the core workflow object)
        ├── weekly_meals (recipes selected for this session)
        └── automation_logs (real-time dispatch logs)
```

### Key Tables

| Table | Purpose |
|-------|---------|
| **households** | Multi-tenant container — all data scoped here |
| **profiles** | 1:1 with auth.users, links user to household |
| **categories** | Shopping aisle groupings (16 defaults seeded) |
| **recipes** | Personal cookbook with servings, times, directions, image |
| **recipe_ingredients** | Ingredients per recipe with optional Coles product mapping |
| **pantry_items** | Items always in stock — auto-excluded during review |
| **longlist_items** | Standing shopping items with default qty, unit, staple flag |
| **coles_preferences** | Preferred brand/pack size per product name |
| **weekly_sessions** | Weekly shopping session — state machine with JSONB payloads |
| **weekly_meals** | Join table: session to recipes |
| **automation_logs** | Real-time logs from the Coles dispatch agent |

### Household Isolation

All user-facing tables enforce Row Level Security via `current_household_id()`, a `SECURITY DEFINER` function that resolves the current user's household from `profiles`. Child tables (recipe_ingredients, weekly_meals, automation_logs) scope via subqueries to their parent's household.

---

## Session State Machine

The core workflow is a weekly session that progresses linearly through six states, enforced at the DB level by a `BEFORE UPDATE` trigger (`validate_session_transition`):

```
draft → planning → picking → review → finalised → dispatched
```

| State | What happens | JSONB populated |
|-------|-------------|-----------------|
| **draft** | Session created, freeform items entered | — |
| **planning** | Recipes selected for the week | — |
| **picking** | Longlist items chosen (staples pre-selected) | `meal_ingredients` |
| **review** | Merge, deduplicate, exclude pantry items | `confirmed_other_items`, `dropped_duplicates`, `pantry_exclusions` |
| **finalised** | Final list locked, ready for dispatch | `final_list` |
| **dispatched** | Agent has populated the Coles cart | `coles_dispatched = true` |

The `advance_session(session_id)` RPC function moves a session to its next valid state. Invalid transitions raise a PostgreSQL exception.

---

## Frontend

### Technology

- **React 19** with functional components and hooks
- **TypeScript** in strict mode
- **Vite 6** for build and dev server
- **Tailwind CSS 4** with CSS-first `@theme` tokens
- **React Router DOM 7** for client-side routing
- **Recharts** for dashboard visualisations
- **Supabase JS client** (singleton) for all data access

### Design System

Inherited from weeklyshop:

| Token | Value |
|-------|-------|
| Body font | DM Sans |
| Heading font | DM Serif Display |
| Mono font | DM Mono |
| Primary accent | `#2b5e3f` (green) |
| Background | `#f7f6f2` (warm neutral) |
| Surface | `#ffffff` |

### Pages

**Authentication**
| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | Email/password + Google OAuth |
| Signup | `/signup` | Registration with confirmation |

**Weekly Workflow** (maps 1:1 to session states)
| Page | Route | Purpose |
|------|-------|---------|
| Session | `/session` | Create/view session, add freeform items, advance state |
| Meals | `/meals` | Select recipes, import ingredients into session |
| Picker | `/picker` | Choose longlist items (staples pre-ticked), set quantities |
| Review | `/review` | Merge + deduplicate ingredients, exclude pantry items |
| Finalise | `/finalise` | View final list by category, copy to clipboard, dispatch to Coles |

**Reference Data**
| Page | Route | Purpose |
|------|-------|---------|
| Recipes | `/recipes` | Full CRUD — title, servings, times, directions, image, ingredients |
| Longlist | `/longlist` | Master shopping items by category, staple toggle |
| Pantry | `/pantry` | Items always in stock (bulk import supported) |
| Categories | `/categories` | Shopping aisle categories with sort order |
| Coles Preferences | `/coles-preferences` | Preferred brand/pack per product |

**Analytics**
| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Session history, category pie chart, most common items |

### Components

| Component | Purpose |
|-----------|---------|
| `AppShell` | Layout wrapper — sidebar + topbar + content outlet |
| `Sidebar` | Responsive navigation grouped by workflow phase |
| `Topbar` | Header with user email and sign-out |
| `ProtectedRoute` | Auth guard — redirects to `/login` if unauthenticated |
| `RecipeIngredients` | Ingredient management with Coles product autocomplete |
| `AutomationLogViewer` | Real-time log stream via Supabase Realtime |

### Data Fetching Pattern

All pages follow the same pattern: `useHousehold()` resolves `householdId`, then `useCallback` + `useEffect` fetch data filtered by `.eq('household_id', householdId)`. No data-fetching library — direct Supabase client calls throughout.

---

## Local Agent

### Purpose

Automates the Coles grocery cart by driving a real Chrome browser via Playwright. Runs on the user's macOS machine — grocery credentials never leave the local environment.

### Workflow

1. **Poll** — checks Supabase every 10 seconds for sessions with `status = finalised` and `coles_dispatched = false`
2. **Launch Chrome** — headless=false, with playwright-stealth for bot detection evasion
3. **Authenticate** — loads saved cookies from `coles_session.json`; falls back to manual login with a 5-minute timeout
4. **Add items** — iterates `final_list`, searches Coles for each item (prefers `coles_product` mapping), clicks "add to cart", adjusts quantity
5. **Log** — writes progress to `automation_logs` (streamed to frontend in real time)
6. **Complete** — marks `coles_dispatched = true`, keeps browser open 10 minutes for user review

### Files

| File | Purpose |
|------|---------|
| `agent.py` | Main agent — polling, dispatch, cart automation |
| `migrate_from_weeklyshop.py` | One-time SQLite → Supabase data migration |
| `requirements.txt` | Python dependencies (playwright, supabase, playwright-stealth) |

---

## Database

### Migrations (5 applied)

| # | Migration | What it does |
|---|-----------|-------------|
| 1 | `auth_and_profiles` | households, profiles, `handle_new_user` trigger, `current_household_id()` |
| 2 | `core_schema` | recipes, ingredients, categories, pantry, longlist, coles_preferences, pg_trgm indexes |
| 3 | `sessions` | weekly_sessions (state machine + trigger), weekly_meals, automation_logs, `advance_session()` RPC |
| 4 | `fix_profiles_rls` | Adds `auth_household_id()` to fix infinite recursion in profiles RLS |
| 5 | `recipe_images_bucket` | Creates `recipe-images` public storage bucket + policies |

### Auth Flow

On signup, a DB trigger (`on_auth_user_created → handle_new_user`) automatically creates a household and a profile for the new user. Google OAuth is also configured.

### Fuzzy Search

`pg_trgm` extension with GIN indexes on `pantry_items.name`, `longlist_items.name`, `coles_preferences.product_name`, and `recipe_ingredients.text` — enables `ILIKE` autocomplete in the frontend.

### Edge Functions

Infrastructure is configured (Deno 2 runtime) but no edge functions have been deployed yet.

---

## Deployment

| Tier | Platform | Method |
|------|----------|--------|
| Frontend | Vercel | Auto-deploy from `main`; SPA rewrite rule in `vercel.json` |
| Database | Supabase (hosted) | Migrations via `supabase db push` |
| Agent | Local macOS | Manual `python agent.py` |

**One-command deploy**: `bash scripts/deploy.sh "commit message"` — stages, commits, pushes, and runs `vercel --prod`.

---

## Seed Data

Local development seeds include:

- 16 shopping categories (Produce, Dairy & Eggs, Bakery, Beverages, etc.)
- 20 pantry staples (salt, pepper, flour, oil, eggs, milk, etc.)
- 54 longlist items across all categories
- 1 placeholder household

Production data was migrated from weeklyshop v1 (SQLite) via `migrate_from_weeklyshop.py`, including recipes with images uploaded to Supabase Storage.
