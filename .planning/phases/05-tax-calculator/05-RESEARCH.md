# Phase 5: Tax Calculator - Research

**Researched:** 2026-03-01
**Domain:** Property tax calculation, client-side interactivity, D3 stacked bar charts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Text field with dollar formatting as you type, paired with 4 preset quick-pick buttons: $150K, $300K, $500K, $750K
- Live update: results recalculate instantly as user types or selects a preset
- Sticky sidebar layout: input pinned on the left side, results fill the right; collapses to top-input on mobile
- Soft guardrails: accept any positive value but show a note for unusual inputs ("This seems low/high for Miami-Dade")
- Big hero number at top of results: "Your estimated annual tax bill: $X,XXX" plus monthly equivalent ("$XXX/month")
- Authority breakdown: horizontal stacked bar chart showing proportions, with detail table below
- Authority table columns: authority name, millage rate, dollar amount, percentage of total
- County tax portion automatically shown as a separate section below the authority breakdown (always visible, no click required)
- Strategic areas displayed as a simple list with inline percentage bars showing share of county portion
- No department-level drill-down: stop at strategic area level
- Checkbox with brief explanation: "Florida homestead exemption reduces taxable value by $50,000 for primary residences"
- Homestead only: no senior, veteran, or disability exemptions
- Toggle recalculates all results instantly
- Brief footer disclaimer: "This is an estimate based on FY 2025-26 millage rates. Actual taxes may vary."

### Claude's Discretion
- Exact stacked bar chart implementation and color palette for authorities
- Inline percentage bar styling for strategic areas
- Mobile collapse behavior for the sidebar layout
- Loading/empty states before user enters a value
- Exact soft guardrail thresholds for "unusual" property values

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CALC-01 | User enters property assessed value and gets total tax bill | Tax formula: (assessed - exemptions) * millage / 1000. Millage data from `millage_rates` table. Pure client-side computation. |
| CALC-02 | Homestead exemption checkbox adjusts calculation | Flat $50K reduction to taxable value per user decision. Two-tier Florida nuance noted in Open Questions. |
| CALC-03 | Visual breakdown of taxes by authority (County vs. School Board vs. others) | Horizontal stacked bar via D3 `stack()` from d3-shape (already installed). `is_county` flag on millage_rates distinguishes county vs. non-county. |
| CALC-04 | County portion drilled into by strategic area and department | `cents_per_dollar` field on `strategic_area_budgets` provides proportional split. Existing `getStrategicAreas()` query returns this. No department drill-down per user decision. |
| CALC-05 | Dollar amounts displayed alongside percentages | Format with `formatDollarsFull()` for dollar amounts + percentage computed from each authority's share of total millage. |
| PAGE-05 | Tax calculator page with property value input and visual breakdown | `/calculator` route already in nav-config.ts. Server component fetches data, client component handles interactivity. Sticky sidebar layout with mobile collapse. |
</phase_requirements>

## Summary

The tax calculator is a **pure client-side computation page**. The server component fetches millage rates and strategic area budget proportions from the database, then passes them as serialized props to an interactive client component. All tax math happens in the browser -- no API calls needed for recalculation.

The core formula is straightforward: `tax = (assessedValue - exemptions) * millageRate / 1000`. The `millage_rates` table already exists and is seeded by the data pipeline with authority names, rates (DECIMAL 8,4), and an `is_county` boolean flag. The `strategic_area_budgets` table provides `cents_per_dollar` values for splitting the county portion across 9 strategic areas.

**No new dependencies are needed.** D3's `stack()` function from the already-installed `d3-shape` package handles the stacked bar chart. The inline percentage bars for strategic areas are pure CSS. All existing chart infrastructure (ChartContainer, DataTableToggle, ChartTooltip) can be reused.

