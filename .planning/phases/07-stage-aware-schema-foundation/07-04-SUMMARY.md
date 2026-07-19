---
phase: 07-stage-aware-schema-foundation
plan: 04
subsystem: pipeline
tags: [python, psycopg2, budget-stage-enum, etl, expand-contract]

# Dependency graph
requires:
  - phase: 07-stage-aware-schema-foundation
    plan: 02
    provides: "Migration A applied locally (stage column exists + backfilled on all six tables)"
provides:
  - "pipeline/load/seed.py — stage-aware current-FY seeder: stage='adopted' param threaded through seed_all to all six seeding functions; every INSERT states stage explicitly; millage ON CONFLICT (fiscal_year_id, authority, stage); all FY DELETEs stage-scoped"
  - "pipeline/load/seed_historical.py — CSV is_actual bool mapped to 'actual'/'adopted' at the seed layer via _record_stage(); stage-based conflict target (fiscal_year_id, department_id, strategic_area_id, stage); stage-scoped deletes"
  - "pipeline/load/seed_descriptions.py — DELETE and INSERT scoped to literal stage='adopted'"
  - "pipeline/verify/checker.py — all 4 verification queries filter stage = 'adopted'; verify green 13/13 against post-A local DB"
  - "pipeline/generate/descriptions.py — current + prior-year CTEs filter db.stage = 'adopted'"
