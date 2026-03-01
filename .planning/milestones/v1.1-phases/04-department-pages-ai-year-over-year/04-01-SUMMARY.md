---
phase: 04-department-pages-ai-year-over-year
plan: 01
subsystem: ai, database
tags: [anthropic, claude-api, pydantic, python, pipeline, ai-descriptions]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: "PostgreSQL schema with departments, fiscal_years, department_budgets, budget_descriptions tables"
  - phase: 01-data-pipeline
    provides: "pipeline/config.py with DATABASE_URL and CURRENT_FISCAL_YEAR"
  - phase: 01-data-pipeline
    provides: "pipeline/load/db.py with get_db_connection context manager"
provides:
  - "pipeline/generate/descriptions.py -- batch AI description generator using Claude API"
  - "pipeline/load/seed_descriptions.py -- idempotent seeder from reviewed JSON to budget_descriptions table"
  - "53 department descriptions seeded in budget_descriptions table (summary, detailed_description, key_changes)"
affects: [04-department-pages-ai-year-over-year, 06-search-seo-launch]

# Tech tracking
tech-stack:
  added: [anthropic, pydantic]
  patterns: [structured-output-with-fallback, batch-api-with-delay, idempotent-delete-insert-seeding, human-review-gate]

key-files:
  created:
    - pipeline/generate/__init__.py
    - pipeline/generate/descriptions.py
    - pipeline/load/seed_descriptions.py
    - pipeline/data/descriptions/.gitkeep
    - pipeline/data/descriptions/fy_2025_26_descriptions.json
  modified:
    - requirements.txt

key-decisions:
  - "Use messages.parse() with response_model for structured output, falling back to messages.create() + manual JSON extraction for older SDK versions"
  - "DISTINCT ON (d.id) in department query to prevent duplicate rows from v_department_yoy join"
  - "Human review gate between generation and seeding ensures AI output quality before database insert"

patterns-established:
  - "Structured output pattern: try SDK parse() first, catch TypeError/AttributeError, fall back to manual JSON extraction with Pydantic validation"
  - "Batch API pattern: iterate departments with 1-second delay, per-department error handling, progress printing"
  - "Human review gate: generate JSON -> human reviews/edits -> seed to database (never direct API-to-DB)"

requirements-completed: [AI-01, AI-02, AI-03, AI-04]

# Metrics
duration: multi-session (scripting ~3min, human review + seeding ~30min)
completed: 2026-03-01
---

# Phase 4 Plan 1: AI Description Pipeline Summary

**Anthropic Claude API batch pipeline generating plain-English department descriptions with Pydantic structured output, human review gate, and idempotent database seeding -- 53 descriptions seeded**

## Performance

- **Duration:** Multi-session (Task 1 automated ~3 min, Task 2 human-driven ~30 min)
- **Started:** 2026-03-01
- **Completed:** 2026-03-01
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- Created batch AI description generator using Anthropic Claude API with civic plain-English system prompt enforcing no-jargon, factual, dollar-amount-specific tone
- Implemented Pydantic structured output via `messages.parse()` with automatic fallback to manual JSON extraction for SDK compatibility
- Created idempotent database seeder using DELETE-then-INSERT pattern for budget_descriptions table
- Successfully generated and seeded 53 department descriptions (more than the planned 35 due to multi-year fiscal data) after human review

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AI description generation and seeding scripts** - `0dc31d9` (feat)
   - Bugfix follow-up: `1246c3c` (fix: SDK parse() param and deduplicate query)
2. **Task 2: Generate, review, and seed AI descriptions** - Human action (no commit -- runtime data seeding)

## Files Created/Modified
- `pipeline/generate/__init__.py` - Package init for generate module
- `pipeline/generate/descriptions.py` - Batch AI description generator with Claude API integration, Pydantic models, system prompt, and per-department error handling
- `pipeline/load/seed_descriptions.py` - Idempotent seeder reading reviewed JSON and inserting into budget_descriptions table
- `pipeline/data/descriptions/.gitkeep` - Directory placeholder for generated JSON output
- `pipeline/data/descriptions/fy_2025_26_descriptions.json` - Generated descriptions (53 departments) for human review
- `requirements.txt` - Added anthropic and pydantic dependencies

## Decisions Made
- **SDK structured output approach:** Used `messages.parse()` with `response_model` parameter (not `output_type` as originally planned) based on actual SDK API. Added TypeError catch alongside AttributeError for robust fallback.
- **Query deduplication:** Added `DISTINCT ON (d.id)` to the department fetch query to prevent duplicate rows when joining with v_department_yoy view (which can have multiple fiscal year rows per department).
- **53 vs 35 descriptions:** The database contained 53 department entries (not just 35) due to multi-year fiscal data or additional departmental subdivisions. All 53 were successfully generated and seeded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SDK parse() parameter name**
- **Found during:** Task 2 (generation run)
- **Issue:** Plan specified `output_type=DepartmentDescription` but the Anthropic SDK uses `response_model` parameter
- **Fix:** Changed `output_type` to `response_model` in the `messages.parse()` call
- **Files modified:** pipeline/generate/descriptions.py
- **Verification:** Generation script ran successfully against Claude API
- **Committed in:** 1246c3c

**2. [Rule 1 - Bug] Added TypeError to SDK fallback catch**
- **Found during:** Task 2 (generation run)
- **Issue:** SDK could raise TypeError (not just AttributeError) when parse() method signature didn't match
- **Fix:** Added TypeError to the except clause for the fallback path
- **Files modified:** pipeline/generate/descriptions.py
- **Committed in:** 1246c3c

**3. [Rule 1 - Bug] Deduplicated department query results**
- **Found during:** Task 2 (generation run)
- **Issue:** Department fetch query returned duplicate rows due to v_department_yoy join producing multiple fiscal year entries per department
- **Fix:** Added `DISTINCT ON (d.id)` to the SQL query
- **Files modified:** pipeline/generate/descriptions.py
- **Committed in:** 1246c3c

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All fixes were necessary for correct pipeline execution. No scope creep.

## Issues Encountered
- The actual department count in the database was 53, not the planned 35. This is not a bug -- the database reflects all departmental entities in the Miami-Dade budget. All 53 were generated and seeded successfully.

## User Setup Required

**External service configured during execution.** The user:
- Set `ANTHROPIC_API_KEY` in `.env` file (from Anthropic Console)
- Ran `python -m pipeline.generate.descriptions` to generate descriptions via Claude API
- Reviewed generated JSON output for tone and accuracy
- Ran `python -m pipeline.load.seed_descriptions` to seed into database
- Verified 53 descriptions in budget_descriptions table

## Next Phase Readiness
- AI descriptions are seeded and available for display on department detail pages (Plan 04-02, already complete)
- Description data available for full-text search indexing in Phase 6
- Pipeline can be re-run for future fiscal years by updating CURRENT_FISCAL_YEAR in config

## Self-Check: PASSED

- All 5 created files verified present on disk
- Both commits (0dc31d9, 1246c3c) verified in git log

---
*Phase: 04-department-pages-ai-year-over-year*
*Completed: 2026-03-01*
