---
phase: 04-department-pages-ai-year-over-year
plan: 02
subsystem: ui
tags: [next.js, d3, static-generation, department-pages, horizontal-bar-chart, prisma]

# Dependency graph
requires:
  - phase: 03-budget-visualizations-explorer
    provides: ChartContainer, DataTableToggle, Card, Breadcrumbs, chart-utils, format utilities
provides:
  - Department detail page with static generation for all 35 departments
  - SerializedDepartmentDetail, SerializedExpenditure, SerializedYoYData types
  - getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY queries
  - StatCards, AiDescription, KeyChangesCallout, RelatedDepartments components
  - ExpenditureBreakdown horizontal bar chart with D3 scaleBand/scaleLinear
affects: [04-03-PLAN (YoY chart uses getDepartmentYoY query and page placeholder)]

# Tech tracking
tech-stack:
  added: []
  patterns: [horizontal-bar-chart-d3, department-page-static-generation, parallel-data-fetching]

key-files:
  created:
    - budget-explorer-web/src/components/department/StatCards.tsx
    - budget-explorer-web/src/components/department/AiDescription.tsx
    - budget-explorer-web/src/components/department/KeyChangesCallout.tsx
    - budget-explorer-web/src/components/department/RelatedDepartments.tsx
    - budget-explorer-web/src/components/charts/ExpenditureBreakdown.tsx
  modified:
    - budget-explorer-web/src/types/budget.ts
    - budget-explorer-web/src/lib/db/queries.ts
    - budget-explorer-web/src/app/department/[slug]/page.tsx

key-decisions:
  - "Added area.id to SerializedDepartmentDetail to enable direct getRelatedDepartments call without extra DB lookup"
  - "getDepartmentYoY query created in data layer even though chart is Plan 03 -- keeps queries centralized per plan guidance"
  - "ExpenditureBreakdown uses dynamic chart height (data.length * 44) rather than fixed height for varying category counts"

patterns-established:
  - "Department page parallel fetch pattern: detail first (for IDs), then expenditures + YoY + related in Promise.all"
  - "Horizontal bar chart with D3 scaleBand on Y-axis and scaleLinear on X-axis for ranked category breakdowns"
  - "Graceful null degradation: 'Description coming soon' when AI descriptions not yet seeded"

requirements-completed: [PAGE-04, VIZ-06, AI-04]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 4 Plan 02: Department Pages Summary

**Full department detail pages with static generation, stat cards, AI description expand/collapse, key changes callout, expenditure horizontal bar chart, and related departments for all 35 departments**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T06:30:34Z
- **Completed:** 2026-03-01T06:33:34Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Built complete department detail page replacing stub with 7-section layout per CONTEXT.md spec
- Converted department pages from force-dynamic to generateStaticParams for all 35 departments
- Created ExpenditureBreakdown horizontal bar chart with D3 opacity gradient and strategic area color
- Added 4 data queries (getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY) with BigInt serialization
- Created 4 department-specific components: StatCards, AiDescription with expand/collapse, KeyChangesCallout, RelatedDepartments

## Task Commits

Each task was committed atomically:

1. **Task 1: Add types and data queries** - `52c6e1b` (feat)
2. **Task 2: Create department page components and rewrite page** - `8688450` (feat)
3. **Task 3: Create ExpenditureBreakdown horizontal bar chart** - `3443ee3` (feat)

## Files Created/Modified
- `budget-explorer-web/src/types/budget.ts` - Added SerializedBudgetDescription, SerializedDepartmentDetail, SerializedExpenditure, SerializedYoYData types
- `budget-explorer-web/src/lib/db/queries.ts` - Added getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY
- `budget-explorer-web/src/app/department/[slug]/page.tsx` - Full rewrite with generateStaticParams, parallel data fetching, 7-section layout
- `budget-explorer-web/src/components/department/StatCards.tsx` - 4-metric stat card grid (operating, capital, employees, YoY change)
- `budget-explorer-web/src/components/department/AiDescription.tsx` - Client component with expand/collapse and fiscal year/date metadata
- `budget-explorer-web/src/components/department/KeyChangesCallout.tsx` - Colored callout box with area color left border
- `budget-explorer-web/src/components/department/RelatedDepartments.tsx` - Sibling department cards grid with "More in [Area]" header
- `budget-explorer-web/src/components/charts/ExpenditureBreakdown.tsx` - D3 horizontal bar chart with DataTableToggle accessibility

## Decisions Made
- Added area.id to SerializedDepartmentDetail to avoid extra DB lookup when fetching related departments
- Created getDepartmentYoY in the data layer alongside other queries even though the YoY chart component is Plan 03 -- keeps all department queries centralized
- Used dynamic chart height (data.length * 44px, min 300px) for ExpenditureBreakdown to handle departments with varying numbers of expenditure categories

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added area.id to SerializedDepartmentDetail type**
- **Found during:** Task 2 (page component creation)
- **Issue:** Plan specified area with name/slug/color but getRelatedDepartments needs areaId (number), not slug
- **Fix:** Added id field to the area object in SerializedDepartmentDetail and populated it in getDepartmentDetail query
- **Files modified:** budget-explorer-web/src/types/budget.ts, budget-explorer-web/src/lib/db/queries.ts
- **Verification:** TypeScript compiles clean, page uses detail.area.id directly
- **Committed in:** 8688450 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correctness -- without area.id the page would need an extra DB query to resolve area slug to ID. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Department page layout is complete with placeholder for YoY chart (Plan 03 adds the chart component)
- getDepartmentYoY query is ready for Plan 03 to consume
- All 35 department pages will be statically generated at build time
- AI descriptions display gracefully when not yet seeded ("Description coming soon")

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 04-department-pages-ai-year-over-year*
*Completed: 2026-03-01*
