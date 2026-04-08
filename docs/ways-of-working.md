# Ways of Working

> This document captures the standard operating practices used across Keith's projects.
> It is project-agnostic and should be copied to each new project's `docs/` folder as a starting point.
> Update it when a practice changes — it is a living document.

---

## Principles

- **Be a force multiplier, not a bottleneck.** Move fast, remove obstacles, don't wait to be asked.
- **Call out issues directly.** Don't quietly work around problems. Surface them with a clear explanation and a proposed fix.
- **Plan before acting on anything non-trivial.** Get alignment, then execute.
- **Don't gold-plate.** Build exactly what was asked. No speculative features, no unrequested refactors.
- **ClickUp is the source of truth** for what is built. Always check ticket status before assuming. `review` status = deployed.
- **Every meaningful piece of work gets a ClickUp story before code is written.**
- **When discussion defines work, create the ticket proactively** — don't wait to be asked.
- **Australian English** throughout (colour, organisation, licence, behaviour, programme, etc.).

---

## Roles

| Role | Responsibility |
|------|---------------|
| **Product Owner (Keith)** | Strategy, priorities, acceptance of delivered work, manual verification of release test plans |
| **BA Lead** | Story definition, ticket management, ClickUp hygiene, calling out gaps and risks |
| **Test Lead** | Post-deploy verification against ACs, consolidation of manual test plans into release verification tickets, test strategy maintenance |
| **Developer (Claude Code)** | Implementation, automated testing, deployment |

The BA lead and Test Lead work in consultation with Keith. Validate when unsure — check project documentation or ask Keith. Never assume.

---

## ClickUp Setup

| Setting | Value |
|---------|-------|
| Workspace | Brittos (`90161526129`) |
| Primary list | Backlog (`901614384227`) |
| Status workflow | `ready for build` → `in progress` → `review` |

**Status definitions:**
- `ready for build` — story is written, accepted, and queued for development
- `in progress` — actively being built
- `review` — **deployed to production**. Treat as done.

---

## User Story Standard

All stories are written in ClickUp using this format.

**Numbering:** Epics are numbered sequentially (Epic 1, 2, 3…). Stories are prefixed to their parent epic (1.1, 1.2, 2.1…). Standalone defects and enhancements use the prefix `Defect —` or `Enhancement —` with no epic number.

**Never add stories to a completed epic.**

```
Title: [Epic#.Story#] — [Feature area] — [what the user can do]
  OR
Title: Defect — [Area] — [what is broken]
Title: Enhancement — [Area] — [what is being added]

Objective:
One sentence. What problem this solves and for whom.

User Story:
As a [role], I want [capability] so that [outcome].

Acceptance Criteria:
- [ ] AC1 — specific, testable condition
- [ ] AC2
- [ ] AC3 (error/edge cases included)

Out of Scope:
- Anything explicitly deferred

Notes / Context:
- Data model refs (table/field names)
- UI patterns to follow
- Dependencies on other tickets
```

**Rules:**
- ACs must be testable without ambiguity
- Error states are ACs, not notes
- Link dependencies in Notes
- Include a pre-build check AC if there is an infrastructure or data prerequisite

---

## Dev Process — Story Lifecycle

```
Backlog (ready for build)
  ↓  Developer picks up ticket
In Progress
  ↓  Implementation complete, tests pass
  ↓  Commit and deploy
Review  (= deployed to production, pending verification)
  ↓  Test Lead verifies ACs (automated + code review)
  ↓  Test Lead posts verification comment on each ticket
  ↓  Test Lead closes verified tickets
  ↓  Test Lead creates ONE release verification ticket
  ↓  consolidating all manual test steps grouped by business flow
  ↓  Keith executes manual test plan from release ticket
Closed  (Keith accepts or raises defect tickets)
```

**On pickup:**
- Move ticket to `in progress` immediately
- Do not begin implementation without a ticket

**On completion (Developer):**
- Run the full relevant test suite before marking as review
- Post a comment on the ticket (and parent epic if applicable) with:
  - **Done** — what was implemented
  - **Testing** — tiers run, pass/fail, any limitations
  - **Outstanding** — deferrals, unmet ACs, follow-up tickets
  - **Risks / Issues** — blockers, assumptions, known bugs
- Only move to `review` after tests pass or limitations are documented and approved

**On verification (Test Lead):**
- Independently verify each ticket's ACs against the deployed code
- Post a verification comment on each ticket (automated checks, AC-by-AC assessment, verdict)
- Close tickets where all ACs are verified by automated or code-level checks
- Create a **release verification ticket** that:
  - Lists all tickets shipped in the deploy
  - Consolidates manual test steps across all tickets
  - Groups tests by **business flow** (not by ticket) — one test flow may cover multiple tickets
  - Provides specific steps and expected results for Keith
