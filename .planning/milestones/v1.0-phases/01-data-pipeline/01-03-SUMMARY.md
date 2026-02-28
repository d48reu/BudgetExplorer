---
phase: 01-data-pipeline
plan: 03
subsystem: pipeline, verification, historical-data
tags: [budget-verification, diff-report, historical-csv, department-aliases, idempotent-seeding, click, psycopg2]

# Dependency graph
requires:
  - phase: 01-02
    provides: transform module (dollars_to_cents), seed module, wired CLI commands
provides:
  - pipeline/verify/checker.py with two-level budget verification and diff reporting
  - pipeline/transform/historical.py with CSV/JSON parser for prior fiscal year data
  - pipeline/load/seed_historical.py with department alias resolution and historical seeding
  - pipeline/data/published_totals.json with strategic area subtotals for verification
  - Verified FY 2025-26 data: 90 department budgets, 55 departments, 9 strategic areas, 7 millage rates, 7 revenue sources, 9 penny breakdown entries
affects: [02-01-PLAN, 04-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-level verification (grand total + strategic area subtotals), tolerance-based comparison (100_000 cents = $1000), historical CSV schema with department alias resolution, penny key normalization for both naming conventions]

key-files:
  created:
    - pipeline/verify/__init__.py
    - pipeline/verify/checker.py
    - pipeline/transform/historical.py
    - pipeline/load/seed_historical.py
    - pipeline/data/historical/template.csv
    - pipeline/data/historical/README.md
    - tests/test_verify.py
  modified:
    - pipeline/cli.py
    - pipeline/data/published_totals.json
    - pipeline/load/seed.py

key-decisions:
  - "Verification tolerance set at +/-$1,000 (100,000 cents) per user requirement"
  - "Verification runs as both standalone CLI command and final step of run-all pipeline"
  - "Historical CSV uses whole dollars (loader converts to cents) to keep manual data entry simple"
  - "Department alias resolution uses cascading strategy: exact name -> slug -> alias table lookup"
  - "Penny breakdown seeding supports both naming conventions (key normalization) for robustness"

patterns-established:
  - "Two-level verification: Level 1 checks grand total, Level 2 checks each strategic area subtotal"
  - "Diff report pattern: PASS/FAIL per level with expected vs actual amounts and difference"
  - "Pipeline halt-on-failure: verification failure triggers sys.exit(1) with detailed report"
  - "Historical data schema: CSV with fiscal_year, strategic_area, department_name, department_alias, operating_budget, capital_budget, employee_count, is_actual"

requirements-completed: [DATA-01, DATA-04]

# Metrics
duration: 12min
completed: 2026-02-28
---

# Phase 1 Plan 03: Verification and Historical Data Summary

**Two-level budget verification system confirming $13,233,238,000 grand total and all 9 strategic area subtotals, plus historical CSV/JSON framework with department alias resolution for prior fiscal years**

## Performance

- **Duration:** 12 min (across multiple sessions due to checkpoint)
- **Started:** 2026-02-28
- **Completed:** 2026-02-28
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files created:** 7
- **Files modified:** 3

## Accomplishments
- Built two-level verification system: Level 1 checks grand total against $13,233,238,000, Level 2 checks each of 9 strategic area subtotals -- all within +/-$1,000 tolerance
- Created diff report generator showing PASS/FAIL per level with formatted dollar amounts, differences, and percentages
- Built historical data framework with CSV template, CSV/JSON parser, and department alias resolution for seeding prior fiscal years (FY 2021-22 through FY 2024-25)
- End-to-end pipeline verified: 13/13 checks passed with zero difference, database contains 90 department budgets, 55 departments, 9 strategic areas, 7 millage rates, 7 revenue sources, 9 penny entries

## Task Commits

Each task was committed atomically:

1. **Task 1: Two-level verification system with diff report** - `865fa15` (feat)
2. **Task 2: Historical data framework with CSV schema and department alias resolution** - `0dfeffa` (feat)
3. **Task 3: Verify end-to-end pipeline produces correct data** - checkpoint:human-verify (approved, no separate commit)

**Additional commits during execution:**
- `fd77ac7` - fix(extract): tune PDF extractors for Budget in Brief infographic layout
- `7a96921` - feat(pipeline): integrate Appendix C + J for authoritative budget data
- `ec0ec44` - fix(01-03): fix penny data seeding by supporting both key conventions

