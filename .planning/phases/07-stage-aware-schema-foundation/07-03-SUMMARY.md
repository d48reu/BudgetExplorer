---
phase: 07-stage-aware-schema-foundation
plan: 03
subsystem: web
tags: [prisma, budget-stage-enum, expand-contract, stage-filters, snapshot-gate]

# Dependency graph
requires:
  - phase: 07-stage-aware-schema-foundation
    plan: 02
    provides: "Local DB in dual-column expand state (stage + is_actual); local-baseline snapshot; build-id-normalized Tier 1 oracle"
provides:
  - "Deploy 1 web contract: schema.prisma in FINAL post-Migration-B shape (budget_stage enum, stage on six models, is_actual absent, five stage-keyed @@unique with 007's exact map names)"
  - "All 10 reader touch points in queries.ts filter stage='adopted'; getDepartmentYoY handles all three enum members and skips 'proposed'"
  - "Proof the code swap is invisible: local-deploy1 crawl 69/69 Tier-1 identical to pre-migration baseline"
  - "Zero is_actual references anywhere in web source — Migration B's column drop provably cannot break the site"
affects: [07-05, 07-06, phase-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-written final-state schema as deploy contract: Vercel generates the client from the file, never the DB, so schema can lead the DB during the expand window"
    - "stage placed as last scalar field per model and enum block after all models — matches prisma db pull emission order for the 07-05 no-diff gate"

key-files:
  created: []
  modified:
    - budget-explorer-web/prisma/schema.prisma
    - budget-explorer-web/src/lib/db/queries.ts

key-decisions:
  - "schema.prisma written to final post-B shape mid-window (no db pull): is_actual deleted while DB columns still exist — Prisma tolerates unmapped columns, client never touches them"
  - "budget_descriptions gets stage field but NO unique key (has none today; adding one would be out-of-scope behavior change)"
  - "@@unique/DB mismatch during window accepted as harmless: app uses only findMany/findFirst/count/$queryRaw, never compound-key findUnique"

patterns-established:
  - "Cross-build invisibility gate: pnpm build -> pnpm start -> snapshot capture -> Tier-1 diff vs baseline, all inside one WSL session"

requirements-completed: [DATA-01]

# Metrics
duration: 4min
completed: 2026-07-19
---

# Phase 7 Plan 03: Stage-Aware Schema and Reader Queries Summary

**Deploy 1 web half complete: schema.prisma hand-written to the final post-Migration-B shape (budget_stage enum, stage on six models, is_actual gone, 007's exact constraint names) and all 10 reader query touch points stage-scoped to 'adopted' with three-way YoY handling — proven byte-invisible across all 69 pages against the pre-migration baseline**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-19T04:24:05Z
- **Completed:** 2026-07-19T04:27:51Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- `schema.prisma` now carries the Deploy 1 contract: `enum budget_stage { proposed adopted actual }` (matching 006's CREATE TYPE order), `stage budget_stage` (no default) as the last scalar field on all six models, `is_actual` deleted from the three converting models, and five stage-keyed `@@unique` blocks whose `map:` names exactly equal the constraints Migration B (007) will create — the 07-05 db-pull no-diff gate depends on these names.
- All 10 reader touch points in `queries.ts` filter `stage: 'adopted'`: 3 converted from `is_actual: false` (getAreaWithDepartments, getDepartmentDetail, getRelatedDepartments department_budgets) and 7 newly added where no stage filter existed (revenue_by_source, millage_rates, department_expenditures, three strategic_area_budgets includes, budget_descriptions lookup).
- `getDepartmentYoY` upgraded from boolean ternary to explicit three-way enum handling: `proposed` rows are skipped before the `yearLabels` push (a proposed-only year can never register a label), `actual` and `adopted` maps preserved with adopted-preferred merge. Phase 8 proposed rows structurally cannot leak into history charts.
- Invisibility proven: fresh production build against the post-A local DB, 69-page crawl (`local-deploy1`), Tier-1 normalized diff vs `local-baseline` — 69/69 identical. `tsc --noEmit` clean against the regenerated client, vitest 18/18, zero `is_actual` references in `src/` or `prisma/`.
- Nothing pushed: 17 local commits ahead of origin; the push (and Vercel build) waits for prod Migration A in 07-06.

## Task Commits

1. **Task 1: Hand-write final-state schema.prisma and regenerate the client** — `7b391eb` (feat)
2. **Task 2: Convert all 11 queries.ts touch points to explicit stage filters** — `dc2a091` (feat)
3. **Task 3: Prove the code swap is invisible — deploy1 snapshot vs baseline; commit locally** — no new commit needed (snapshot outputs are gitignored; Tasks 1-2 commits already cover the plan's scoped paths, verified clean)

## Files Created/Modified

- `budget-explorer-web/prisma/schema.prisma` — final post-B shape: enum, six stage fields, is_actual removed, five renamed stage unique keys
- `budget-explorer-web/src/lib/db/queries.ts` — 10 stage:'adopted' filters + three-way YoY stage handling; sumBudgetRows/areaMembershipFilter/searchBudget untouched per plan

## Decisions Made

- Schema hand-written mid-window rather than db-pulled (RESEARCH.md Pitfall 8): db pull would resurrect is_actual and the old unique keys; it runs exactly once post-Migration-B in 07-05.
- `stage` placed as the last scalar field in each model and the enum block after all models, matching prisma db pull's emission order so the 07-05 no-diff gate compares cleanly.
- `budget_descriptions` intentionally keeps no unique key — introducing one would be a behavior change outside zero-change scope.

## Deviations from Plan

None - plan executed exactly as written. (One in-flight typo in the strategic_area_budgets `@@unique` field list was caught and corrected before Task 1 verification ran — never committed, not a deviation.)

## Issues Encountered

None. The single-WSL-session server lifecycle pattern from 07-02 was applied for the build/start/capture/diff cycle and worked first try; server confirmed stopped afterward (port 3000 closed).

## User Setup Required

None.

## Next Phase Readiness

- Deploy 1 web code is complete and committed locally. 07-06 Task 2 can push after prod Migration A; the Vercel build will `prisma generate` from this schema and render identically.
- Migration B (07-05) can now drop `is_actual` and swap constraints safely: no code path in the web app references the column, and the schema's `@@unique` map names are the exact contract 007 must create.
- Phase 8 proposed-row loading is safe against every reader: all six models' queries are stage-scoped, and YoY explicitly skips proposed.

## Self-Check: PASSED

- FOUND: budget-explorer-web/prisma/schema.prisma (enum budget_stage, 5 _stage_key maps, zero is_actual)
- FOUND: budget-explorer-web/src/lib/db/queries.ts (10 stage:'adopted', zero is_actual)
- FOUND: budget-explorer-web/.snapshots/local-deploy1/ (69 pages, gitignored)
- FOUND: commit 7b391eb
- FOUND: commit dc2a091

---
*Phase: 07-stage-aware-schema-foundation*
*Completed: 2026-07-19*
