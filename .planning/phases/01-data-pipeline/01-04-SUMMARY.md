---
phase: 01-data-pipeline
plan: 04
subsystem: pipeline, historical-data
tags: [historical-csv, appendix-c, data-generation, click, csv, budget-seeding, gap-closure]

# Dependency graph
requires:
  - phase: 01-03
    provides: historical CSV schema (template.csv), seed_historical.py, parse_historical_csv(), CLI commands (seed-historical, seed-historical-file)
provides:
  - pipeline/scripts/generate_historical_csvs.py for reproducible CSV generation from extracted Appendix C data
  - 4 historical CSV files (FY 2021-22 through FY 2024-25) with department operating budgets
  - 5 fiscal years of seeded department budget data in the database (264 historical + 90 current = 354 total department budget rows)
affects: [02-01-PLAN, 03-01-PLAN, 04-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [thousands-to-dollars conversion (remove commas, int, multiply by 1000), Appendix C column-to-fiscal-year mapping, CSV generation from JSON extraction output]

key-files:
  created:
    - pipeline/scripts/generate_historical_csvs.py
    - pipeline/data/historical/fy_2021_22_departments.csv
    - pipeline/data/historical/fy_2022_23_departments.csv
    - pipeline/data/historical/fy_2023_24_departments.csv
    - pipeline/data/historical/fy_2024_25_departments.csv
  modified:
    - pipeline/load/seed_historical.py

key-decisions:
  - "Historical budget values converted from Appendix C thousands format to whole dollars (e.g., 7,591 -> 7591000)"
  - "FY 2021-22 through FY 2023-24 marked is_actual=true (actual spending); FY 2024-25 marked is_actual=false (adopted budget)"
  - "Transfers line item correctly skipped during seeding (interagency transfer, not a real department)"
  - "v_department_yoy view shows budget-type rows only (FY 2024-25 and FY 2025-26) for year-over-year adopted budget comparison"

patterns-established:
  - "CSV generation from extracted JSON: read appendix_c.departments, map columns to fiscal years, convert units, write with csv.DictWriter"
  - "Historical data includes both actual and budget types, enabling trend analysis across actual spending and adopted budgets"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05]

# Metrics
duration: 4min
completed: 2026-02-28
---

# Phase 1 Plan 04: Historical CSV Generation and Seeding Summary

**Generated 4 historical CSV files from Appendix C extracted data and seeded 264 department budget rows across FY 2021-22 through FY 2024-25, completing 5-year fiscal coverage**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T19:24:46Z
- **Completed:** 2026-02-28T19:28:33Z
- **Tasks:** 2/2
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- Generated 4 historical CSV files from the already-extracted Appendix C data (81 departments, 4 fiscal years), converting thousands strings to whole dollars
- Seeded all 4 prior fiscal years into PostgreSQL: FY 2021-22 (64 depts), FY 2022-23 (67), FY 2023-24 (66), FY 2024-25 (67)
- Database now contains 5 fiscal years of department budget data (354 total rows): 3 actual spending years + 2 adopted budget years
- FY 2025-26 verification confirmed unaffected (13/13 checks passed, zero difference)
- CSV generation is fully reproducible (running script again produces identical output)

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate historical CSV files from extracted Appendix C data** - `ce77f15` (feat)
2. **Task 2: Seed historical data and verify 5-year coverage** - `50c5353` (fix -- includes auto-fix for ON CONFLICT constraint mismatch)

## Files Created/Modified
- `pipeline/scripts/generate_historical_csvs.py` - Click CLI script that reads extracted_data.json appendix_c.departments and generates 4 CSV files with fiscal year mapping and thousands-to-dollars conversion
- `pipeline/data/historical/fy_2021_22_departments.csv` - 65 rows, FY 2021-22 actual operating budgets ($7.02B total)
- `pipeline/data/historical/fy_2022_23_departments.csv` - 68 rows, FY 2022-23 actual operating budgets ($7.66B total)
- `pipeline/data/historical/fy_2023_24_departments.csv` - 67 rows, FY 2023-24 actual operating budgets ($8.12B total)
- `pipeline/data/historical/fy_2024_25_departments.csv` - 68 rows, FY 2024-25 adopted operating budgets ($9.04B total)
- `pipeline/load/seed_historical.py` - Fixed ON CONFLICT clause and added resolve_strategic_area() function

## Decisions Made
- Historical budget values from Appendix C are in thousands (e.g., "7,591" = $7,591,000). Script converts by removing commas, parsing to int, multiplying by 1000.
- FY 2021-22 through FY 2023-24 are actual spending (is_actual=true) per Appendix C column labels. FY 2024-25 is adopted budget (is_actual=false).
- "Transfers" line item from Appendix C is correctly skipped during seeding -- it represents interagency transfers, not a real department.
- The v_department_yoy view filters to is_actual=false, showing FY 2024-25 and FY 2025-26 for adopted-vs-adopted comparison. Actual spending data is queryable directly from department_budgets.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ON CONFLICT constraint mismatch in seed_historical.py**
- **Found during:** Task 2 (seeding historical data)
- **Issue:** The INSERT statement used `ON CONFLICT (fiscal_year_id, department_id, is_actual)` but the actual unique constraint on department_budgets is `(fiscal_year_id, department_id, strategic_area_id, is_actual)`. Missing strategic_area_id caused psycopg2.errors.InvalidColumnReference.
- **Fix:** Added `resolve_strategic_area()` function to resolve strategic area names to IDs. Updated INSERT to include strategic_area_id column. Updated ON CONFLICT to match the actual unique constraint.
- **Files modified:** pipeline/load/seed_historical.py
- **Verification:** Seeding completed successfully for all 4 fiscal years. FY 2025-26 verification still passes (13/13 checks).
- **Committed in:** `50c5353`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential bug fix to make seeding work. No scope creep.

## Issues Encountered
- The seed_historical.py ON CONFLICT clause did not match the actual database constraint (which includes strategic_area_id). This was a pre-existing bug in the historical seeding infrastructure from Plan 03 that was never exercised until actual CSV data was available for seeding. Fixed by adding strategic area resolution.

## User Setup Required

None - no external service configuration required. Database must be running with DATABASE_URL set in .env for pipeline commands.

## Next Phase Readiness
- Phase 1 (Data Pipeline) is fully complete with all gaps closed
- Database contains verified 5-year budget data: FY 2021-22 through FY 2025-26
- 354 department budget rows across 5 fiscal years ready for frontend consumption
- Historical CSV generation is reproducible from extracted_data.json
- Ready for Phase 2: App Foundation + Design System

## Self-Check: PASSED

All 6 created/modified files verified on disk. Both commits (ce77f15, 50c5353) verified in git log.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-28*
