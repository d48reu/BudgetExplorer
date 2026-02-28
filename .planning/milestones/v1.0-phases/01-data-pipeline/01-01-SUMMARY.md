---
phase: 01-data-pipeline
plan: 01
subsystem: database, pipeline
tags: [pdfplumber, psycopg2, click, postgresql, pdf-extraction, etl]

# Dependency graph
requires:
  - phase: none
    provides: first phase, no dependencies
provides:
  - pipeline/ Python package with CLI, config, and db modules
  - Database schema migrations (001_initial_schema.sql, 002_department_aliases.sql)
  - 7 PDF extraction modules for all Budget in Brief data sections
  - extract_all() function combining all extractors
  - Published totals JSON for verification baseline
affects: [01-02-PLAN, 01-03-PLAN, 02-01-PLAN]

# Tech tracking
tech-stack:
  added: [pdfplumber 0.11.9, psycopg2-binary 2.9.11, python-dotenv 1.2.1, click 8.1+, requests, Pillow, pytest]
  patterns: [per-section PDF extraction with crop + table_settings, context manager DB connections, numbered SQL migrations with tracking table, Click CLI with subcommands]

key-files:
  created:
    - pipeline/__init__.py
    - pipeline/__main__.py
    - pipeline/config.py
    - pipeline/cli.py
    - pipeline/load/db.py
    - pipeline/extract/__init__.py
    - pipeline/extract/pdf_reader.py
    - pipeline/extract/strategic_areas.py
    - pipeline/extract/departments.py
    - pipeline/extract/revenue.py
    - pipeline/extract/expenditures.py
    - pipeline/extract/millage.py
    - pipeline/extract/penny.py
    - pipeline/migrations/001_initial_schema.sql
    - pipeline/migrations/002_department_aliases.sql
    - pipeline/data/published_totals.json
    - requirements.txt
    - .env.example
    - .gitignore
  modified: []

key-decisions:
  - "Added .gitignore with Python, IDE, OS, and data file exclusions (auto-fix: blocking issue for clean commits)"
  - "Added pipeline/__main__.py to enable python -m pipeline CLI invocation"
  - "Used IF NOT EXISTS for all CREATE TABLE/INDEX in migrations for idempotent re-runs"
  - "Extraction modules use known-name matching sets rather than positional parsing for robustness"
  - "Penny extractor supports both table and text-based extraction (graphic vs table uncertainty)"

patterns-established:
  - "Per-section extraction: each PDF section has its own module with tunable page/bbox constants and table_settings"
  - "Context manager DB connections: get_db_connection() with auto-commit/rollback"
  - "Numbered SQL migrations: 001_, 002_ files tracked via _migrations table"
  - "Raw string extraction: extractors return raw PDF strings, transform module converts to cents"
  - "Known-name matching: extractors match against sets of known entity names for robust parsing"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-05]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 1 Plan 01: Project Scaffolding and PDF Extraction Summary

**Pipeline package with Click CLI, PostgreSQL schema migrations (all 13 tables + seed data), and 7 pdfplumber extraction modules covering strategic areas, departments, revenue, expenditures, millage, and penny breakdown**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T15:33:37Z
- **Completed:** 2026-02-28T15:39:18Z
- **Tasks:** 2
- **Files created:** 23

## Accomplishments
- Created full pipeline/ Python package with config, CLI, and database modules
- Built 001_initial_schema.sql covering all 13 tables (fiscal_years, strategic_areas, departments, revenue_sources, etc.) with seed data for 9 strategic areas, 35 departments, 7 revenue sources, and 9 expenditure categories, plus indexes and views
- Built 002_department_aliases.sql for cross-year department name mapping (2025 constitutional offices reorganization)
- Implemented 7 extraction modules, each with tunable page/bbox constants and debug output capability
- Created extract_all() that combines all extractors into a unified dict with keys: strategic_areas, departments, revenue, expenditures, millage, penny

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffolding, configuration, and database migrations** - `7b636b0` (feat)
2. **Task 2: PDF extraction modules for all Budget in Brief data sections** - `ad7605a` (feat)

