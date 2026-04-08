# LaLista — Product Specification

> Living document capturing all delivered functionality.
> Last updated: 2026-04-08.

---

## 1. Product Overview

**LaLista** is a household grocery planning and ordering application for Coles (Australia). Users manage a personal cookbook, plan weekly meals, build a smart shopping list, and dispatch it to Coles via local browser automation.

**Core value proposition:** Turn a recipe collection into a weekly Coles order with minimal effort — deduplicating ingredients, excluding pantry items, and automating the Coles cart.

---

## 2. Architecture

| Tier | Technology | Deployment |
|------|-----------|------------|
| Frontend | React 19 + TypeScript + Vite 6 SPA | Vercel (auto-deploy from `main`) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) | Supabase hosted |
| Agent | Python + Playwright browser automation | Local (macOS) — never deployed |

**Design language:** DM Sans (body), DM Serif Display (headings), DM Mono (code). Green accent palette (#2b5e3f). Inherited from weeklyshop.

---

## 3. Authentication & Household Provisioning

### 3.1 Sign Up
- Email/password registration (minimum 6 characters)
- Google OAuth sign-in
- Email confirmation flow (post-signup "check your email" screen)

### 3.2 Login
- Email/password authentication
- Google OAuth
- Error messaging on failed attempts

### 3.3 Auto-Provisioning (DB Trigger)
On user creation, the `on_auth_user_created` trigger automatically:
1. Creates a new **household** (named "{full_name}'s Household")
2. Creates a **profile** record linking the user to that household

### 3.4 Household Scoping
- All user-facing data is scoped to a household, not individual users
- Multiple users can share a household
- Row Level Security (RLS) enforced on all tables via `current_household_id()` helper
- No cross-household data access is possible

---

## 4. Weekly Shopping Workflow

The core workflow is a linear session that progresses through 6 states, enforced at the database level via a PL/pgSQL trigger (`enforce_session_transition`). No backward transitions are permitted.

```
draft → planning → picking → review → finalised → dispatched
```

### 4.1 Session (Draft → Planning)
**Page:** `/session`

- Create a new weekly session (defaults to current date)
- View current/latest session and its status
- Add freeform items via textarea (one item per line) — stored as manual items
- View summary counts of meal ingredients and confirmed other items
- Advance session to next state via `advance_session` RPC

### 4.2 Meals (Planning → Picking)
**Page:** `/meals`

- Browse all household recipes
- Select/deselect recipes for the current session (creates `weekly_meals` records)
- "Import Ingredients" extracts all ingredients from selected recipes into the session's `meal_ingredients` JSONB field
- Each ingredient stored as: `{name, quantity, unit, coles_product, source: 'meal'}`

### 4.3 Picker (Picking → Review)
**Page:** `/picker`

- Displays longlist items grouped by category
- Staple items (`is_staple: true`) are pre-selected
- Checkbox selection with quantity +/- controls
- Selected count displayed
- "Confirm Selection" saves to `confirmed_other_items` JSONB field (full overwrite)

### 4.4 Review (Review → Finalised)
**Page:** `/review`

- Merges three data sources:
  - Meal ingredients (from recipes)
  - Confirmed other items (from picker)
  - Freeform/manual items
- **Smart deduplication:** case-insensitive name matching; duplicates tracked in `dropped_duplicates`
- **Pantry exclusion:** items matching pantry entries are removed; tracked in `pantry_exclusions`
- Generates `final_list` JSONB field
- Individual item removal from the merged list
- Collapsible sections showing pantry exclusions and dropped duplicates
- "Save Changes" persists the final list

### 4.5 Finalise (Finalised → Dispatched)
**Page:** `/finalise`

- Read-only display of final list grouped by category
- Summary stats: total items, category count, session date
- "Copy to Clipboard" — formatted as `qty unit name` per line
- "Mark as Finalised" advances session status
- "Dispatch to Coles" — sets session ready for agent pickup
- **Automation Log Viewer** (toggle) — real-time Supabase subscription to `automation_logs`, colour-coded by log type (info/success/warning/error), auto-scrolling, live connection indicator

---

## 5. Reference Data Management

### 5.1 Recipes
**Page:** `/recipes`

- Full CRUD for recipes
- Fields: title, servings, prep time, cook time, source URL, directions, notes, image URL
- Image storage via Supabase Storage (`recipe-images` public bucket)
- Recipe images shown as thumbnails in the recipe list
- Search/filter recipes
- Modal form for create/edit
- Delete with confirmation dialog
- `ai_parsed` flag (for future AI-assisted recipe import)

#### Recipe Ingredients (embedded in recipe edit)
- Add/edit/delete ingredients per recipe
- Fields: quantity, unit, ingredient text, Coles product mapping
- **Coles product autocomplete:** searches `coles_preferences` table (minimum 2 characters, fuzzy matching via pg_trgm)
- Drag-to-reorder via up/down arrow controls
- Ingredient display shows quantity + unit + text + Coles product badge

### 5.2 Longlist
**Page:** `/longlist`

- Reusable shopping item inventory (items the household buys regularly)
- Fields: name, category, default quantity, unit, is_staple flag, notes
- Grouped display by category + uncategorised section
- Collapsible category groups
- Star icon toggles staple status (amber when active)
- Inline add/edit/delete
- Fuzzy search enabled (GIN index with pg_trgm)

### 5.3 Pantry
**Page:** `/pantry`

- Items the household already has on hand
- Add individually or bulk import (textarea, one item per line)
- Inline edit/delete
- Used during Review to automatically exclude items from the shopping list
- Fuzzy search enabled (GIN index with pg_trgm)

### 5.4 Categories
**Page:** `/categories`

- Shopping categories with sort order
- Table view with inline editing of name and sort order
- Add/delete with confirmation
- 16 default seed categories: Produce, Dairy & Eggs, Crackers & Biscuits, Snacks & Confectionery, Bakery, Beverages, Deli & Chilled, Frozen, Household, Personal Care, Spreads & Condiments, Soups, Canned Food, Breakfast & Cereals, Pet, Meat

### 5.5 Coles Preferences
**Page:** `/coles-preferences`

- Preferred Coles products (brand and pack size preferences)
- Fields: product name, pack size, brand, last price
- Search/filter
- Modal form for add/edit, delete
- Powers the autocomplete in recipe ingredient editing
- Fuzzy search enabled (GIN index with pg_trgm)

---

## 6. Dashboard
**Page:** `/` (home)

- Aggregate statistics: total sessions, completed sessions, average items per shop
- Pie chart of category distribution across all finalised lists (Recharts)
- Most common items across all sessions
- Session history with colour-coded status badges
- "Create New Session" button

---

## 7. Coles Automation Agent

**Location:** `agent/agent.py` (local Python, never deployed)

### Workflow
1. Polls Supabase every 10 seconds for sessions where `status = 'finalised'` and `coles_dispatched = false`
2. Opens Chrome via Playwright (stealth mode to bypass bot detection)
3. Handles Coles login — manual on first run, reuses saved cookies (`coles_session.json`) on subsequent runs
4. For each item in `final_list`: searches Coles website, adds to cart with correct quantity
5. Logs all progress in real-time to `automation_logs` table (visible in Finalise page)
6. Marks session as `coles_dispatched = true` on completion
7. Keeps browser open for 10 minutes for manual review

### Key Features
- **Stealth mode** — `playwright-stealth` to avoid Coles bot detection
- **Cookie persistence** — session saved to `coles_session.json`, avoids repeated logins
- **`--relogin` flag** — force fresh Coles login when cookies expire
- **Non-headless** — browser visible for manual intervention if needed
- **Real-time logging** — all activity streamed to Supabase for frontend display

---

## 8. Data Migration

**Script:** `agent/migrate_from_weeklyshop.py`

One-time migration from the legacy weeklyshop SQLite database to Supabase:
- Categories (with sort order)
- Pantry items
- Longlist items (with staple flags, units, notes)
- Recipes with images (uploaded to Supabase Storage)
- Recipe ingredients with Coles product mappings
- Coles preferences (pack sizes)

---

## 9. Navigation & Layout

### App Shell
- Responsive layout: collapsible sidebar on mobile, fixed on desktop (md+ breakpoints)
- Top bar: mobile hamburger menu, user email display, sign out button

### Sidebar Navigation

| Section | Pages |
|---------|-------|
| Meal Planning | Recipes |
| Weekly Workflow | Session → Meals → Picker → Review → Finalise |
| Maintenance | Longlist, Pantry, Categories, Coles Preferences |
| — | Dashboard (bottom) |

---

## 10. Database Schema Summary

| Table | Purpose |
|-------|---------|
| `households` | Multi-tenant containers |
| `profiles` | User metadata, links user to household |
| `categories` | Shopping categories with sort order |
| `recipes` | Recipe library |
| `recipe_ingredients` | Ingredients per recipe with Coles mapping |
| `pantry_items` | Items household already has |
| `longlist_items` | Reusable shopping item inventory |
| `coles_preferences` | Preferred Coles products |
| `weekly_sessions` | Shopping session with state machine + JSONB data |
| `weekly_meals` | Recipes selected for a session |
| `automation_logs` | Agent activity logs |

### Key Database Features
- **Session status enum:** `draft | planning | picking | review | finalised | dispatched`
- **State machine enforcement:** DB trigger prevents invalid transitions
- **`advance_session` RPC:** moves session to next valid state
- **Auto-provisioning trigger:** creates household + profile on user signup
- **`current_household_id()` / `auth_household_id()`:** SECURITY DEFINER helpers for RLS
- **`updated_at` triggers:** automatic timestamp maintenance on 7 tables
- **GIN indexes with pg_trgm:** fuzzy text search on pantry items, longlist items, Coles preferences, recipe ingredients
- **Supabase Storage:** `recipe-images` public bucket for recipe photos

---

## 11. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.1 |
| Build Tool | Vite | 6.3 |
| Routing | React Router DOM | 7 |
| Styling | Tailwind CSS | 4 |
| Charts | Recharts | 3 |
| Language | TypeScript | 5.8 (strict mode) |
| Linting | ESLint | 9 (flat config) |
| Formatting | Prettier | semi: false, singleQuote, 100 char width |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth | Email/password + Google OAuth |
| Storage | Supabase Storage | recipe-images bucket |
| Realtime | Supabase Realtime | automation_logs subscription |
| Agent | Python + Playwright | Stealth mode, Chrome |
| Hosting | Vercel | SPA deployment |