## Files Created/Modified
- `pipeline/verify/__init__.py` - Module init exposing run_verification and verify_budget_totals
- `pipeline/verify/checker.py` - VerificationResult dataclass, verify_budget_totals(), generate_diff_report(), run_verification()
- `pipeline/transform/historical.py` - parse_historical_csv(), parse_historical_json(), detect_format()
- `pipeline/load/seed_historical.py` - resolve_department(), seed_historical_year(), seed_all_historical()
- `pipeline/data/historical/template.csv` - CSV schema template for manual historical data entry
- `pipeline/data/historical/README.md` - Documentation for historical data CSV format and department alias conventions
- `tests/test_verify.py` - Unit tests for verification logic and tolerance boundary conditions
- `pipeline/cli.py` - Added verify, seed-historical, seed-historical-file commands; wired verify into run-all
- `pipeline/data/published_totals.json` - Updated with strategic area subtotals for Level 2 verification
- `pipeline/load/seed.py` - Fixed penny data seeding to support both key naming conventions

## Decisions Made
- Verification tolerance set at +/-$1,000 (100,000 cents) as specified by user requirement -- strict enough to catch errors, loose enough for rounding
- Verification runs both as standalone `verify` command and as the final step of `run-all`, halting with sys.exit(1) on failure
- Historical CSV format uses whole dollars rather than cents to keep manual data entry human-friendly
- Department alias resolution cascades through exact name, slug match, and alias table lookup to handle renamed departments across fiscal years
- Penny breakdown seeding normalizes keys to handle both naming conventions (e.g., "Neighborhood and Infrastructure" vs slug-based keys)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tuned PDF extractors for Budget in Brief infographic layout**
- **Found during:** Task 3 preparation (end-to-end testing)
- **Issue:** PDF extractors were calibrated for a different page layout than the actual Budget in Brief PDF infographic format
- **Fix:** Adjusted extraction parameters across all extractors for the actual PDF structure
- **Files modified:** pipeline/extract/departments.py, pipeline/extract/millage.py, pipeline/extract/penny.py, pipeline/extract/revenue.py, pipeline/extract/strategic_areas.py
- **Committed in:** `fd77ac7`

**2. [Rule 3 - Blocking] Integrated Appendix C + J for authoritative budget data**
- **Found during:** Task 3 preparation (end-to-end testing)
- **Issue:** Budget in Brief summary pages alone did not provide sufficient granularity for department-level budget data; needed Appendix C (department budgets) and Appendix J (penny breakdown) as authoritative sources
- **Fix:** Added appendix_c.py and appendix_j.py extractors, migration for schema updates, and integrated into pipeline
- **Files modified:** pipeline/extract/appendix_c.py, pipeline/extract/appendix_j.py, pipeline/extract/__init__.py, pipeline/config.py, pipeline/migrations/003_appendix_integration.sql
- **Committed in:** `7a96921`

**3. [Rule 1 - Bug] Fixed penny data seeding key mismatch**
- **Found during:** Task 3 verification checkpoint
- **Issue:** Penny breakdown data keys from extraction did not match the expected keys in the seeding module due to different naming conventions
- **Fix:** Added key normalization in seed.py to support both naming conventions for penny breakdown entries
- **Files modified:** pipeline/load/seed.py
- **Committed in:** `ec0ec44`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes were necessary for the end-to-end pipeline to produce correct, verified data. No scope creep -- these were essential corrections to make the pipeline work with the actual PDF source.

## Issues Encountered
- The Budget in Brief PDF required both summary pages and appendix pages (C and J) to extract all required data at sufficient granularity. This was discovered during end-to-end testing and resolved by adding appendix extractors.

## User Setup Required

None - no external service configuration required. Database must be running with DATABASE_URL set in .env for pipeline commands.

## Next Phase Readiness
- Phase 1 (Data Pipeline) is fully complete: extract, transform, load, and verify all working end-to-end
- Database contains verified FY 2025-26 budget data ready for frontend consumption
- Historical data framework ready for user-provided CSV files for FY 2021-22 through FY 2024-25
- Next phase: Phase 2 (App Foundation + Design System) -- Next.js scaffold, Prisma data layer, homepage shell
- DATA-04 (historical data for 5 fiscal years) is partially satisfied: framework exists, FY 2025-26 data seeded, prior years awaiting user-provided CSV files

## Self-Check: PASSED

All 10 created/modified files verified on disk. All 5 commits (865fa15, 0dfeffa, fd77ac7, 7a96921, ec0ec44) verified in git log.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-28*