## Files Created/Modified
- `requirements.txt` - Python dependencies (pdfplumber, psycopg2-binary, click, etc.)
- `.env.example` - Environment variable template (DATABASE_URL, PDF_PATH, PDF_URL)
- `.gitignore` - Git exclusions for Python, data, and OS files
- `pipeline/__init__.py` - Package init
- `pipeline/__main__.py` - Enable `python -m pipeline` invocation
- `pipeline/config.py` - Environment config with published budget totals as constants
- `pipeline/cli.py` - Click CLI with extract, load, verify, run-all stub commands
- `pipeline/load/db.py` - get_db_connection() context manager and run_migrations() function
- `pipeline/migrations/001_initial_schema.sql` - Full database schema with all 13 tables, seed data, indexes, and views
- `pipeline/migrations/002_department_aliases.sql` - Department aliases for cross-year mapping
- `pipeline/data/published_totals.json` - FY 2025-26 known-good totals for verification
- `pipeline/extract/__init__.py` - Import all extractors + extract_all() function
- `pipeline/extract/pdf_reader.py` - PDF download, open, and inspect utilities
- `pipeline/extract/strategic_areas.py` - Strategic area budget table extraction
- `pipeline/extract/departments.py` - Department budget extraction with strategic area grouping
- `pipeline/extract/revenue.py` - Revenue source extraction with name normalization
- `pipeline/extract/expenditures.py` - Expenditure category extraction
- `pipeline/extract/millage.py` - Millage rate extraction with county/non-county flagging
- `pipeline/extract/penny.py` - Penny/dollar breakdown extraction (table + text modes)

## Decisions Made
- Added `__main__.py` to support `python -m pipeline` invocation pattern
- Used `IF NOT EXISTS` for all CREATE TABLE/INDEX statements in migrations for safe re-runs
- Extraction modules match against known entity name sets rather than relying on positional parsing, for robustness against PDF layout variations
- Penny extractor supports both table-based and text-based extraction modes, since the penny data format (table vs graphic) is unknown until the PDF is inspected
- All extraction modules return raw string values; conversion to cents is deferred to the transform module (Plan 02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gitignore for clean commits**
- **Found during:** Task 1 (commit staging)
- **Issue:** No .gitignore existed, causing .venv/, Zone.Identifier files, and debug output to be staged
- **Fix:** Created .gitignore with Python, IDE, OS, data, and debug exclusions
- **Files modified:** .gitignore
- **Verification:** git status shows clean untracked file list
- **Committed in:** 7b636b0 (Task 1 commit)

**2. [Rule 3 - Blocking] Added pipeline/__main__.py for module invocation**
- **Found during:** Task 1 (CLI verification)
- **Issue:** `python -m pipeline.cli --help` verification requires __main__.py for the `python -m pipeline` pattern
- **Fix:** Created __main__.py importing and calling cli()
- **Files modified:** pipeline/__main__.py
- **Verification:** `python -m pipeline.cli --help` works correctly
- **Committed in:** 7b636b0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes were necessary for basic project functionality. No scope creep.

## Issues Encountered
- pip install failed with PEP 668 externally managed environment error; resolved with `--break-system-packages` flag (python3-venv package not available for virtual environment creation)

## User Setup Required

None - no external service configuration required. Database connection only needed for Plan 02 (loading data).

## Next Phase Readiness
- Pipeline package structure complete and importable
- Extraction modules ready for PDF inspection and constant tuning
- CLI stubs ready to wire in Plan 02
- Migration files ready to run against PostgreSQL in Plan 02
- Next step: Download the Budget in Brief PDF, run inspect_pdf() to determine page numbers and bboxes, then tune extraction constants

## Self-Check: PASSED

All 19 created files verified on disk. Both task commits (7b636b0, ad7605a) verified in git log.

---
*Phase: 01-data-pipeline*
*Completed: 2026-02-28*
