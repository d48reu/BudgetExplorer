---
phase: 07-stage-aware-schema-foundation
plan: 01
subsystem: testing
tags: [snapshot, regression-gate, sitemap, sha256, nodejs, postgres]

# Dependency graph
requires: []
provides:
  - "scripts/snapshot.mjs — sitemap-driven full-site crawl + two-tier byte diff (Tier 0 raw, Tier 1 normalized), the phase's verification oracle reused by Phases 8-13"
  - "Pre-migration local baseline snapshot (.snapshots/local-baseline, 69 pages, gitignored) — captured BEFORE any schema change"
  - "Determinism proof: same-build double-capture is Tier-0 byte-identical (69/69 pages)"
  - "Pre-flight audit results for Migrations A and B (stray rows: none; constraint names: verified identical on local and prod)"
affects: [07-02, 07-03, 07-04, 07-05, 07-06, phase-08, phase-09, phase-10, phase-11, phase-12, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-tier snapshot diff: Tier 0 raw SHA-256 within a build; Tier 1 (script bodies emptied, /_next/static/* collapsed to placeholder) across builds"
    - "Snapshot page set keyed by URL path (not full URL), so local and prod captures are directly diffable"

key-files:
  created:
    - budget-explorer-web/scripts/snapshot.mjs
  modified:
    - budget-explorer-web/package.json
    - budget-explorer-web/.gitignore

key-decisions:
  - "Manifest keys are URL paths (origin-independent) so snapshots from different bases share one page-set space"
  - "Tier 1 normalization strips script element bodies but keeps tags, so structural script changes still fail the gate"
  - "pnpm invoked with --config.verify-deps-before-run=false in non-TTY shells (pnpm 11 deps-check wants a TTY to purge node_modules; existing install is correct)"

patterns-established:
  - "Regression gate usage: `pnpm snapshot capture --base URL --out LABEL` then `pnpm snapshot diff A B [--normalize]` — Tier 0 same-build, Tier 1 cross-build"
  - "Local DATABASE_URL lives in budget-explorer-web/.env; DATABASE_URL_PROD in root .env (audit scripts must read the right file)"

requirements-completed: [DATA-01]

# Metrics
duration: 15min
completed: 2026-07-19
---

# Phase 7 Plan 01: Snapshot Regression Gate + Pre-Migration Baseline Summary

**Sitemap-driven byte-identical snapshot gate (69-page crawl, Tier 0/Tier 1 diff) built and proven; pre-migration baseline captured; Migration A/B pre-flight audits clean on local and prod**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-19T04:11:06Z
- **Completed:** 2026-07-19T04:26:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `scripts/snapshot.mjs` (257 lines, zero dependencies): `capture` fetches sitemap, rewrites origins to `--base`, appends `/search` if missing, fails hard on any non-200, writes per-page HTML + `manifest.json` (path → file/sha256/bytes); `diff` compares page sets then per-page SHA-256, Tier 0 raw or Tier 1 normalized, with a first-20-differing-lines report on mismatch.
- Fixture proof: a pair differing only in script body + asset hash FAILS Tier 0 and PASSES Tier 1 — the normalization forgives exactly build-artifact noise, nothing else.
- Pre-migration baseline: 69 pages captured against the current build + current local DB (homepage, explorer, 9 areas, 53 departments, calculator, glossary, search — all 200). Double-capture from the same running server is Tier-0 identical 69/69, empirically confirming the research's page-determinism claim. No normalization fixes were needed.
- Both read-only pre-flight audits ran against local AND prod Neon; results below.

## Pre-Flight Audit Results (consumed by 07-02 and 07-05)

### Audit 1 — Stray rows in fresh-stage tables (for Migration A backfill, plan 07-02)

**Clean bill. No actual-era (FY 2021-22 through 2023-24) rows exist in any of the three tables.** Migration A's simple backfill (`is_actual=true → 'actual'`, `is_actual=false → 'adopted'`; fresh-stage tables default to `'adopted'`) suffices — no fiscal-year-based `SET stage='actual'` extension needed.

| Table | Local | Prod |
|---|---|---|
| millage_rates | FY 2025-26: 7 rows (only) | FY 2025-26: 7 rows (only) |
| strategic_area_budgets | FY 2025-26: 9 rows (only) | FY 2025-26: 9 rows (only) |
| budget_descriptions | entity_type `department`: 53 rows (only) | entity_type `department`: 53 rows (only) |

### Audit 2 — Unique constraint names (for Migration B DROP CONSTRAINT, plan 07-05)

**Local and prod both return exactly the five research-verified names** (byte-for-byte, including the two PG-truncated ones). Migration B can use these names as written:

- `department_budgets_fy_dept_area_actual_key`
- `department_expenditures_fiscal_year_id_department_id_expend_key`
- `millage_rates_fiscal_year_id_authority_key`
- `revenue_by_source_fiscal_year_id_revenue_source_id_is_actua_key` (truncated)
- `strategic_area_budgets_fiscal_year_id_strategic_area_id_key`

## Task Commits

1. **Task 1: Build snapshot.mjs (capture + two-tier diff) and wire scripts** — `ff32aff` (feat)
2. **Task 2: Capture pre-migration local baseline and prove determinism** — no commit (outputs are gitignored `.snapshots/` artifacts only; no source changes)
3. **Task 3: Pre-flight audits (stray rows + constraint names, local and prod)** — no commit (read-only SELECTs; results recorded in this SUMMARY)

## Files Created/Modified

- `budget-explorer-web/scripts/snapshot.mjs` — snapshot capture + two-tier diff tool (the phase oracle)
- `budget-explorer-web/package.json` — added `"snapshot": "node scripts/snapshot.mjs"` script
- `budget-explorer-web/.gitignore` — added `.snapshots/`

## Decisions Made

- Manifest keyed by URL path, not full URL — makes local-vs-prod snapshot diffs possible with zero rewriting.
- Tier 1 keeps `<script>` open/close tags while emptying bodies, so added/removed/moved scripts still fail the normalized gate.
- Baseline captured on port 3000 (was free at run time).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm build aborted in non-TTY shell (deps-check purge prompt)**
- **Found during:** Task 2 (baseline capture)
- **Issue:** `pnpm build` triggers pnpm 11's pre-run deps verification, which wanted to purge/reinstall `node_modules` and aborted without a TTY (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`)
- **Fix:** Ran `pnpm --config.verify-deps-before-run=false build` — skips the re-verification and builds against the existing (correct) install; no files or config changed
- **Verification:** Build completed, all 69 pages prerendered and served 200
- **Committed in:** n/a (no file changes)

**2. [Rule 3 - Blocking] Plan's Task 3 verify command read DATABASE_URL from the wrong .env**
- **Found during:** Task 3 (pre-flight audits)
- **Issue:** The plan's verification snippet greps `DATABASE_URL` from root `.env`, but local `DATABASE_URL` lives in `budget-explorer-web/.env` (root `.env` only has `DATABASE_URL_PROD`); also `$$` dollar-quoting in the inline SQL was expanded by bash as PID
- **Fix:** Read local URL from `budget-explorer-web/.env`; ran the constraint query via a temp SQL file with `psql -f` (deleted afterward). Same query, same expected-name diff check
- **Verification:** `LOCAL-MATCH` and `PROD-MATCH` — both DBs diff clean against the five expected names
- **Committed in:** n/a (read-only; temp file removed)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking, environment/tooling only)
**Impact on plan:** No scope change; no source-code or config deviations. All plan outcomes achieved as specified.

## Issues Encountered

None beyond the two blocking environment issues above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The regression gate (this plan's tool) is ready for every subsequent plan in Phases 7-13.
- `local-baseline` (pre-migration, 69 pages) exists and CANNOT be recreated after schema changes — migration work (07-02 onward) may now begin.
- Migration A (07-02) confirmed: simple backfill suffices, no stray actual-era rows in fresh-stage tables.
- Migration B (07-05) confirmed: use the five verified constraint names exactly as listed above; prod matches local.
- No schema changes of any kind were made in this plan (strictly pre-migration, as required).

## Self-Check: PASSED

- FOUND: budget-explorer-web/scripts/snapshot.mjs
- FOUND: budget-explorer-web/.snapshots/local-baseline/manifest.json (gitignored, 69 pages)
- FOUND: budget-explorer-web/.snapshots/local-baseline-check/manifest.json (gitignored)
- FOUND: commit ff32aff

---
*Phase: 07-stage-aware-schema-foundation*
*Completed: 2026-07-19*