**Primary recommendation:** Build as a single server page + one main client component. Fetch millage rates and strategic areas server-side, serialize, and let the client handle all input/calculation/display logic with React state.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-shape | ^3.2.0 | `stack()` for stacked bar chart data layout | Already installed; generates [lower, upper] bounds for each segment |
| d3-scale | ^4.0.2 | `scaleLinear` for bar width, `scaleBand` for authority labels | Already installed; used in all project charts |
| React (useState) | 19.2.3 | Client-side state for input value, homestead toggle | Already installed; standard for interactive forms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1.1 | Conditional CSS class joining | Already installed; used throughout project |
| @floating-ui/react | ^0.27.18 | Tooltip positioning for chart hover states | Already installed; only if ChartTooltip needs it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| D3 stacked bar | Recharts StackedBarChart | Recharts is installed but project convention uses D3 for complex/custom charts. The stacked bar needs custom horizontal layout matching project style. |
| CSS percentage bars | D3 bar chart for strategic areas | CSS is simpler and matches the user's "simple list with inline percentage bars" decision. No chart library overhead needed. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/calculator/
│   └── page.tsx                    # Server component: fetch data, metadata, render layout
├── components/calculator/
│   ├── TaxCalculator.tsx           # Main client component: input + results orchestrator
│   ├── PropertyValueInput.tsx      # Text input with formatting + preset buttons
│   ├── TaxSummaryHero.tsx          # Big hero number + monthly equivalent
│   ├── AuthorityBreakdown.tsx      # Stacked bar chart + detail table
│   └── CountyDrillDown.tsx         # Strategic area list with percentage bars
├── lib/
│   └── tax-math.ts                 # Pure functions: calculateTax, applyHomestead, splitByAuthority
└── types/
    └── budget.ts                   # Add: SerializedMillageRate type
```

### Pattern 1: Server Fetch + Client Interactivity
**What:** Server component fetches static data (millage rates, strategic areas), serializes BigInt/Decimal fields to strings/numbers, passes as props to a `'use client'` component that handles all user interaction.
**When to use:** Any page where the data is static but the UI is interactive.
**Example:**
```tsx
// app/calculator/page.tsx (server component)
import { getMillageRates, getStrategicAreas } from '@/lib/db/queries'
import { TaxCalculator } from '@/components/calculator/TaxCalculator'

export default async function CalculatorPage() {
  const [rates, areas] = await Promise.all([
    getMillageRates(),
    getStrategicAreas(),
  ])

  return (
    <div className="px-(--spacing-page) py-6">
      <TaxCalculator rates={rates} areas={areas} />
    </div>
  )
}
```

### Pattern 2: Derived State from Single Source
**What:** One piece of React state (assessed value + homestead flag) drives all computed values. Use `useMemo` to derive tax calculations from these two inputs. Never store derived values in state.
**When to use:** When multiple display sections depend on the same input.
**Example:**
```tsx
// Inside TaxCalculator.tsx
const [assessedValue, setAssessedValue] = useState<number>(0)
const [homesteadExempt, setHomesteadExempt] = useState(false)

const calculations = useMemo(() => {
  return calculateAllTaxes(assessedValue, homesteadExempt, rates, areas)
}, [assessedValue, homesteadExempt, rates, areas])
```

### Pattern 3: Pure Tax Math Module
**What:** All tax calculation logic lives in a pure function module (`tax-math.ts`) with no React dependencies. Functions take numbers in, return numbers out. This makes the math testable and debuggable independently of the UI.
**When to use:** Whenever business logic can be separated from rendering.
**Example:**
```typescript
// lib/tax-math.ts
export function calculateTaxForAuthority(
  taxableValue: number,  // dollars
  millageRate: number,   // e.g., 4.574
): number {
  // Tax = taxable value * millage rate / 1000
  // Use Math.round to avoid floating-point display issues
  return Math.round(taxableValue * millageRate) / 1000
}

