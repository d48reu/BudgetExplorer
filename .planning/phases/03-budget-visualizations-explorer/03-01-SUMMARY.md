---
phase: 03-budget-visualizations-explorer
plan: 01
subsystem: ui
tags: [d3, recharts, charts, accessibility, floating-ui, resize-observer, prisma]

# Dependency graph
requires:
  - phase: 02-app-foundation-design-system
    provides: Skeleton, BudgetTerm tooltip pattern, format utilities, Prisma query layer, Tailwind design tokens
provides:
  - D3 modules (d3-hierarchy, d3-shape, d3-scale) and Recharts installed
  - chart-utils.ts with toChartValue(), centsToDollars(), formatPercentage()
  - ChartContainer responsive wrapper with ResizeObserver + Skeleton loading
  - DataTableToggle chart/table accessibility toggle with sr-only table
  - ChartTooltip controlled tooltip matching BudgetTerm styling
  - SerializedDepartment, SerializedRevenueSource, TableColumn types
  - getAreaWithDepartments(), getRevenueSources(), getStrategicAreasWithDetails() queries
affects: [03-02-PLAN, 03-03-PLAN, 04-department-pages]

# Tech tracking
tech-stack:
  added: [d3-hierarchy@3.1.2, d3-shape@3.2.0, d3-scale@4.0.2, recharts@3.7.0, "@types/d3-hierarchy@3.1.7", "@types/d3-shape@3.1.8", "@types/d3-scale@4.0.9"]
  patterns: [render-prop-chart-sizing, controlled-tooltip, sr-only-table-accessibility, bigint-to-number-conversion]

key-files:
  created:
    - budget-explorer-web/src/lib/chart-utils.ts
    - budget-explorer-web/src/components/charts/ChartContainer.tsx
    - budget-explorer-web/src/components/charts/DataTableToggle.tsx
    - budget-explorer-web/src/components/charts/ChartTooltip.tsx
  modified:
    - budget-explorer-web/package.json
    - budget-explorer-web/src/types/budget.ts
    - budget-explorer-web/src/lib/db/queries.ts

key-decisions:
  - "ChartContainer uses render prop pattern for dimension passing instead of context"
  - "DataTableToggle always renders sr-only table when chart is visible for screen reader access"
  - "ChartTooltip is controlled (parent manages open state) since chart elements handle their own hover/focus"

patterns-established:
  - "Render prop chart sizing: ChartContainer passes { width, height } to children function"
  - "Controlled tooltip: parent chart manages open/close, ChartTooltip handles positioning"
  - "BigInt conversion: always use toChartValue() before passing budget data to D3/Recharts"
  - "Accessibility toggle: every chart wrapped in DataTableToggle with sr-only table fallback"

requirements-completed: [VIZ-07]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 3 Plan 01: Shared Chart Infrastructure Summary

**D3/Recharts installation with ChartContainer, DataTableToggle, ChartTooltip shared components and 3 new Prisma queries for area detail and revenue data**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T04:59:06Z
- **Completed:** 2026-03-01T05:01:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed d3-hierarchy, d3-shape, d3-scale, and recharts with TypeScript type definitions
- Created chart-utils.ts with BigInt-to-Number conversion utilities (toChartValue, centsToDollars, formatPercentage)
- Built ChartContainer with ResizeObserver responsive sizing and Skeleton loading placeholder
- Built DataTableToggle with chart/table toggle and always-available sr-only table for screen readers
- Built ChartTooltip as controlled @floating-ui/react tooltip matching BudgetTerm styling
- Added SerializedDepartment, SerializedRevenueSource, and TableColumn types to budget.ts
- Added getAreaWithDepartments(), getRevenueSources(), and getStrategicAreasWithDetails() queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Install D3 modules + Recharts, create chart-utils and type definitions** - `90726dd` (feat)
2. **Task 2: Build ChartContainer, DataTableToggle, and ChartTooltip shared components** - `9269252` (feat)

## Files Created/Modified
- `budget-explorer-web/src/lib/chart-utils.ts` - BigInt cents-to-Number conversion utilities for D3/Recharts
- `budget-explorer-web/src/components/charts/ChartContainer.tsx` - Responsive chart wrapper with ResizeObserver + Skeleton loading
- `budget-explorer-web/src/components/charts/DataTableToggle.tsx` - Chart/table toggle with accessible sr-only table
- `budget-explorer-web/src/components/charts/ChartTooltip.tsx` - Controlled tooltip using @floating-ui/react
- `budget-explorer-web/package.json` - Added D3 modules, Recharts, and type definition dependencies
- `budget-explorer-web/src/types/budget.ts` - Added SerializedDepartment, SerializedRevenueSource, TableColumn types
- `budget-explorer-web/src/lib/db/queries.ts` - Added getAreaWithDepartments, getRevenueSources, getStrategicAreasWithDetails

## Decisions Made
- ChartContainer uses render prop pattern (children function receives dimensions) rather than React context -- simpler, no provider overhead, explicit data flow
- DataTableToggle renders a visually hidden (sr-only) copy of the data table even when the chart is displayed, ensuring screen readers always have tabular access per VIZ-07
- ChartTooltip is a controlled component (parent passes open/onOpenChange) since chart elements manage their own hover/focus states differently from standard DOM elements

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shared chart infrastructure is ready for Plans 02 and 03 to build Treemap, DonutChart, and WaffleChart
- ChartContainer, DataTableToggle, and ChartTooltip are generic and reusable across all chart types
- Query layer provides data for area detail pages (getAreaWithDepartments), revenue chart (getRevenueSources), and enhanced area listing (getStrategicAreasWithDetails)

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (90726dd, 9269252) verified in git log.

---
*Phase: 03-budget-visualizations-explorer*
*Completed: 2026-03-01*