- See `docs/test-strategy.md` Section 7 for the full verification and release ticket format

**On acceptance (Keith):**
- Execute the manual test plan from the release verification ticket
- If all flows pass — close the release verification ticket
- If issues found — raise defect tickets, close the release verification ticket

---

## Commit, Deploy, and Publish

### Commit and deploy (production)
```bash
bash scripts/deploy.sh "descriptive commit message"
```
This does: `git add` (task-relevant files only) → `git commit` → `git push` → `vercel --prod`.

**Never use `git add -A` unless explicitly instructed.** Stage only task-relevant files.

### Commit and publish (preview)
Commit + push + preview deploy (not production).

### Rules
- Commit messages describe *what changed and why*, not *how*
- Reference the ClickUp ticket ID in the commit message where applicable
- Never skip hooks (`--no-verify`) or bypass signing unless explicitly asked
- Never force-push to `main`
- If on a feature branch with no PR, create one via `gh pr create`

---

## Testing Approach

Tests run in four layers. Do not claim tests passed without running them.

| Layer | What | Command | When to run |
|-------|------|---------|-------------|
| **Unit** | Pure logic, controlled inputs | `npm run test:unit` | Every commit |
| **System** | App shell with mocked auth | `npm run test:system` | Every commit |
| **E2E** | Rendered app, authenticated | `npm run test:e2e` | Pre-deploy |
| **Full CI** | All of the above in sequence | `npm run test:ci` | Before marking review |

Run a single file: `npx vitest run src/lib/filename.test.ts`

### Calculation integrity
Every calculated field must be independently verified when its calculation or inputs change. The mechanism is the **golden file framework**:

1. **Golden fixture** (`src/test/fixtures/portfolio-golden.json`) — frozen snapshot of live data plus expected outputs. Regenerate with `npm run test:generate-golden` after each verified import.
2. **Golden tests** — assert TypeScript calculation functions match the fixture. Run as part of unit tests.
3. **Freshness gate** — CI fails if the fixture is older than 30 days.
4. **Reconciliation** — `npm run test:reconcile` compares the fixture against the live SQL truth table. Run after every import before regenerating.

**Post-import workflow:**
```
Import → npm run test:reconcile → review report → npm run test:generate-golden → npm run test:unit
```

### Change-risk classifier
A classifier (`scripts/classifyChange.js`) gates the calculation integrity suite in CI. It runs as a fast-fail step only when high-risk files are touched (calculation libraries, migrations, schema). All unit tests always run regardless.

### E2E canary
The E2E suite includes a numeric canary that asserts the rendered Total Value is a dollar figure with at least 8 digits ($10M+). Any calculation regression that zeroes out the portfolio, or a data load failure, will cause this to fail.

### What to skip and how to say it
If a test tier cannot run (e.g. no `.env.local` for E2E), state explicitly what was skipped and why in the ticket comment. Never omit this.

---

## Schema and Database

- Migrations live in `supabase/migrations/` ordered by timestamp
- Every schema change must have a migration file before any code references the new column
- **Always verify a migration has been applied to production** before treating a column as available. Use `information_schema.columns` to confirm.
- RLS is enabled on all tables — new tables need RLS policies in their migration
- After applying a migration: regenerate TypeScript types and confirm the schema cache is refreshed

---

## Accessibility and UI Standards

- **WCAG AA** contrast (4.5:1 minimum) on all UI elements
- `aria-label` or `accessibilityLabel` on all interactive controls
- Verify contrast using the WCAG relative luminance formula before shipping new colour values
- All inline styles use `CSSProperties` objects (no CSS files, no CSS modules)
- Responsive breakpoints handled via `useMediaQuery` hook

---

## Documentation Hygiene

- When changes materially affect product behaviour, UX flows, data model, or architecture: **update docs in the same delivery**
- If docs conflict with code, treat code + the current request as authoritative, call out the mismatch, and update docs
- `CLAUDE.md` is the project instruction file for Claude Code — keep it current
- This file (`ways-of-working.md`) is project-agnostic — copy it to new projects, do not make it project-specific

---

## What NOT to Do

- Do not build without a ticket
- Do not add features, refactor, or "improve" beyond what was asked
- Do not add docstrings, comments, or type annotations to code you didn't change
- Do not use `git add -A` without explicit instruction
- Do not claim tests passed without running them
- Do not mark a ticket `review` if any AC is unmet and undocumented
- Do not add stories to a completed epic
- Do not assume — validate with Keith or check the docs