export function applyHomesteadExemption(assessedValue: number): number {
  // Florida homestead: flat $50,000 reduction (simplified per user decision)
  return Math.max(0, assessedValue - 50_000)
}
```

### Anti-Patterns to Avoid
- **Storing derived state:** Never put `totalTax` or `authorityBreakdown` in useState. Derive from `assessedValue` + `homesteadExempt` via useMemo.
- **Formatting during calculation:** Keep all math in raw numbers (dollars, not formatted strings). Format only at the display layer.
- **Fetching on every keystroke:** All data is fetched once server-side. The client only computes -- never makes API calls.
- **Mixing BigInt/Decimal concerns into the client:** Convert all DB types (BigInt cents, Prisma Decimal) to plain JavaScript numbers in the server component before passing to client.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stacked bar chart data layout | Manual cumulative offset math | `d3.stack()` from d3-shape | Handles ordering, offsetting, and produces clean [lower, upper] bounds for each segment |
| Dollar input formatting | Custom regex-based formatter | `Intl.NumberFormat('en-US')` | Handles commas, decimals, locale edge cases; built into every browser |
| Currency display | Custom string manipulation | `formatDollarsFull()` / `formatDollarsAbbreviated()` from `src/lib/format.ts` | Already built and tested in this project |
| Percentage bars for strategic areas | SVG/D3 chart | CSS `width: ${percentage}%` with Tailwind | User requested "simple list with inline percentage bars" -- CSS is the right tool |
| Tooltip positioning | Manual offset calculation | ChartTooltip component (existing) | Already handles positioning and z-index |

**Key insight:** The tax calculator is 90% standard form/UI work and 10% charting. The charting part uses the same D3 patterns already established in ExpenditureBreakdown and YearOverYearChart. The novel work is the input experience and layout.

## Common Pitfalls

### Pitfall 1: Floating-Point Rounding in Tax Math
**What goes wrong:** Multiplying a property value by a millage rate like 4.5740 produces results like $1372.19999999... which displays as "$1,372.20" in some formatters and "$1,372.19" in others. Success criteria requires matching the official estimator.
**Why it happens:** JavaScript Number uses IEEE 754 doubles. Millage rates with 4 decimal places amplify precision loss.
**How to avoid:** Perform tax calculation as: `Math.round(taxableValue * millageRate * 100) / 100000` to get cents, then round to nearest cent. Alternatively, multiply in integer space: `Math.round(taxableValue * millageRate / 1000 * 100) / 100`. Display rounded to nearest dollar (not cent) since the official estimator does the same.
**Warning signs:** Total of individual authority taxes does not equal independently-computed total tax. Off-by-one-cent errors.

### Pitfall 2: Prisma Decimal Serialization
**What goes wrong:** Prisma returns `millage_rate` as a `Prisma.Decimal` object, not a JavaScript number. Passing it directly to a client component causes serialization errors ("cannot serialize Decimal").
**Why it happens:** Prisma models DECIMAL(8,4) as its own Decimal type for precision.
**How to avoid:** In the server query function, explicitly convert: `Number(rate.millage_rate)` or `rate.millage_rate.toNumber()`. Add the converted value to a serialized type (`SerializedMillageRate`).
**Warning signs:** Runtime error "cannot serialize non-POJOs" or NaN in calculations.

### Pitfall 3: Input Formatting Fights the User
**What goes wrong:** Dollar formatting on keystroke creates jarring cursor jumps. User types "300" and cursor jumps to after "$300", then typing "0" makes it "$3,000" but cursor is in wrong position.
**Why it happens:** Replacing input value while user is typing resets cursor position.
**How to avoid:** Two approaches: (a) Format on blur only, show raw number while typing, or (b) use `Intl.NumberFormat` with careful cursor position management. Approach (a) is simpler and recommended. Show "$" prefix as a visual element outside the input, format the display value on blur.
**Warning signs:** Users unable to edit middle of number, cursor jumping to end after each keystroke.

### Pitfall 4: Homestead Exemption Precision
**What goes wrong:** The user's simplified "$50,000 flat reduction" does not match the official estimator, which uses a two-tier system.
**Why it happens:** Florida's actual homestead exemption is: first $25K off ALL taxes (including school), second $25K off NON-SCHOOL taxes only (for assessed values $50K-$75K). The user decision simplifies this to a flat $50K.
**How to avoid:** The user explicitly chose the simplified version. Implement as written. Note in the disclaimer that this is an estimate. If matching the official estimator exactly is required, the two-tier approach would need to be implemented (see Open Questions).
**Warning signs:** Tax bill differs from official estimator by the school-board-on-$25K amount.

### Pitfall 5: Zero/Empty State Before Input
**What goes wrong:** Page renders with $0 tax bill and empty charts on load, looking broken.
**Why it happens:** Initial state has no assessed value.
**How to avoid:** Show a friendly empty state: "Enter your property's assessed value to see your tax breakdown." Hide the results section entirely until the user enters a value or selects a preset. Claude's discretion area per CONTEXT.md.
**Warning signs:** Charts rendering with zero-width bars, "$0" displayed prominently.

## Code Examples

Verified patterns from the existing codebase and official D3 documentation:

### Tax Calculation (Pure Function)
```typescript
// lib/tax-math.ts
// Source: Florida Department of Revenue formula
// https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1663