affects: [07-05, 07-06, 08, 13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stage-scoped delete-then-insert: every FY-scoped DELETE also filters stage, so loading one stage can never wipe another stage's rows (Phase 13 September-wipe protection)"
    - "Explicit stage on every INSERT — never rely on the transitional DB default (Migration B drops the defaults)"
    - "Legacy-bool boundary: _record_stage() in seed_historical.py is the single load-layer read of the CSV's is_actual column"

key-files:
  created: []
  modified:
    - pipeline/load/seed.py
    - pipeline/load/seed_historical.py
    - pipeline/load/seed_descriptions.py
    - pipeline/verify/checker.py
    - pipeline/generate/descriptions.py

key-decisions:
  - "Stage-scoped all 6 FY DELETEs in seed.py (plan said 5 — actual count is 6: dept x2, area x2, revenue, millage); intent 'stage-scope their DELETEs' applied uniformly"
  - "seed_historical.py deletes per stage present in the incoming file (sorted set of mapped values), keeping mixed-stage files safe"
  - "pipeline/scripts/generate_historical_csvs.py keeps its is_actual references — it generates the CSV files whose column intentionally keeps the is_actual name (same CSV-field category as transform/historical.py; not in plan scope)"

patterns-established:
  - "Same-file Edit calls must be sequential, not batched in parallel — parallel edits to one file via the UNC path raced and silently dropped edits (caught by verification grep)"

requirements-completed: [DATA-01]

# Metrics
duration: 8min
completed: 2026-07-19
---

# Phase 7 Plan 04: Stage-Native Pipeline Summary

**All five pipeline writer/reader files rewritten from is_actual to stage — seeders state stage explicitly on every INSERT with stage-based conflict targets and stage-scoped deletes, readers filter stage='adopted', and `python -m pipeline verify` reproduces 07-02's 13/13 green against the post-A local DB**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-19T04:24:11Z
- **Completed:** 2026-07-19T04:32:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `seed.py`: `stage: str = 'adopted'` threaded through `seed_all` into all six seeding functions (Phase 8 will pass `'proposed'`; default CLI behavior unchanged). All 4 `is_actual` INSERTs now write `stage`; the strategic-area and millage INSERTs gained explicit `stage` too, so no INSERT relies on the transitional DB default (Pitfall 6). Millage upsert now conflicts on `(fiscal_year_id, authority, stage)` — matching the constraint Migration B (007) will create.
- All 6 FY-scoped DELETEs in `seed.py` are stage-scoped — the Phase 13 September landmine (a wipe of one stage clobbering the other) is defused at the loader level.
- `seed_historical.py`: CSV files and `transform/historical.py` untouched; the load layer maps the legacy bool once via `_record_stage()` ('actual'/'adopted'), uses it in `seen_keys`, the INSERT, the stage-based conflict target, and per-stage-scoped deletes.
- `seed_descriptions.py`: DELETE and INSERT carry literal `stage = 'adopted'` (parameterization deferred to Phase 13 per scope lock).
- `checker.py` (4 sites) and `generate/descriptions.py` (2 sites) read `stage = 'adopted'`; `python -m pipeline verify` green 13/13 against the post-A local DB — exactly reproducing the is_actual checker's 07-02 result, proving the pipeline speaks stage correctly.
- Zero loaders executed during the dual-column window (only `verify` ran, which is safe); nothing pushed.

## Task Commits

1. **Task 1: Rewrite the three seeders to stage-native writes** — `a00a2e5` (feat)
2. **Task 2: Convert pipeline readers and prove verify green** — `477f388` (feat)

## Files Created/Modified

- `pipeline/load/seed.py` — stage param through seed_all + 6 seeders; explicit stage on all 7 INSERTs; stage-based millage conflict target; 6 stage-scoped DELETEs
- `pipeline/load/seed_historical.py` — `_record_stage()` bool-to-enum boundary; stage-native INSERT/conflict/deletes
- `pipeline/load/seed_descriptions.py` — literal `stage = 'adopted'` on DELETE and INSERT
- `pipeline/verify/checker.py` — 4 queries filter `stage = 'adopted'`
- `pipeline/generate/descriptions.py` — 2 CTEs filter `db.stage = 'adopted'`

## Decisions Made

- Scoped all 6 FY DELETEs in seed.py, not the plan's stated 5 — the plan miscounted (dept x2, area x2, revenue, millage); the must-have "stage-scope their DELETEs" was applied to every one.
- `seed_historical.py` computes the set of stages present in the incoming file and deletes per stage, so even a mixed-stage historical file reseeds safely.
- Left `pipeline/scripts/generate_historical_csvs.py` untouched: its `is_actual` references generate the CSV column that intentionally keeps that name (same category as `transform/historical.py`'s CSV-field parsing); modifying it was outside plan scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Parallel same-file edits raced and silently dropped changes**
- **Found during:** Task 1 (seed_historical.py rewrite)
- **Issue:** Batching multiple Edit calls to the same file in one message (via the `\\wsl.localhost` UNC path) caused a read-modify-write race — the `_record_stage` helper, the stage-scoped DELETE, and the stage/key line were silently lost while later edits survived; caught immediately by the verification grep showing the old `is_actual` key line
- **Fix:** Re-read the file's true on-disk state, re-applied the three lost edits strictly sequentially (one edit per message), re-verified all greps and compile
- **Files modified:** pipeline/load/seed_historical.py
- **Verification:** `grep -c is_actual` = 3 (docstring, helper doc, mapping line); `_record_stage` present; py_compile clean; seed.py audited and confirmed fully intact
- **Committed in:** a00a2e5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (tooling race, no scope change)
**Impact on plan:** None on scope — final file content is exactly what the plan specified; the race cost one repair cycle.

## Issues Encountered

None beyond the deviation above. The local DATABASE_URL export from `budget-explorer-web/.env` followed 07-02's established pattern (root `.env` holds only DATABASE_URL_PROD, never touched).

## User Setup Required

None.

## Next Phase Readiness

- Pipeline is fully stage-native. HARD RULE remains until 07-05 lands Migration B: do NOT run `python -m pipeline load` / `run-all` / `seed-historical` / `seed_descriptions` — the stage-based ON CONFLICT targets reference unique constraints that 007 creates. `verify` and `migrate` stay safe.
- Post-Migration-B, `python -m pipeline load` works unchanged (conflict targets match 007's constraint shapes).
- Remaining `is_actual` in pipeline/: `transform/historical.py` (CSV parsing, by design), the single `_record_stage` mapping in `seed_historical.py`, and `pipeline/scripts/generate_historical_csvs.py` (CSV generator — same CSV-field category, out of scope). 07-05 can drop the boolean columns without breaking any loader.
- Nothing pushed; push happens in 07-06 after prod Migration A.

## Self-Check: PASSED

- FOUND: pipeline/load/seed.py, seed_historical.py, seed_descriptions.py
- FOUND: pipeline/verify/checker.py, pipeline/generate/descriptions.py
- FOUND: commit a00a2e5 (Task 1), commit 477f388 (Task 2)
- `python -m pipeline verify` 13/13 PASS via stage queries

---
*Phase: 07-stage-aware-schema-foundation*
*Completed: 2026-07-19*
