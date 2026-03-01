---
phase: 05-tax-calculator
plan: 01
subsystem: ui, api, database
tags: [tax-calculator, prisma, react, vitest, tdd, millage-rates, property-tax]

# Dependency graph
requires:
  - phase: 01-data-pipeline
    provides: millage_rates and strategic_area_budgets tables with seeded data
  - phase: 02-app-foundation-design-system
    provides: design system tokens, Card component, layout patterns, nav-config
provides:
  - Pure tax math engine (calculateTaxBreakdown, applyHomesteadExemption, calculateCountyAllocation, getTotalTax, getCountyTotal)
  - SerializedMillageRate type and getMillageRates() server query
  - /calculator page with PropertyValueInput, TaxSummaryHero, TaxCalculator components
  - Vitest test infrastructure (16 unit tests)
affects: [05-02-tax-calculator, plan-02-authority-breakdown, plan-02-county-drilldown]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [pure-function-tax-math, format-on-blur-input, sticky-sidebar-grid, server-fetch-client-compute]

key-files:
  created:
    - budget-explorer-web/src/lib/tax-math.ts
    - budget-explorer-web/src/lib/__tests__/tax-math.test.ts
    - budget-explorer-web/src/app/calculator/page.tsx
    - budget-explorer-web/src/components/calculator/TaxCalculator.tsx
    - budget-explorer-web/src/components/calculator/PropertyValueInput.tsx
    - budget-explorer-web/src/components/calculator/TaxSummaryHero.tsx
    - budget-explorer-web/vitest.config.ts
  modified:
    - budget-explorer-web/src/types/budget.ts
    - budget-explorer-web/src/lib/db/queries.ts
    - budget-explorer-web/package.json

key-decisions:
  - "Vitest installed for TDD -- first test framework in the project"
  - "Format-on-blur pattern for dollar input (avoids cursor jumping)"
  - "Pure tax-math module with zero React dependencies for testability"

patterns-established:
  - "Pure function module: tax-math.ts separates business logic from UI for unit testing"
  - "Format-on-blur: strip non-digits while typing, format with toLocaleString on blur"
  - "Sticky sidebar grid: lg:grid-cols-[360px_1fr] with lg:sticky lg:top-6 for input panel"

requirements-completed: [CALC-01, CALC-02, PAGE-05]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 5 Plan 1: Tax Calculator Core Summary

**Pure tax math engine with 16 unit tests, millage rate data layer, and interactive /calculator page with dollar input, preset buttons, homestead toggle, and hero tax bill display**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T18:18:48Z
- **Completed:** 2026-03-01T18:22:58Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Tax calculation engine with 5 pure functions covering tax breakdown by authority, homestead exemption, county allocation, and totaling
- 16 unit tests via Vitest validating all tax math scenarios including edge cases
- Interactive /calculator page with property value input ($150K-$750K presets), homestead checkbox, and hero annual/monthly tax display
- Sticky sidebar layout on desktop, stacked on mobile, with empty state and disclaimer

## Task Commits

Each task was committed atomically:

1. **Task 1: Data layer and tax calculation engine (TDD)** - `f1c3475` (feat)
2. **Task 2: Calculator page shell, input component, and hero display** - `16052b8` (feat)

_Note: Task 1 followed TDD flow -- tests written first (RED), then implementation (GREEN), committed together after all 16 tests passed._

## Files Created/Modified
- `budget-explorer-web/src/lib/tax-math.ts` - Pure tax calculation functions (5 exports)
- `budget-explorer-web/src/lib/__tests__/tax-math.test.ts` - 16 unit tests for tax math
- `budget-explorer-web/src/types/budget.ts` - Added SerializedMillageRate type
- `budget-explorer-web/src/lib/db/queries.ts` - Added getMillageRates() query with Decimal-to-Number conversion
- `budget-explorer-web/src/app/calculator/page.tsx` - Server component fetching rates and areas
- `budget-explorer-web/src/components/calculator/TaxCalculator.tsx` - Main client orchestrator with state management
- `budget-explorer-web/src/components/calculator/PropertyValueInput.tsx` - Dollar input with formatting and preset buttons
- `budget-explorer-web/src/components/calculator/TaxSummaryHero.tsx` - Hero number display with monthly equivalent
- `budget-explorer-web/vitest.config.ts` - Vitest configuration with path aliases
- `budget-explorer-web/package.json` - Added vitest dev dependency

## Decisions Made
- Installed Vitest as first test framework in the project (required for TDD task)
- Used format-on-blur pattern for dollar input to avoid cursor-jumping issues (per research pitfall 3)
- Tax-math module is pure functions with zero React or DB imports -- all side effects live in UI layer
- Soft guardrails set at <$50K (low) and >$2M (high) for informational warnings on property values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Vitest test framework**
- **Found during:** Task 1 (TDD setup)
- **Issue:** Plan requires TDD but no test framework was installed in the project
- **Fix:** Installed vitest as devDependency and created vitest.config.ts with @/ path alias
- **Files modified:** package.json, pnpm-lock.yaml, vitest.config.ts
- **Verification:** All 16 tests run and pass
- **Committed in:** f1c3475 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test infrastructure was a prerequisite for the TDD task. No scope creep.

## Issues Encountered
- Floating-point test assertion (`Math.round(taxAmount * 100) === taxAmount * 100`) failed due to IEEE 754 precision noise on 139.80 * 100 = 13980.000000000002. Fixed by using `toBeCloseTo` for the rounding validation test. Implementation rounding is correct.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tax math engine is complete and tested -- Plan 05-02 can wire AuthorityBreakdown (stacked bar chart) and CountyDrillDown (percentage bars) into the existing placeholder slots
- `countyAllocation` is already computed in TaxCalculator.tsx and available for Plan 05-02 to consume
- Vitest is now available for any future unit testing needs

## Self-Check: PASSED

All 10 expected files found. Both task commits (f1c3475, 16052b8) verified in git log.

---
*Phase: 05-tax-calculator*
*Completed: 2026-03-01*
