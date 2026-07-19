---
phase: 07-stage-aware-schema-foundation
plan: 02
subsystem: database
tags: [migration, expand-contract, budget-stage-enum, postgres, snapshot-gate]

# Dependency graph
requires:
  - phase: 07-stage-aware-schema-foundation
    plan: 01
    provides: "local-baseline snapshot (69 pages), stray-row audit (clean), snapshot.mjs oracle"
provides:
  - "pipeline/migrations/006_budget_stage_expand.sql — Migration A (expand): budget_stage enum + NOT NULL stage column on all six tables with exact backfill"
  - "Local DB in dual-column expand state (stage + is_actual coexist); old Prisma client provably unaffected"
  - "Post-A snapshot (.snapshots/local-post-A) 69/69 Tier-1 identical to pre-migration baseline"
  - "Per-table backfill counts for prod comparison in 07-06 (table below)"
affects: [07-03, 07-04, 07-05, 07-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expand/contract step A: ADD COLUMN NOT NULL DEFAULT (PG 11+ fast path) + backfill UPDATE, zero constraint/view changes"
    - "Tier 1 normalization now also collapses the Next build-id doctype comment (<!--X-->) — first cross-build diff exposed the gap"

key-files:
  created:
    - pipeline/migrations/006_budget_stage_expand.sql
  modified:
    - budget-explorer-web/scripts/snapshot.mjs

key-decisions:
  - "Audit was clean (07-01), so Migration A shipped verbatim — no fiscal-year-scoped backfill extension needed"
  - "Tier 1 forgives ONLY a bare-token HTML comment immediately after <!DOCTYPE html>; mid-document comments and content changes still fail the gate"

patterns-established:
  - "Pipeline commands against local DB: export DATABASE_URL from budget-explorer-web/.env first (root .env has only DATABASE_URL_PROD, which pipeline/config.py never reads)"
  - "Server lifecycle for snapshot captures must run inside a single WSL session (background processes die when the wsl.exe session closes)"

requirements-completed: [DATA-01]

# Metrics
duration: 4min
completed: 2026-07-19
---

# Phase 7 Plan 02: Migration A (Expand) Summary

**budget_stage enum + backfilled NOT NULL stage columns applied to all six tables locally via 006_budget_stage_expand.sql; post-A site render proven byte-invisible (69/69 Tier-1 identical) after fixing a build-id normalization gap in the snapshot oracle**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-19T04:17:04Z
- **Completed:** 2026-07-19T04:21:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `006_budget_stage_expand.sql` written exactly to the locked expand-only scope (enum + six ADD COLUMN + three backfill UPDATEs) and applied through the tracked runner (`APPLY 006_budget_stage_expand.sql`, recorded in `_migrations`).
- Backfill proven exact: `stage='actual'` counts equal pre-migration `is_actual IS TRUE` counts per converting table; zero rows gained or lost; fresh-stage tables 100% `'adopted'`.
- `is_actual` still present on all three converting tables; all five unique constraints verified intact by name — the deployed Prisma client's world is untouched.
- Post-A rebuild + full 69-page crawl is Tier-1 identical to the pre-migration `local-baseline`; `python -m pipeline verify` still green (13/13 checks).

## Backfill Counts (prod rollout in 07-06 must match this shape)

| Table | Total rows | stage='actual' | stage='adopted' |
|---|---|---|---|
| department_budgets | 354 | 197 | 157 |
| department_expenditures | 0 | 0 | 0 |
| revenue_by_source | 7 | 0 | 7 |
| millage_rates | 7 | 0 | 7 |
| strategic_area_budgets | 9 | 0 | 9 |
| budget_descriptions | 53 | 0 | 53 |

Pre-migration `is_actual IS TRUE` counts (recorded before applying): department_budgets 197, department_expenditures 0, revenue_by_source 0 — actual-stage counts mirror them exactly. Total row counts are unchanged pre/post.

Note for 07-06: prod row totals may differ from local totals; the invariant to check is `stage='actual'` count == pre-migration `is_actual=true` count per converting table, all other rows `'adopted'`, and total counts unchanged.

## Task Commits

1. **Task 1: Write 006_budget_stage_expand.sql and apply locally** — `e145aa7` (feat)
2. **Task 2: Prove Migration A is invisible — post-A snapshot vs baseline** — `ba35852` (fix: snapshot.mjs Tier-1 normalization gap; snapshot outputs themselves are gitignored)

## Files Created/Modified

- `pipeline/migrations/006_budget_stage_expand.sql` — Migration A: enum + six stage columns + backfill, nothing else
- `budget-explorer-web/scripts/snapshot.mjs` — Tier 1 now collapses the Next build-id doctype comment; docs updated

## Decisions Made

- Shipped the plan's SQL verbatim (contingency path unnecessary — 07-01 audit found zero actual-era stray rows).
- Normalization fix is maximally narrow: only `^<!DOCTYPE html><!--[A-Za-z0-9_-]+-->` is collapsed, so any comment elsewhere or any content change still fails the gate (verified with positive and negative cases).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Background `next start` died between wsl.exe sessions**
- **Found during:** Task 2 (post-A capture)
- **Issue:** Server launched with nohup in one `wsl.exe` invocation was killed when that session closed (`[ELIFECYCLE] Command failed`), so the capture got ECONNREFUSED
- **Fix:** Ran the full lifecycle (start → wait ready → capture → diff → kill) inside a single WSL session; no file changes
- **Verification:** 69 pages captured, server confirmed stopped afterward (port 3000 closed)
- **Committed in:** n/a (no file changes)

**2. [Rule 1 - Bug] Tier 1 normalization missed the Next build-id doctype comment**
- **Found during:** Task 2 (first-ever cross-build diff)
- **Issue:** All 69 pages failed Tier 1 solely because Next 16 embeds the random buildId as an HTML comment immediately after `<!DOCTYPE html>` (`<!--rLTcd68...-->` vs `<!--PKgHNVm7...-->`) — a build artifact Tier 1 is explicitly documented to forgive; 07-01 only exercised Tier 0 same-build and a synthetic fixture, so the gap was latent
- **Fix:** Before patching, empirically proved via a throwaway comparison script that the doctype comment was the ONLY difference class across all 69 pages; then added one narrow normalization rule to `snapshot.mjs` (bare-token comment in that exact position → `<!--X-->`) and re-ran the official diff
- **Files modified:** budget-explorer-web/scripts/snapshot.mjs
- **Verification:** `diff local-baseline local-post-A --normalize` 69/69 PASS; strictness spot-checks confirm content changes and mid-document comments still fail
- **Commit:** ba35852

---

**Total deviations:** 2 auto-fixed (1 environment, 1 tool bug)
**Impact on plan:** No scope change. The migration itself needed zero adjustment; the red gate was tool noise, diagnosed to root cause before proceeding as the plan required.

## Issues Encountered

None beyond the two deviations above. The known pnpm non-TTY flag (`--config.verify-deps-before-run=false`) and the budget-explorer-web/.env DATABASE_URL location were applied per 07-01's established patterns (not deviations).

## User Setup Required

None.

## Next Phase Readiness

- Local DB is in the dual-column expand state; both old code (is_actual) and new stage column are live simultaneously — zero-downtime property of step A holds.
- 07-03/07-04 can now flip the Prisma schema and pipeline to `stage`; 07-05 (Migration B) has verified constraint names from 07-01 and an exact-backfill precedent from this plan.
- 07-06 prod rollout: compare against the backfill-shape invariant above, not the literal local counts.

## Self-Check: PASSED

- FOUND: pipeline/migrations/006_budget_stage_expand.sql
- FOUND: budget-explorer-web/.snapshots/local-post-A/manifest.json (gitignored, 69 pages)
- FOUND: `_migrations` row 006_budget_stage_expand.sql
- FOUND: commit e145aa7
- FOUND: commit ba35852

---
*Phase: 07-stage-aware-schema-foundation*
*Completed: 2026-07-19*
