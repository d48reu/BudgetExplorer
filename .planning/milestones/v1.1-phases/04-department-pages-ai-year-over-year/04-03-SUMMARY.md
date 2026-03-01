---
phase: 04-department-pages-ai-year-over-year
plan: 03
subsystem: ui
tags: [next.js, d3, vertical-bar-chart, year-over-year, department-pages]

# Dependency graph
requires:
  - phase: 04-department-pages-ai-year-over-year
    provides: getDepartmentYoY query, department page layout with YoY placeholder, SerializedYoYData type
  - phase: 03-budget-visualizations-explorer
    provides: ChartContainer, DataTableToggle, chart-utils, format utilities
provides:
  - YearOverYearChart D3 vertical bar chart component for budget history comparison
  - Complete 7-section department page layout (all sections now wired)
affects: [05-tax-calculator, 06-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [vertical-bar-chart-d3, percentage-change-badge-svg]

key-files:
  created:
    - budget-explorer-web/src/components/charts/YearOverYearChart.tsx
  modified:
    - budget-explorer-web/src/app/department/[slug]/page.tsx

key-decisions:
  - "Data availability note rendered outside DataTableToggle so it is visible in both chart and table modes"
  - "Badge width computed dynamically from percentage text length (charCount * 7 + 12px) for clean SVG sizing"

patterns-established:
  - "Vertical bar chart with D3 scaleBand on X-axis (fiscal years) + scaleLinear on Y-axis (budget amounts)"
  - "SVG percentage badge: colored rounded rect with white text, positioned above value label on current year bar"

requirements-completed: [VIZ-05, PAGE-06]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 4 Plan 03: Year-over-Year Chart Summary

**D3 vertical bar chart comparing up to 5 fiscal years of department budgets with strategic area color highlighting and percentage change badge**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T17:13:55Z
- **Completed:** 2026-03-01T17:15:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created YearOverYearChart with D3 scaleBand/scaleLinear vertical bars, Y-axis dollar labels, dashed grid lines, and value labels above each bar
- Added percentage change badge on current fiscal year bar (blue for increase, orange for decrease, gray for unchanged)
- Wired chart into department page Section 6 (Budget History) between ExpenditureBreakdown and RelatedDepartments
- All 35 department pages now have complete 7-section layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create YearOverYearChart vertical bar chart component** - `5f49d9f` (feat)
2. **Task 2: Wire YearOverYearChart into department page** - `11cd7ca` (feat)

## Files Created/Modified
- `budget-explorer-web/src/components/charts/YearOverYearChart.tsx` - D3 vertical bar chart with current year color, percentage badge, data table toggle, and data availability note
- `budget-explorer-web/src/app/department/[slug]/page.tsx` - Added YearOverYearChart import and Budget History section in correct position

## Decisions Made
- Data availability note ("Data available from FY XXXX") is rendered outside DataTableToggle so it appears in both chart and table view modes
- Badge width is dynamically computed from percentage text length rather than fixed width, so "+5.2%" and "-12.3%" both render cleanly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 is now complete (all 3 plans executed)
- All 35 department pages have full 7-section layout: breadcrumbs, stat cards, AI description, key changes, expenditure breakdown, year-over-year chart, and related departments
- Ready for Phase 5 (Tax Calculator) or Phase 6 (Deployment)

## Self-Check: PASSED

All 2 files verified present. All 2 task commits verified in git log.

---
*Phase: 04-department-pages-ai-year-over-year*
*Completed: 2026-03-01*
