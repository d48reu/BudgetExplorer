# Phase 4: Department Pages + AI + Year-over-Year - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can visit any of the 35 department pages and read a plain-English AI-generated description of what the department does, see how its budget changed over 5 fiscal years, and view expenditure category breakdowns — all statically generated for fast loading. Department pages are linked from the explorer treemap (Phase 3). Search and SEO are separate phases (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### AI Description Tone & Content
- Civic plain-English tone — write like a county newsletter, no jargon, readable by any resident with no budget background
- Include specific dollar amounts and employee counts to ground descriptions in real data
- Three content tiers in the `budget_descriptions` table:
  - `summary`: 2-3 sentence always-visible overview
  - `detailed_description`: 1-2 paragraphs behind a "Read more" expand/collapse
  - `key_changes`: What changed from prior year, displayed in a colored callout box near top
- All descriptions pre-generated via Python pipeline using Claude API, seeded into database — never generated at runtime
- Every description displays its fiscal year and generation date (per success criteria)

### Department Page Layout
- **Section order (top to bottom):**
  1. Breadcrumbs + department name + strategic area color badge (already exists in stub)
  2. Stat cards row: Operating Budget, Capital Budget, Employees, YoY Change (reuse Card component)
  3. AI summary (2-3 sentences, always visible) + "Read more" for detailed_description
  4. Key changes callout box (colored banner highlighting what changed this year)
  5. Expenditure category breakdown chart (full-width)
  6. Year-over-year budget history chart (full-width)
  7. "More in [Strategic Area]" section with cards linking to sibling departments
- Charts are full-width stacked (not side-by-side) — each gets its own section with room for labels
- All pages statically generated at build time (success criteria requirement)

### Year-over-Year Charts
- Single bar per year showing total budget (operating + capital combined)
- Current fiscal year bar uses the department's strategic area color; prior years in neutral gray
- Show percentage change badge for current year only (e.g., "+5.2% vs prior year") — no annotations between all bars
- Show only years with data — if a department has 3 years of history, show 3 bars with a note: "Data available from FY YYYY-YY"
- 5 fiscal years maximum when data exists
- Uses D3 via existing ChartContainer + DataTableToggle pattern

### Expenditure Category Breakdown
- Horizontal bar chart ranked by amount (largest at top)
- Each bar shows both dollar amount and percentage of total: "Salary — $450M (58%)"
- Hide categories with $0 budget; categories <1% get a minimum-width bar for visibility
- Bars use the department's strategic area color with opacity gradient (largest bar full opacity, smaller bars progressively lighter)
- Up to 9 expenditure categories: Salary, Fringes, Contractual Services, Other Operating, Charges for County Services, Grants, Capital, Court Costs, Interagency Transfers
- Uses D3 via existing ChartContainer + DataTableToggle pattern

### Claude's Discretion
- Loading skeleton design during page transitions
- Exact spacing and typography within sections
- Error state handling for missing data
- "Read more" expand/collapse animation style
- Callout box color and icon choice for key changes
- Stat card design details (icons, formatting)
- Exact minimum bar width threshold for small expenditure categories

</decisions>

<specifics>
## Specific Ideas

- Stat cards should give the dashboard-header feel — key numbers at a glance before any narrative
- Key changes callout should be eye-catching and scannable — think of it as the "what's newsworthy" for this department
- The page tells a story top-to-bottom: what is this department → what changed → how they spend → historical trend → explore more
- Related departments section at the bottom encourages exploration within the strategic area

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChartContainer` (src/components/charts/ChartContainer.tsx): Responsive wrapper with ResizeObserver + render prop — use for both YoY bar chart and expenditure horizontal bars
- `DataTableToggle` (src/components/charts/DataTableToggle.tsx): Accessibility toggle for chart-to-table — use on both charts
- `DonutChart` (src/components/charts/DonutChart.tsx): Not directly reused (horizontal bars chosen) but reference for D3 patterns
- `Card` (src/components/ui/Card.tsx): Reuse for stat cards and "More in [Area]" department cards
- `Skeleton` (src/components/ui/Skeleton.tsx): Loading states during static generation fallback
- `Breadcrumbs` (src/components/layout/Breadcrumbs.tsx): Already used in department stub page
- `BudgetTerm` (src/components/ui/BudgetTerm.tsx): Glossary tooltips for budget terminology
- `format.ts` (src/lib/format.ts): Number formatting utilities for dollar amounts
- `chart-utils.ts` (src/lib/chart-utils.ts): D3 chart utilities (scales, axes, etc.)

### Established Patterns
- Next.js App Router with Server Components for data fetching
- Prisma ORM for database access (src/lib/prisma.ts)
- BigInt stored as cents, serialized as strings via data access layer (src/lib/db/queries.ts)
- D3 for all chart visualizations with ChartContainer render prop pattern
- Tailwind CSS for styling with design system tokens (--spacing-page, font-heading, text-text-primary, etc.)
- Strategic area colors stored in database (strategic_areas.color) — used throughout explorer

### Integration Points
- Department stub page exists at `src/app/department/[slug]/page.tsx` — currently `force-dynamic`, needs conversion to static generation
- Treemap in explorer links to `/department/[slug]` (Phase 3 dependency fulfilled)
- `budget_descriptions` table ready (summary, detailed_description, key_changes, generated_at, model_version)
- `department_expenditures` table with 9 categories seeded
- `department_budgets` table supports multi-year data via fiscal_year_id
- `v_department_yoy` SQL view computes prior-year comparison with LAG
- Historical data pipeline in `pipeline/load/seed_historical.py` for seeding prior fiscal year data
- 35 departments and 9 strategic areas already in database

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-department-pages-ai-year-over-year*
*Context gathered: 2026-03-01*
