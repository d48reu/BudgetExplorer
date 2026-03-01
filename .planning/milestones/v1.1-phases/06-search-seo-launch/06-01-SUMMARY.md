---
phase: 06-search-seo-launch
plan: 01
subsystem: search, database
tags: [postgresql, tsvector, full-text-search, prisma, next.js, materialized-view]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: departments, strategic_areas, budget_descriptions, fiscal_years tables
  - phase: 04-department-pages-ai-year-over-year
    provides: AI-generated budget descriptions (summary, key_changes) for search indexing
provides:
  - glossary_terms database table with 11 seeded budget terms
  - search_index materialized view with weighted tsvector + GIN index
  - searchBudget() query function using websearch_to_tsquery via $queryRaw
  - /search page with grouped, type-appropriate result cards
  - SearchForm client component with native form submission
  - SearchResults component with department, strategic area, and glossary cards
  - CANONICAL_DOMAIN and POPULAR_SEARCH_SUGGESTIONS constants
  - Search entry in nav-config (navbar + mobile tab bar)
affects: [06-search-seo-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Materialized view for cross-entity search index (refreshed after pipeline runs)"
    - "websearch_to_tsquery for user-friendly full-text search (handles natural input)"
    - "$queryRaw with tagged template for parameterized raw SQL in Prisma"
    - "BigInt-to-string conversion in query layer before passing to components"
    - "Native form submission for search (works without JavaScript)"

key-files:
  created:
    - pipeline/migrations/004_search_index.sql
    - budget-explorer-web/src/lib/constants.ts
    - budget-explorer-web/src/app/search/page.tsx
    - budget-explorer-web/src/components/search/SearchForm.tsx
    - budget-explorer-web/src/components/search/SearchResults.tsx
  modified:
    - budget-explorer-web/prisma/schema.prisma
    - budget-explorer-web/src/lib/db/queries.ts
    - budget-explorer-web/src/lib/nav-config.ts

key-decisions:
  - "websearch_to_tsquery over to_tsquery for natural user input handling (no syntax errors)"
  - "BigInt operating_budget converted to string in query layer, not component layer"
  - "Native form action=/search for search submission (progressive enhancement, works without JS)"
  - "Magnifying glass emoji for search nav icon (matches existing icon style)"
  - "SearchResults is a server component (no 'use client') -- rendered on server, no hydration cost"

patterns-established:
  - "Materialized view pattern: create view in migration, REFRESH after pipeline runs"
  - "Raw SQL search pattern: $queryRaw with tagged template + BigInt-to-string mapping"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 6 Plan 1: Full-Text Search Summary

**PostgreSQL full-text search with weighted tsvector materialized view across departments, strategic areas, and glossary terms, served via /search page with grouped result cards**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T19:42:15Z
- **Completed:** 2026-03-01T19:45:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created glossary_terms table seeded with 11 budget terms from the existing in-code array
- Built search_index materialized view joining departments, strategic areas, and glossary terms with weighted tsvector (A=names, B=descriptions) and GIN index
- Implemented searchBudget() query function using websearch_to_tsquery for user-friendly full-text search
- Built /search page with type-appropriate grouped result cards: department cards (name + area badge + budget + AI snippet), strategic area cards (colored border + cents-per-dollar badge), glossary cards (term + definition)
- Added empty state with clickable popular search suggestions
- Added Search entry to navigation (visible in desktop navbar and mobile tab bar)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration -- glossary_terms table, search_index materialized view, GIN index** - `6fb7a40` (feat)
2. **Task 2: Search query function, constants, nav config, search page, and result components** - `b3bfa2f` (feat)

## Files Created/Modified
- `pipeline/migrations/004_search_index.sql` - glossary_terms table, search_index materialized view with weighted tsvector, GIN index
- `budget-explorer-web/prisma/schema.prisma` - Added glossary_terms model
- `budget-explorer-web/src/lib/constants.ts` - CANONICAL_DOMAIN and POPULAR_SEARCH_SUGGESTIONS exports
- `budget-explorer-web/src/lib/db/queries.ts` - searchBudget() function with SearchResult type
- `budget-explorer-web/src/lib/nav-config.ts` - Added Search entry to NAV_ITEMS
- `budget-explorer-web/src/app/search/page.tsx` - Server component reading ?q= param, calling searchBudget()
- `budget-explorer-web/src/components/search/SearchForm.tsx` - Client component with native form submission
- `budget-explorer-web/src/components/search/SearchResults.tsx` - Grouped result cards with DepartmentCard, StrategicAreaCard, GlossaryCard

## Decisions Made
- Used websearch_to_tsquery instead of to_tsquery per research -- handles natural user input without syntax errors on special characters
- Converted BigInt operating_budget to string in the query layer (searchBudget function) rather than in components, avoiding Next.js BigInt serialization issues
- SearchResults is a server component (not 'use client') since it receives data as props from the server page -- no hydration cost
- Used native form action="/search" for progressive enhancement (search works without JavaScript)
- Used magnifying glass emoji for search nav icon to match the existing icon style in nav-config

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BigInt serialization handled in query layer**
- **Found during:** Task 2 (searchBudget implementation)
- **Issue:** Plan noted BigInt serialization might fail when passing to client components. The operating_budget column returns bigint from $queryRaw which cannot be JSON-serialized by Next.js.
- **Fix:** Converted operating_budget to string in the searchBudget() function itself (query layer), making SearchResult.operating_budget typed as `string | null`. This avoids serialization issues entirely and keeps the type contract clean.
- **Files modified:** budget-explorer-web/src/lib/db/queries.ts
- **Verification:** TypeScript compiles, build succeeds, formatDollarsAbbreviated accepts string input
- **Committed in:** b3bfa2f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug prevention)
**Impact on plan:** Proactive fix for known BigInt serialization issue. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Search feature complete and accessible from navigation
- CANONICAL_DOMAIN constant created for use by upcoming SEO plan (06-02)
- After any data pipeline run, the search_index materialized view must be refreshed: `REFRESH MATERIALIZED VIEW search_index;`

## Self-Check: PASSED

All 9 files verified present. Both task commits (6fb7a40, b3bfa2f) verified in git log.

---
*Phase: 06-search-seo-launch*
*Completed: 2026-03-01*
