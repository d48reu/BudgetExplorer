# Phase 3: Budget Visualizations + Explorer - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive charts that let users visually explore the $13.2B Miami-Dade County budget. Includes a treemap explorer with drill-down from strategic areas to departments, a revenue source donut chart, and a penny/waffle visualization on the homepage. All charts have mobile fallbacks and accessible data table toggles. Department detail page content is Phase 4 — this phase creates stub routes only.

</domain>

<decisions>
## Implementation Decisions

### Charting library
- D3.js for complex visualizations (treemap, sunburst, donut chart) — full control over custom data viz
- Recharts for simpler chart types in later phases (bar charts, line charts in Phase 4 YoY)
- Both libraries will be installed in this phase; Recharts usage begins in Phase 4

### Chart defaults and colors
- Treemap is the default view on the explorer page (not sunburst)
- Each strategic area uses its hex color from the database `strategic_areas.color` column
- Every chart has a per-chart "View as table" toggle button for accessibility (VIZ-07)

### Drill-down interaction
- Clicking a strategic area in the treemap navigates to a dedicated area detail page at `/explorer/[area-slug]`
- Area detail page shows: summary header (name, total budget, department count, description), department treemap, AND a sortable department list below
- Breadcrumb navigation using the existing `Breadcrumbs` component: Home > Explorer > [Area Name]
- Clicking a department in the area treemap links to `/department/[slug]` — stub page created now, content filled in Phase 4

### Penny visualization (homepage)
- 10x10 waffle chart (100 squares) where each square = 1 cent of every budget dollar
- Squares colored by strategic area using DB colors
- Interactive: hover highlights all squares for that area + shows tooltip (name, cents, dollar amount); click navigates to `/explorer/[area-slug]`
- Color-coded legend below the grid listing each area with its cent value
- Section heading: "Where Each Dollar Goes"
- Data source: `strategic_area_budgets.cents_per_dollar` column

### Revenue donut chart
- D3 donut/pie chart showing 7 revenue categories from `revenue_sources` table
- Data source: `revenue_by_source` table joined with current fiscal year

### Mobile fallback (below 768px)
- Explorer treemap replaced with stacked cards (reuses existing `Card` component)
- Each card shows: area name, color indicator, operating budget amount, and percentage of total budget
- Cards sorted by budget size (largest first), not database display_order
- Tapping a card navigates to the area detail page
- Waffle chart on homepage: keeps the 10x10 grid at smaller size (no layout swap)

### Claude's Discretion
- D3 implementation patterns (hooks vs. refs, SVG vs. Canvas)
- Treemap layout algorithm (squarified, binary, etc.)
- Tooltip styling and positioning
- Loading skeleton designs for charts
- Animation/transition choices for chart rendering
- Revenue donut color palette (not tied to strategic area colors)
- Exact responsive breakpoint behavior between 768px and desktop
- Data table column layout and sorting defaults

</decisions>

<specifics>
## Specific Ideas

- Homepage already has a placeholder `<section>` for visualizations in `page.tsx` (line 34-42)
- The "see where your money goes" tagline in HeroBanner aligns with the "Where Each Dollar Goes" waffle chart heading
- Strategic areas have official descriptions in the database that should appear on area detail pages

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (`src/components/ui/Card.tsx`): header/footer/children slots with border/rounded styling — reuse for mobile fallback cards and chart containers
- `Breadcrumbs` component (`src/components/layout/Breadcrumbs.tsx`): already supports multi-level breadcrumb trails — reuse for explorer drill-down
- `Skeleton` component (`src/components/ui/Skeleton.tsx`): loading placeholder — reuse for chart loading states
- `BudgetTerm` component (`src/components/ui/BudgetTerm.tsx`): tooltip for glossary terms — pattern reference for chart tooltips
- `formatDollarsAbbreviated` / `formatDollarsFull` (`src/lib/format.ts`): cents-to-dollars formatting already handles B/M/K abbreviations
- `formatYoYChange` (`src/lib/format.ts`): percentage change formatting with neutral blue/orange colors

### Established Patterns
- Next.js App Router with server components (async data fetching in page.tsx)
- Prisma ORM for database queries (`src/lib/db/queries.ts`)
- BigInt cents stored as strings for JSON serialization
- Tailwind CSS v4 with custom theme tokens in `globals.css`
- `@floating-ui/react` already installed — can use for chart tooltip positioning
- `clsx` for conditional class merging
- `'use client'` directive for interactive components (CountUp, BudgetTerm)

### Integration Points
- Homepage `page.tsx` has a visualization placeholder section ready for waffle chart and revenue donut
- `nav-config.ts` already has `/explorer` route defined
- `getStrategicAreas()` query exists and returns all 9 areas with budget data and colors
- Database has `revenue_sources`, `revenue_by_source`, `department_budgets`, and `strategic_area_budgets` tables ready to query
- `v_strategic_area_summary` view provides pre-joined area data with department counts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-budget-visualizations-explorer*
*Context gathered: 2026-02-28*
