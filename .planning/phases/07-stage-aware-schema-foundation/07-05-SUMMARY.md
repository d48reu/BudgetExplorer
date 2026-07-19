---
phase: 07-stage-aware-schema-foundation
plan: 05
subsystem: database
tags: [postgres, expand-contract, migration, prisma-db-pull, snapshot-gate, stage-probe]

# Dependency graph
requires:
  - phase: 07-stage-aware-schema-foundation
    plan: 03
    provides: "schema.prisma hand-written to final post-B shape with 007's exact constraint map names; all reader queries stage-scoped"
  - phase: 07-stage-aware-schema-foundation
    plan: 04
    provides: "Pipeline fully stage-native (writers state stage explicitly, stage-based conflict targets, stage-scoped deletes)"
provides:
  - "pipeline/migrations/007_budget_stage_contract.sql applied locally: is_actual dropped, five stage-based unique keys live, transitional stage defaults dropped on all six tables, v_department_yoy + search_index recreated on stage='adopted'"
  - "Convergence proof: prisma db pull produces zero schema.prisma diff — the compile-time-gate handoff to Phase 8"
  - "budget-explorer-web/scripts/stage-probe.sql — reusable proposed-row leak detector for Phases 8-13"
  - "ROADMAP success criterion 3 proven: six proposed rows in a scratch clone change zero rendered bytes across all 69 pages"
