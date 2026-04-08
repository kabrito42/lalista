# LaLista Test Strategy

> Prepared by: Test Lead
> Date: 8 April 2026
> Status: Draft — for review by Keith (Product Owner / BA Lead)

---

## 1. Purpose

This document defines the test strategy for LaLista — a household grocery shopping app built on React 19 + Supabase, deployed to Vercel, with a local Python automation agent for Coles ordering.

The goal is to establish a test framework from zero, prioritised by risk, and aligned with the four-layer model defined in [ways-of-working.md](ways-of-working.md).

---

## 2. Current State

| Area | Status |
|------|--------|
| Test framework | **Not installed** — no vitest, no test files, no test scripts |
| Quality gates | `npm run lint` + `npm run build` only |
| Seed data | Partial — 1 household, 16 categories, 20 pantry items, ~54 longlist items. No recipes, sessions, or automation logs |
| CI pipeline | None — Vercel builds on push but runs no tests |

The codebase is ~3,250 lines of TypeScript across 14 pages, 6 components, 1 hook, 1 context, and 1 utility module.

---

## 3. Risk Assessment

Prioritised by business impact and likelihood of regression:

| # | Area | Risk | Rationale |
|---|------|------|-----------|
| 1 | **Session state machine** | Critical | Core workflow. 6-state transition enforced by DB trigger. Regression blocks the entire weekly shop |
| 2 | **Review page dedup/pantry logic** | High | Client-side business logic that determines what goes on the final shopping list. Uses substring matching with known false-positive risk (e.g. "salt" excludes "salted butter") |
| 3 | **RLS / household scoping** | High | Security boundary. `current_household_id()` is load-bearing. Broken policy = data leak or access denial |
| 4 | **Recipe-to-list pipeline** | High | Multi-step data flow: recipes -> meal selection -> ingredient import -> session JSONB. Breakage means wrong items on the list |
| 5 | **Auth & provisioning** | Medium | Trigger-based household creation on signup. If broken, new users are dead on arrival |
| 6 | **Picker staple pre-selection** | Medium | Staple items must auto-select. Logic depends on `is_staple` flag and category lookup |
| 7 | **Dashboard analytics** | Low | Derived calculations (averages, frequencies). Incorrect but not blocking |
| 8 | **CRUD pages** (Recipes, Pantry, Categories, Longlist, Coles Prefs) | Low | Standard form operations — important but structurally simple |

---

## 4. Test Layers

Aligned with [ways-of-working.md](ways-of-working.md) Section "Testing Approach":

### Layer 1: Unit Tests (`npm run test:unit`)

**Scope:** Pure functions and extractable business logic — no DOM, no Supabase, no auth.

**What to test:**
- **ReviewPage dedup logic** — item merging, pantry exclusion (substring matching edge cases), duplicate detection
- **SessionPage freeform parsing** — newline splitting, trim, empty-line filtering, item object construction
- **PickerPage selection logic** — staple pre-selection, quantity bounds (`Math.max(1, qty)`), selection Map operations
- **DashboardPage analytics** — completed session filtering, average calculation, category distribution, item frequency
- **FinalisePage grouping** — category grouping reduce, clipboard format generation

**Approach:** Extract inline business logic from page components into pure utility functions in `app/src/lib/`. Test those functions directly. This is the highest-value, lowest-cost layer.

**Framework:** Vitest (native Vite integration, fast, TypeScript-first).

### Layer 2: System Tests (`npm run test:system`)

**Scope:** React component rendering with mocked auth and mocked Supabase client. Verifies UI state transitions, conditional rendering, and user interactions.

**What to test:**
- `ProtectedRoute` — renders children when authenticated, redirects when not
- `AuthContext` — provides user/session state, handles auth lifecycle
- `AppShell` / `Sidebar` — navigation links render, active state, mobile toggle
- Page components — loading states, error states, empty states, form validation
- `RecipeIngredients` — ingredient reordering, autocomplete behaviour

**Approach:** React Testing Library + MSW (Mock Service Worker) for Supabase API interception. Mock `useAuth()` and `useHousehold()` at the context level.

**Framework:** Vitest + @testing-library/react + MSW.

### Layer 3: E2E Tests (`npm run test:e2e`)

**Scope:** Full rendered app against a real (local) Supabase instance. Authenticated user flows.