type MillageRate = {
  authority: string
  millageRate: number    // e.g., 4.574
  isCounty: boolean
  displayOrder: number
}

type TaxByAuthority = {
  authority: string
  millageRate: number
  taxAmount: number      // dollars, rounded to nearest cent
  percentage: number     // 0-100
  isCounty: boolean
}

export function calculateTaxBreakdown(
  assessedValue: number,
  homesteadExempt: boolean,
  rates: MillageRate[],
): TaxByAuthority[] {
  const taxableValue = homesteadExempt
    ? Math.max(0, assessedValue - 50_000)
    : assessedValue

  const results = rates.map(rate => ({
    authority: rate.authority,
    millageRate: rate.millageRate,
    taxAmount: Math.round(taxableValue * rate.millageRate / 1000 * 100) / 100,
    percentage: 0,
    isCounty: rate.isCounty,
  }))

  const total = results.reduce((sum, r) => sum + r.taxAmount, 0)
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? (r.taxAmount / total) * 100 : 0,
  }))
}
```

### Horizontal Stacked Bar Chart with D3 stack()
```tsx
// Source: d3-shape stack API (https://github.com/d3/d3-shape/blob/main/README.md#stacks)
// Adapted to project pattern from ExpenditureBreakdown.tsx

import { useMemo } from 'react'
import { stack, stackOrderNone, stackOffsetNone } from 'd3-shape'
import { scaleLinear } from 'd3-scale'

type AuthoritySegment = {
  authority: string
  taxAmount: number
  color: string
}

function StackedBar({ segments, width, height }: {
  segments: AuthoritySegment[]
  width: number
  height: number
}) {
  const total = segments.reduce((s, seg) => s + seg.taxAmount, 0)
  const barHeight = 40

  // Build cumulative offsets manually (simpler than d3.stack for single-row)
  let cumulative = 0
  const bars = segments.map(seg => {
    const x0 = cumulative
    const barWidth = total > 0 ? (seg.taxAmount / total) * width : 0
    cumulative += barWidth
    return { ...seg, x0, barWidth }
  })

  return (
    <svg width={width} height={barHeight} role="img" aria-label="Tax breakdown by authority">
      {bars.map(bar => (
        <rect
          key={bar.authority}
          x={bar.x0}
          y={0}
          width={Math.max(bar.barWidth, 2)}
          height={barHeight}
          fill={bar.color}
          rx={0}
        />
      ))}
    </svg>
  )
}
```

### Dollar Input with Formatting
```tsx
// Format on blur pattern (avoids cursor-jumping issues)
import { useState, useCallback } from 'react'