affects: [07-06, phase-08, phase-09, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contract-migration ordering: DROP dependent views -> swap constraints -> DROP COLUMN -> DROP DEFAULTs -> recreate views (explicit drops, never CASCADE)"
    - "Stage-isolation probe drill: clone DB -> capture -> insert sentinel proposed rows -> rebuild -> capture -> normalized diff must be identical"

key-files:
  created:
    - pipeline/migrations/007_budget_stage_contract.sql
    - budget-explorer-web/scripts/stage-probe.sql
  modified: []

key-decisions:
  - "Grep gate refined: append-only migration SQL and pipeline/scripts/generate_historical_csvs.py excluded — the live-code is_actual allowlist is exactly transform/historical.py + seed_historical.py"
  - "Probe DB created via sudo -u postgres with OWNER budget_user (app role lacks CREATEDB); dropped as owner afterward"

patterns-established:
  - "stage-probe.sql is the standing Phases 8-13 leak-detector fixture: any missing stage filter fails the normalized crawl diff loudly"

requirements-completed: [DATA-01]

# Metrics
duration: 6min
completed: 2026-07-19
---

# Phase 7 Plan 05: Contract Migration and Convergence Summary

**Migration B (007) applied locally — is_actual is now unrepresentable (dropped columns, stage-based unique keys, no transitional defaults, views recreated on stage='adopted') — with full convergence proven: prisma db pull zero-diff, tsc/vitest/pipeline-verify green, post-B crawl byte-identical to both baselines, and six proposed sentinel rows changing zero rendered bytes**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-19T04:31:59Z
- **Completed:** 2026-07-19T04:37:53Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- `007_budget_stage_contract.sql` written and applied locally in the strict PG-safe order: drop `search_index` MV and `v_department_yoy` (the only two is_actual dependents, explicit drops, no CASCADE) -> swap all five unique keys to stage-based names (using the byte-for-byte constraint names 07-01 verified on local AND prod, including the two PG-truncated ones) -> drop `is_actual` from three tables -> drop transitional `stage` defaults on all six -> recreate both views verbatim from 003/005 with `stage = 'adopted'` predicates + GIN index. Post-apply state: 0 is_actual columns, 6 stage columns, 0 stage defaults, 5 `_stage_key` constraints, search_index populated, v_department_yoy serving 157 rows (exact adopted backfill count).
- **Convergence gate all green:** the phase's one sanctioned `prisma db pull` produced ZERO schema.prisma diff — 07-03's hand-written Deploy 1 schema equals post-B reality exactly, so Phase 8 gets a compile-time gate (any stale is_actual reference is now a TS compile error or a loud SQL failure). `prisma generate` + `tsc --noEmit` clean, vitest 18/18, `python -m pipeline verify` 13/13 against the contracted schema.
- **Snapshot identity:** fresh production build post-B, 69-page crawl (`local-post-B`), Tier-1 normalized diff 69/69 identical vs BOTH `local-baseline` (pre-migration) and `local-deploy1` — the entire expand/contract cycle changed nothing user-visible.
- **ROADMAP success criterion 3 proven directly:** `scripts/stage-probe.sql` inserts one proposed-stage sentinel row into each of the six staged tables (subselect FKs, $999,999,999,999 amounts, 99.9999 mills, PROBE LEAK text). Run against a scratch clone (`budget_explorer_probe`): all six INSERTs satisfied the new stage-inclusive unique keys with defaults gone, rebuild + recrawl, `probe-pre` vs `probe-post` normalized diff 69/69 identical. Not one byte of any page changed. Scratch DB dropped, fixture committed for Phases 8-13 reuse.
- Nothing pushed: 23 local commits ahead of origin; push waits for prod Migration A in 07-06.

## Task Commits

1. **Task 1: Write 007_budget_stage_contract.sql and apply locally** — `0733665` (feat)
2. **Task 2: Full convergence gate — db pull no-diff, tsc, grep, verify, snapshot** — no new commit (db pull produced zero diff by design; snapshots are gitignored; nothing to commit)
3. **Task 3: Proposed-row probe — one proposed row per table changes zero bytes** — `8d9ce9e` (feat)

## Files Created/Modified

- `pipeline/migrations/007_budget_stage_contract.sql` — contract migration: view drops, five stage-key swaps (exact live names), `DROP COLUMN is_actual` x3, six default drops, stage-predicate view recreation + GIN index
- `budget-explorer-web/scripts/stage-probe.sql` — six proposed-stage sentinel INSERTs, the standing stage-isolation leak detector

## Decisions Made

- Grep-gate command refined (see deviation 2): frozen migration SQL files and `pipeline/scripts/generate_historical_csvs.py` are excluded from the zero-reference gate — migrations are append-only history (007 itself is REQUIRED to contain `DROP COLUMN is_actual`) and the CSV generator keeps the CSV field name per 07-04's documented decision. The live-code allowlist is exactly the plan's two files.
- Probe scratch DB created as postgres superuser with `OWNER budget_user` since the app role lacks CREATEDB; owner privileges sufficed for the drop.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan verify commands read DATABASE_URL from the wrong .env**
- **Found during:** Task 1 (apply + verification)
- **Issue:** Plan snippets grep `DATABASE_URL` from root `.env`, which holds only `DATABASE_URL_PROD`; local URL lives in `budget-explorer-web/.env` (07-01's established pattern, pre-warned in the execution environment notes)
- **Fix:** Read the local URL from `budget-explorer-web/.env` and exported it for `python -m pipeline migrate`/`verify`; prod was never touched
- **Files modified:** none
- **Commit:** n/a (command adaptation only)

**2. [Rule 3 - Blocking] Task 2 grep-gate allowlist self-contradictory as written**
- **Found during:** Task 2 step 4
- **Issue:** The plan's `rg` command includes `pipeline/` wholesale, so it lists migrations 001-007 (007 must contain `DROP COLUMN is_actual` per the plan's own must_haves) and `pipeline/scripts/generate_historical_csvs.py` (07-04's documented CSV-generator keep) — the stated two-file expectation could never pass
- **Fix:** Added `--glob '!pipeline/migrations/**'` and `--glob '!pipeline/scripts/generate_historical_csvs.py'`; refined output is exactly `pipeline/load/seed_historical.py pipeline/transform/historical.py` (and seed_historical still has exactly its 3 allowlisted occurrences)
- **Files modified:** none
- **Commit:** n/a (verification command only; no live-code reference exists)

**3. [Rule 3 - Blocking] App DB role lacks CREATEDB for the probe clone**
- **Found during:** Task 3 step 2
- **Issue:** `CREATE DATABASE budget_explorer_probe TEMPLATE budget_explorer` as `budget_user` failed with permission denied
- **Fix:** Created the clone via `sudo -u postgres psql -c "CREATE DATABASE ... OWNER budget_user"`; the app role then owned it and dropped it cleanly at cleanup
- **Files modified:** none
- **Commit:** n/a (environment operation)

---

**Total deviations:** 3 auto-fixed (all Rule 3, environment/verification-command only)
**Impact on plan:** None on scope — all migration content, gates, and probe outcomes exactly as specified.

## Issues Encountered

- A `pkill -f 'next start'` belt-and-suspenders in the Task 2 server-teardown matched the invoking shell's own command string and SIGTERM'd it (exit 15) after all diffs had already passed; server shutdown was confirmed separately (port 3000 closed). Later cycles killed the tracked PID only.

## User Setup Required

None.

## Next Phase Readiness

- The local expand/contract cycle is COMPLETE. All three ROADMAP success criteria are proven locally: (1) zero visual change across the full crawl, (2) zero live-code is_actual references, (3) proposed rows are invisible to every page.
- 07-06 (prod rollout) is unblocked: Migration A then push (Deploy 1 web contract builds on Vercel), then Migration B — 007 uses constraint names verified identical on prod.
- `python -m pipeline load`/`run-all`/`seed-historical` are safe to run again locally: the stage-based ON CONFLICT targets now have their matching unique constraints.
- Phases 8-13 inherit two standing gates: the snapshot oracle (07-01) and `scripts/stage-probe.sql` (this plan) — rerun the probe drill any time a new reader query lands.
- Nothing pushed; 23 commits ahead of origin awaiting 07-06 (24 after this plan's docs commit).

## Self-Check: PASSED

- FOUND: pipeline/migrations/007_budget_stage_contract.sql (contains DROP COLUMN is_actual)
- FOUND: budget-explorer-web/scripts/stage-probe.sql (6 'proposed' INSERT lines)
- FOUND: commit 0733665 (Task 1)
- FOUND: commit 8d9ce9e (Task 3)
- Local DB: 0 is_actual columns / 6 stage columns / 5 stage keys / 0 stage defaults; 007 tracked in _migrations
- budget_explorer_probe dropped (0 rows in pg_database)

---
*Phase: 07-stage-aware-schema-foundation*
*Completed: 2026-07-19*
