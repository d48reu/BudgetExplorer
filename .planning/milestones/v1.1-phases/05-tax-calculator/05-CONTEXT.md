# Phase 5: Tax Calculator - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enter their property assessed value and get a personalized breakdown of exactly how their tax dollars are allocated across county services, authorities, and strategic areas. Homestead exemption toggles recalculation. All calculations use real FY 2025-26 millage rates from the database. Department-level drill-down and additional exemptions are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Input experience
- Text field with dollar formatting as you type, paired with 4 preset quick-pick buttons: $150K, $300K, $500K, $750K
- Live update: results recalculate instantly as user types or selects a preset
- Sticky sidebar layout: input pinned on the left side, results fill the right; collapses to top-input on mobile
- Soft guardrails: accept any positive value but show a note for unusual inputs ("This seems low/high for Miami-Dade")

### Breakdown display
- Big hero number at top of results: "Your estimated annual tax bill: $X,XXX" plus monthly equivalent ("$XXX/month")
- Authority breakdown: horizontal stacked bar chart showing proportions, with detail table below
- Authority table columns: authority name, millage rate, dollar amount, percentage of total
- Educational approach: show the millage rates so users learn how property tax works

### Drill-down behavior
- County tax portion automatically shown as a separate section below the authority breakdown (always visible, no click required)
- Strategic areas displayed as a simple list with inline percentage bars showing share of county portion
- No department-level drill-down: stop at strategic area level; department detail lives on department pages via other navigation

### Homestead exemption
- Checkbox with brief explanation: "Florida homestead exemption reduces taxable value by $50,000 for primary residences"
- Homestead only: no senior, veteran, or disability exemptions (keeps it clean)
- Toggle recalculates all results instantly (matches live update pattern)

### Disclaimer
- Brief footer note: "This is an estimate based on FY 2025-26 millage rates. Actual taxes may vary."
- Present but not distracting

### Claude's Discretion
- Exact stacked bar chart implementation and color palette for authorities
- Inline percentage bar styling for strategic areas
- Mobile collapse behavior for the sidebar layout
- Loading/empty states before user enters a value
- Exact soft guardrail thresholds for "unusual" property values

</decisions>

<specifics>
## Specific Ideas

- Presets chosen for Miami-Dade market: $150K (starter condo), $300K (typical home), $500K (mid-range), $750K (higher-end)
- Monthly equivalent makes taxes relatable for homeowners who think in monthly budget terms
- Showing millage rates in the table is educational — most residents don't know what a "mill" is
- Strategic area list with percentage bars keeps the page scannable without adding chart complexity

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DonutChart` (`src/components/charts/DonutChart.tsx`): Available but not chosen for this page — stacked bar preferred instead
- `ChartContainer` (`src/components/charts/ChartContainer.tsx`): Wrapper with responsive sizing, can wrap the stacked bar
- `ChartTooltip` (`src/components/charts/ChartTooltip.tsx`): Hover tooltip for chart elements
- `DataTableToggle` (`src/components/charts/DataTableToggle.tsx`): Accessibility toggle for chart-to-table fallback
- `Card` (`src/components/ui/Card.tsx`): Rounded border with header/footer slots, design system tokens
- `formatDollarsFull` (`src/lib/format.ts`): Formats cents to "$X,XXX,XXX" — use for exact dollar displays
- `formatDollarsAbbreviated` (`src/lib/format.ts`): Formats to "$X.XM" — use for large summary numbers

### Established Patterns
- All monetary values stored as BigInt cents in the database
- D3 used for all chart rendering (d3-shape, d3-scale)
- Tailwind CSS for all styling with design system CSS variables
- `prisma` client for database queries (`src/lib/prisma.ts`)
- Chart components follow: ChartContainer wrapper → SVG rendering → DataTableToggle for accessibility

### Integration Points
- `/calculator` route already defined in `nav-config.ts` — page just needs to be created
- `millage_rates` table seeded by pipeline with authority, millage_rate, is_county, display_order
- `strategic_area_budgets` table has `cents_per_dollar` for county portion drill-down to strategic areas
- `getStrategicAreas()` query exists in `queries.ts` — returns areas with budget data

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-tax-calculator*
*Context gathered: 2026-03-01*