**What to test (key user journeys):**
1. **Full weekly cycle:** Create session -> Add meals -> Import ingredients -> Pick items -> Generate list -> Finalise
2. **Recipe management:** Create recipe -> Add ingredients -> Reorder -> Edit -> Delete
3. **Household setup:** Add categories -> Add longlist items -> Set staples -> Add pantry items
4. **Auth flow:** Sign up -> Auto-provisioning -> Login -> Protected routes

**Approach:** Playwright (already a project dependency via the agent). Run against `supabase start` local instance with seed data.

**Framework:** Playwright + local Supabase.

### Layer 4: Full CI (`npm run test:ci`)

**Scope:** All layers in sequence — unit -> system -> E2E.

**When:** Before marking any ticket as `review` (per ways-of-working.md).

---

## 5. Testability Gaps

The current codebase has structural issues that limit testability. These must be addressed before writing system/E2E tests:

### 5.1 Business Logic Embedded in Components

All business logic (dedup, parsing, grouping, analytics) is inline within page components. This makes it impossible to unit test without rendering React.

**Fix:** Extract pure logic into `app/src/lib/` utility modules. Pages import and call these functions. Unit tests target the extracted functions directly.

**Files affected:**
- `ReviewPage.tsx` — extract `generateFinalList(mealItems, otherItems, pantryNames)` 
- `SessionPage.tsx` — extract `parseFreeformItems(text)`
- `PickerPage.tsx` — extract `buildInitialSelections(items, categories)`
- `DashboardPage.tsx` — extract `computeSessionStats(sessions)`
- `FinalisePage.tsx` — extract `groupByCategory(items)`, `formatForClipboard(items)`

### 5.2 Supabase Client Singleton

`supabase.ts` exports a hard singleton with no injection point. System tests cannot swap in a mock client.

**Fix:** Export a factory function alongside the singleton. System tests use the factory with a mock URL/key or intercept via MSW.

### 5.3 No Error States in Contexts

`AuthContext` and `useHousehold` swallow errors (console.log only). Tests cannot assert on error conditions.

**Fix:** Add `error` field to context/hook return types. Lower priority — address when writing system tests.

### 5.4 Seed Data Gaps

Current seed data covers categories, pantry, and longlist — but nothing for recipes, sessions, weekly_meals, or automation_logs.

**Fix:** Extend `seed.sql` with:
- 5-10 recipes with ingredients (enables meal planning tests)
- 2-3 sessions at different statuses (enables state machine tests)
- Associated weekly_meals (enables ingredient import tests)
- Sample automation_logs (enables log viewer tests)
- A few coles_preferences (enables autocomplete tests)

---

## 6. Implementation Phases

### Phase 1: Framework + Unit Tests (Priority: Immediate)