function PropertyValueInput({ value, onChange }: {
  value: number
  onChange: (v: number) => void
}) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toLocaleString('en-US') : ''
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-numeric characters except digits
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setDisplayValue(raw)
    onChange(Number(raw) || 0)
  }

  const handleBlur = () => {
    const num = Number(displayValue.replace(/[^0-9]/g, '')) || 0
    setDisplayValue(num > 0 ? num.toLocaleString('en-US') : '')
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Enter assessed value"
        className="w-full pl-7 pr-3 py-2 border border-border rounded-md"
      />
    </div>
  )
}
```

### Inline Percentage Bar (CSS-only)
```tsx
// Strategic area percentage bar -- no chart library needed
function PercentageBar({ label, percentage, color, dollarAmount }: {
  label: string
  percentage: number
  color: string
  dollarAmount: string
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-48 text-sm text-text-primary truncate">{label}</span>
      <div className="flex-1 h-4 bg-surface-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(percentage, 1)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-20 text-sm text-right text-text-secondary">{dollarAmount}</span>
      <span className="w-12 text-sm text-right text-text-muted">
        {percentage.toFixed(1)}%
      </span>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Controlled input with real-time formatting | Format on blur, raw input while typing | Always been best practice | Prevents cursor-jumping UX bugs |
| Server-side tax calculation API | Client-side computation | This project's decision | Zero latency on recalculation, no server cost |
| CSS float-based sidebar layouts | CSS Grid / Flexbox sticky sidebar | Tailwind v4 / modern CSS | `sticky` positioning + grid columns for sidebar layout |
| d3.layout.stack (D3 v3) | d3.stack() from d3-shape (D3 v4+) | D3 v4 (2016) | Cleaner API, tabular input, no DOM mutation |

**Deprecated/outdated:**
- `d3.layout.stack`: Replaced by `d3.stack()` in d3-shape. This project uses D3 v4+ modules.
- `Number.toFixed()` for financial display: Use `Intl.NumberFormat` or the project's `formatDollarsFull()`.

## Open Questions

1. **Homestead Exemption: Simplified vs. Accurate**
   - What we know: User decision says "reduces taxable value by $50,000." Florida law actually uses two tiers: first $25K off all taxes, second $25K off non-school taxes only. The two-tier approach would require per-authority exemption amounts rather than a single flat reduction.
   - What's unclear: Whether the success criterion "match Miami-Dade's official tax estimator" requires the two-tier implementation or if the simplified version is acceptable given the disclaimer.
   - Recommendation: Implement the simplified flat $50K as the user decided. The difference for a $300K home is approximately $125/year (school board millage on the $25K gap). Note this in the disclaimer. If exact matching is needed later, the pure function module makes it easy to swap in the two-tier logic.

2. **Millage Rate Data Completeness**
   - What we know: The pipeline extracts millage rates from the Budget in Brief PDF. The table includes county and non-county authorities (school board, children's trust, water management, etc.).
   - What's unclear: Whether the extracted data includes all authorities shown on the official tax estimator. Some authorities (UMSA vs. incorporated area rates) may vary by location.
   - Recommendation: Use whatever is seeded in the `millage_rates` table. The calculator represents a "countywide unincorporated" estimate. Note in the disclaimer that actual rates vary by municipality.

3. **Authority Color Palette**
   - What we know: Claude's discretion per CONTEXT.md. The strategic areas already have assigned colors. The authority breakdown needs its own palette since authorities (County, School Board, etc.) are different entities.
   - Recommendation: Use a distinct 5-7 color palette for authorities. County authorities in shades of blue (matching MDC brand), non-county in distinct hues (green for school, teal for children's trust, etc.). Define as a constant array in the component or tax-math module.

4. **Soft Guardrail Thresholds**
   - What we know: Claude's discretion per CONTEXT.md. Need thresholds for "unusual" property values in Miami-Dade.
   - Recommendation: Low threshold: below $50,000 (below homestead exemption -- essentially no tax). High threshold: above $2,000,000 (top ~5% of Miami-Dade properties). Show a subtle info note, not an error.

## Sources

### Primary (HIGH confidence)
- `/d3/d3` Context7 library ID -- confirmed `d3.stack()` is in d3-shape, verified stacked bar pattern
- Existing codebase: `src/components/charts/ExpenditureBreakdown.tsx` -- D3 chart pattern with scaleBand + scaleLinear
- Existing codebase: `src/lib/db/queries.ts` -- `getStrategicAreas()` returns `centsPerDollar`
- Existing codebase: `budget-explorer-schema.sql` -- `millage_rates` table schema
- Existing codebase: `pipeline/extract/millage.py` -- millage extraction logic confirms authority names and `is_county` flag

### Secondary (MEDIUM confidence)
- [Florida Department of Revenue](https://floridarevenue.com/faq/Pages/FAQDetails.aspx?FAQID=1663) -- tax calculation formula: taxable value / 1000 * millage rate
- [Palm Beach County PAO](https://pbcpao.gov/homestead-exemption.htm) -- homestead exemption two-tier structure confirmed
- [Miami-Dade Property Appraiser Millage Tables](https://www.miamidadepa.gov/pa/millage_tables.asp) -- authority list and rate structure
- [Miami-Dade Budget FY 2025-26](https://www.miamidade.gov/resources/budget/adopted/fy2025-26/revenues.pdf) -- FY 2025-26 total millage: 9.5778

### Tertiary (LOW confidence)
- Soft guardrail thresholds ($50K low, $2M high) -- based on general Miami-Dade market knowledge, not verified against property appraiser distribution data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, patterns proven in codebase
- Architecture: HIGH -- follows exact same server-fetch + client-render pattern as existing pages
- Pitfalls: HIGH -- floating-point and Prisma Decimal issues are well-documented; input formatting is a known UX challenge
- Tax formula: HIGH -- verified with Florida DOR official documentation
- Homestead exemption: MEDIUM -- user simplified version implemented, but accuracy vs. official estimator is an open question

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, millage rates are annual)