1. Install vitest + dependencies
2. Configure vitest for the Vite/React/TypeScript stack
3. Add `test:unit`, `test:system`, `test:e2e`, `test:ci` scripts to package.json
4. Extract business logic from 5 page components into `app/src/lib/` utilities
5. Write unit tests for extracted logic (targeting risks #1-2 from Section 3)
6. Verify `npm run test:unit` passes

**Estimated scope:** ~15-20 test cases across 5-6 test files.

### Phase 2: System Tests (Priority: Next)

1. Install @testing-library/react + MSW
2. Create test utilities: mock auth provider, mock household hook, MSW handlers
3. Write system tests for ProtectedRoute, AuthContext, key page components
4. Verify `npm run test:system` passes

**Estimated scope:** ~10-15 test cases across 4-5 test files.

### Phase 3: E2E Tests (Priority: After Phase 2)

1. Configure Playwright for the frontend (separate from agent usage)
2. Extend seed data for full workflow coverage
3. Write E2E tests for the two critical user journeys (weekly cycle, recipe management)
4. Verify `npm run test:e2e` passes against local Supabase

**Estimated scope:** 2-4 test suites covering key flows.

### Phase 4: CI Integration (Priority: After Phase 3)

1. Add `npm run test:ci` that runs all layers in sequence
2. Consider GitHub Actions workflow for automated test runs on push
3. Add test status reporting to ClickUp ticket comments (per ways-of-working.md)

---

## 7. Verification Gate and Release Testing

### Post-Deploy Verification (Test Lead)

After every commit and deploy, the Test Lead independently verifies each ticket's acceptance criteria against the code and deployed app.

**What the Test Lead verifies:**
- `npm run test:ci` passes (unit, system, E2E)
- `npm run build` and `npm run lint` pass
- Code changes satisfy each AC (code review against ticket)
- Business logic correctness confirmed by test results
- No regressions in existing test suite
- Database migrations applied correctly (where applicable)

**What requires manual verification by Keith:**
- Visual appearance in browser
- UX flow and feel
- Real authentication (signup, login, Google SSO)
- Real Coles automation behaviour
- Mobile device and responsive testing
- Cross-browser behaviour
- Accessibility with assistive technology
- "Does this make sense to a real user?"

**Per-ticket verification comment format:**
```
## Verification — [ticket name]

### Automated checks
- [x] npm run test:ci — PASS (N tests, 0 failures)
- [x] npm run build — PASS
- [x] npm run lint — PASS

### AC verification
- [x] AC1 — Verified: [how]
- [x] AC2 — Verified: [how]
- [ ] AC3 — MANUAL CHECK REQUIRED: [specific steps]

### Verdict
[All verified / N gaps remaining for manual check]
```

### Release Verification Ticket (Consolidated)

After the Test Lead completes verification of all individual tickets in a deploy, the workflow is:

1. **Close individual tickets** — each ticket that passes Test Lead verification is moved to `review` (= deployed and verified)
2. **Create one release verification ticket** — a single new ticket consolidating all manual test steps from every ticket in that deploy
3. **Group by business flow** — manual tests are organised by how Keith would actually use the app, not by individual ticket. One test flow may cover changes from multiple tickets
4. **Keith works one ticket** — instead of opening 6 tickets to find scattered test instructions, Keith has one cohesive test plan

**Release verification ticket format:**

```
Title: Release Verification — [date] — [summary of what shipped]

## What shipped
- [ticket link] — one-line summary
- [ticket link] — one-line summary

## Manual test plan

### Flow 1: [Business flow name, e.g. "Weekly session lifecycle"]
Covers: [ticket refs]
1. Step — expected result
2. Step — expected result
3. Step — expected result

### Flow 2: [Business flow name, e.g. "Recipe management"]
Covers: [ticket refs]
1. Step — expected result
2. Step — expected result

## Environment
- URL: [production URL]
- Test account: [if applicable]

## Verdict
[ ] All flows pass — close this ticket
[ ] Issues found — raise defect tickets
```

**Lifecycle of a release verification ticket:**
```
Test Lead creates → "review" status
  ↓
Keith executes manual tests
  ↓  All flows pass
Keith closes ticket
  ↓  Issues found
Keith raises defect tickets, closes this one
```

---

## 8. Conventions

- Test files live alongside source: `ComponentName.test.tsx`, `utilityName.test.ts`
- Use `describe` / `it` blocks with clear, behaviour-focused descriptions
- Follow existing code style: Prettier (no semis, single quotes, 100 char width)
- Australian English in test descriptions where applicable
- No snapshot tests — they're brittle for this type of app
- Seed data changes go through Supabase migrations, not ad-hoc SQL

---

## 9. Out of Scope

- **Python agent testing** — the agent is local-only and has its own runtime. Test strategy for the agent is a separate concern.
- **Performance/load testing** — not warranted at current scale.
- **Visual regression testing** — not warranted yet. Revisit if design system grows.
- **Accessibility testing** — WCAG AA compliance is a requirement (per ways-of-working.md) but automated a11y testing (e.g. axe-core) is deferred to Phase 2 system tests.

---

## 10. Success Criteria

| Milestone | Definition of Done |
|-----------|-------------------|
| Phase 1 complete | `npm run test:unit` runs and passes. Business logic extracted. Core dedup and state machine logic covered |
| Phase 2 complete | `npm run test:system` runs and passes. Key components render correctly under mock conditions |
| Phase 3 complete | `npm run test:e2e` runs against local Supabase. Full weekly cycle passes end-to-end |
| Phase 4 complete | `npm run test:ci` runs all layers. Can be triggered in CI pipeline |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Extracting logic from pages introduces regressions | Extract-and-test in the same commit. Verify app still builds and functions before moving on |
| Local Supabase required for E2E | Document setup clearly. E2E is optional locally; mandatory pre-deploy |
| Test maintenance burden | Keep tests focused on business logic, not implementation details. Avoid testing Supabase SDK internals |
| Seed data drift from production schema | Seed data updated alongside migrations. `supabase db reset` is the canonical reset |
