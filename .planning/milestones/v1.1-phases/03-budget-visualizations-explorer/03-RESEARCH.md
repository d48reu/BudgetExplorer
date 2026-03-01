# Phase 3: Budget Visualizations + Explorer - Research

**Researched:** 2026-02-28
**Domain:** D3.js data visualization in React/Next.js (treemap, donut chart, waffle chart)
**Confidence:** HIGH

## Summary

Phase 3 requires three distinct visualizations: a treemap explorer with drill-down navigation, a revenue donut chart, and a 10x10 waffle "penny" chart. The user has locked D3.js as the charting library for these complex visualizations, with Recharts reserved for simpler charts in Phase 4. The core integration pattern is "D3 computes, React renders" -- use D3's layout algorithms (d3-hierarchy, d3-shape) to calculate positions and angles, then let React render the SVG elements declaratively. This avoids DOM ownership conflicts between D3 and React.

The project already has `@floating-ui/react` installed for tooltip positioning, a `Breadcrumbs` component for drill-down navigation, `Card` and `Skeleton` components for mobile fallbacks and loading states, and `formatDollarsAbbreviated`/`formatDollarsFull` utilities for currency display. The database schema has all required tables (`strategic_area_budgets`, `revenue_by_source`, `department_budgets`) with BigInt cents and pre-computed `cents_per_dollar` values ready for the waffle chart.

**Primary recommendation:** Install only the specific D3 modules needed (`d3-hierarchy`, `d3-shape`, `d3-scale`) rather than the full `d3` bundle. Build each chart as a `'use client'` component that receives pre-fetched, serialized data from server components. Use the existing `@floating-ui/react` for all chart tooltips.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D3.js for complex visualizations (treemap, sunburst, donut chart) -- full control over custom data viz
- Recharts for simpler chart types in later phases (bar charts, line charts in Phase 4 YoY)
- Both libraries will be installed in this phase; Recharts usage begins in Phase 4
- Treemap is the default view on the explorer page (not sunburst)
- Each strategic area uses its hex color from the database `strategic_areas.color` column
- Every chart has a per-chart "View as table" toggle button for accessibility (VIZ-07)
- Clicking a strategic area in the treemap navigates to a dedicated area detail page at `/explorer/[area-slug]`
- Area detail page shows: summary header (name, total budget, department count, description), department treemap, AND a sortable department list below
- Breadcrumb navigation using the existing `Breadcrumbs` component: Home > Explorer > [Area Name]
- Clicking a department in the area treemap links to `/department/[slug]` -- stub page created now, content filled in Phase 4
- 10x10 waffle chart (100 squares) where each square = 1 cent of every budget dollar
- Squares colored by strategic area using DB colors
- Interactive: hover highlights all squares for that area + shows tooltip (name, cents, dollar amount); click navigates to `/explorer/[area-slug]`
- Color-coded legend below the grid listing each area with its cent value
- Section heading: "Where Each Dollar Goes"
- Data source: `strategic_area_budgets.cents_per_dollar` column
- D3 donut/pie chart showing 7 revenue categories from `revenue_sources` table
- Data source: `revenue_by_source` table joined with current fiscal year
- Explorer treemap replaced with stacked cards on mobile (reuses existing `Card` component)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIZ-01 | Interactive treemap showing 9 strategic areas sized by operating budget | D3 `d3-hierarchy` treemap layout with `treemapSquarify` tiling; React renders SVG rects with DB colors; click handler navigates to `/explorer/[area-slug]` |
| VIZ-02 | Drill-down from strategic area to departments within that area | Area detail page at `/explorer/[area-slug]` with department treemap + sortable list; breadcrumb nav via existing `Breadcrumbs` component; department clicks link to `/department/[slug]` stub |
| VIZ-03 | Revenue source donut chart showing 7 revenue categories | D3 `d3-shape` pie/arc generators; data from `revenue_by_source` table; tooltips via `@floating-ui/react` |
| VIZ-04 | "Penny visualization" -- dollar broken into colored segments by strategic area | 10x10 CSS Grid waffle chart (no D3 needed); data from `strategic_area_budgets.cents_per_dollar`; hover highlights + tooltip; click navigates |
| VIZ-07 | Data table fallback for every chart (accessibility requirement) | `DataTableToggle` wrapper component with `aria-hidden` on chart and visible `<table>` with `role="table"`; toggle button per chart |
| PAGE-02 | Explorer page with full-screen treemap and drill-down | `/explorer` route with server component data fetching, client component treemap; mobile card fallback below 768px |
| PAGE-03 | Strategic area detail pages showing departments within each area | `/explorer/[area-slug]` dynamic route with header + department treemap + department list; breadcrumbs |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-hierarchy | 3.1.2 | Treemap layout computation (hierarchy, sum, sort, treemap) | The only D3 module needed for treemap rectangle positions; tree-shakeable |
| d3-shape | 3.2.0 | Pie/arc generators for donut chart | Computes start/end angles and SVG arc paths; standard D3 approach |
| d3-scale | 4.0.2 | Ordinal color scale for revenue donut | Maps revenue category names to colors; not needed for strategic areas (DB has colors) |
| recharts | 3.7.0 | Simple charts in Phase 4 (bar, line) | Install now per user decision; usage begins Phase 4 for YoY bar charts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @floating-ui/react | ^0.27.18 | Tooltip positioning for all charts | Already installed; reuse for treemap cell tooltips, donut slice tooltips, waffle square tooltips |
| clsx | ^2.1.1 | Conditional CSS class merging | Already installed; use for active/hover states on chart elements |

### Type Definitions
| Library | Version | Purpose |
|---------|---------|---------|
| @types/d3-hierarchy | latest | TypeScript types for d3-hierarchy |
| @types/d3-shape | latest | TypeScript types for d3-shape |
| @types/d3-scale | latest | TypeScript types for d3-scale |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Individual D3 modules | Full `d3` package (7.9.0) | Full package is ~240KB minified; individual modules total ~15-20KB for our needs |
| D3 for waffle chart | Pure CSS Grid | CSS Grid is simpler and more performant for a static 10x10 grid; D3 adds no value here |
| Custom tooltips | D3 tooltip pattern | @floating-ui/react already installed, handles positioning + collision detection; no need for D3 DOM manipulation |

**Installation:**
```bash
cd budget-explorer-web
pnpm add d3-hierarchy d3-shape d3-scale recharts
pnpm add -D @types/d3-hierarchy @types/d3-shape @types/d3-scale
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── explorer/
│   │   ├── page.tsx                    # Server component: fetch areas, render treemap
│   │   └── [area-slug]/
│   │       └── page.tsx                # Server component: fetch area + departments
│   ├── department/
│   │   └── [slug]/
│   │       └── page.tsx                # Stub page (Phase 4 content)
│   └── page.tsx                        # Homepage: add waffle + revenue donut sections
├── components/
│   ├── charts/
│   │   ├── ChartContainer.tsx          # Shared wrapper: responsive sizing + loading skeleton
│   │   ├── DataTableToggle.tsx         # Toggle between chart view and data table view
│   │   ├── ChartTooltip.tsx            # Shared tooltip using @floating-ui/react
│   │   ├── Treemap.tsx                 # D3 treemap (client component)
│   │   ├── DonutChart.tsx              # D3 donut (client component)
│   │   └── WaffleChart.tsx             # CSS Grid waffle (client component)
│   └── explorer/
│       ├── AreaCard.tsx                # Mobile fallback card for explorer
│       ├── AreaHeader.tsx              # Area detail page header
│       └── DepartmentList.tsx          # Sortable department list table
├── lib/
│   ├── chart-utils.ts                  # toChartValue(), chart data transforms
│   └── db/
│       └── queries.ts                  # Add: getAreaWithDepartments(), getRevenueSources()
└── types/
    └── budget.ts                       # Add: chart-specific serialized types
```

### Pattern 1: "D3 Computes, React Renders"
**What:** Use D3 only for math/layout. React owns all SVG DOM rendering.
**When to use:** Every D3 chart in this project.
**Why:** Prevents DOM ownership conflicts. React handles re-renders, event handlers, and accessibility attributes. D3 just returns numbers.

```typescript
// Source: community best practice (pganalyze.com, react-graph-gallery.com)
'use client'

import { useMemo } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import type { SerializedStrategicArea } from '@/types/budget'

type TreemapProps = {
  areas: SerializedStrategicArea[]
  width: number
  height: number
}

export function Treemap({ areas, width, height }: TreemapProps) {
  const layout = useMemo(() => {
    // D3 computes layout positions
    const root = hierarchy({ name: 'Budget', children: areas })
      .sum(d => 'operatingBudget' in d ? Number(d.operatingBudget) : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const treemapLayout = treemap<typeof root.data>()
      .size([width, height])
      .padding(4)
      .tile(treemapSquarify)

    return treemapLayout(root)
  }, [areas, width, height])

  // React renders SVG
  return (
    <svg width={width} height={height} role="img" aria-label="Budget treemap">
      {layout.leaves().map((leaf) => (
        <g key={leaf.data.name}>
          <rect
            x={leaf.x0}
            y={leaf.y0}
            width={leaf.x1 - leaf.x0}
            height={leaf.y1 - leaf.y0}
            fill={leaf.data.color ?? '#6B7280'}
            // ... event handlers
          />
        </g>
      ))}
    </svg>
  )
}
```

### Pattern 2: Server Component Data Fetching + Client Component Rendering
**What:** Server components fetch and serialize data; client components receive props and render interactively.
**When to use:** Every page with charts.

```typescript
// src/app/explorer/page.tsx (Server Component)
import { getStrategicAreas } from '@/lib/db/queries'
import { Treemap } from '@/components/charts/Treemap'
import { DataTableToggle } from '@/components/charts/DataTableToggle'

export default async function ExplorerPage() {
  const areas = await getStrategicAreas()

  return (
    <div>
      <h1>Budget Explorer</h1>
      <DataTableToggle
        chartLabel="Strategic area treemap"
        tableData={areas}
        tableColumns={['name', 'operatingBudget', 'centsPerDollar']}
      >
        <Treemap areas={areas} />
      </DataTableToggle>
    </div>
  )
}
```

### Pattern 3: Responsive Chart Container with ResizeObserver
**What:** A wrapper component that measures its container and passes width/height to chart components.
**When to use:** Treemap and donut chart (need to fill available space).

```typescript
'use client'

import { useRef, useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

type ChartContainerProps = {
  aspectRatio?: number  // e.g., 16/9
  minHeight?: number
  children: (dimensions: { width: number; height: number }) => React.ReactNode
}

export function ChartContainer({ aspectRatio, minHeight = 300, children }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      const height = aspectRatio ? width / aspectRatio : Math.max(minHeight, width * 0.6)
      setDimensions({ width, height })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [aspectRatio, minHeight])

  return (
    <div ref={containerRef} className="w-full">
      {dimensions ? children(dimensions) : <Skeleton className="w-full" height={`${minHeight}px`} />}
    </div>
  )
}
```

### Pattern 4: BigInt Cents to Chart-Safe Numbers
**What:** Convert serialized BigInt cents strings to plain numbers for D3 consumption.
**When to use:** Before passing any budget data to D3 layout functions.

```typescript
// src/lib/chart-utils.ts

/**
 * Convert BigInt cents (stored as string) to a Number for chart libraries.
 * D3 and Recharts require plain numbers, not strings.
 *
 * WARNING: JavaScript Number loses precision above 2^53.
 * Max safe value: $90,071,992,547,409.91 -- well above any county budget.
 */
export function toChartValue(centsString: string): number {
  return Number(centsString)
}

/**
 * Convert cents string to dollar amount for display in chart labels.
 */
export function centsToDollars(centsString: string): number {
  return Number(centsString) / 100
}
```

### Anti-Patterns to Avoid
- **D3 DOM manipulation inside React:** Never use `d3.select()` to create/modify SVG elements. React owns the DOM. Use D3 only for `.hierarchy()`, `.treemap()`, `.pie()`, `.arc()` -- math functions.
- **Importing full `d3` package:** Import only the specific modules needed. `import { hierarchy, treemap } from 'd3-hierarchy'` not `import * as d3 from 'd3'`.
- **Passing BigInt to chart props:** Always convert to Number first via `toChartValue()`. D3 math functions choke on strings.
- **Server-side D3 rendering:** D3 layout functions are pure math and can run on the server, but SVG rendering with event handlers requires `'use client'`. Keep layout computation in the client component via `useMemo`.
- **Inline styles for chart colors:** Use the DB `strategic_areas.color` column, not hardcoded hex values. This ensures consistency with the data pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Treemap rectangle positions | Manual area subdivision algorithm | `d3-hierarchy` treemap layout | Squarified algorithm handles edge cases (tiny slices, aspect ratios) that take weeks to get right |
| Donut/pie arc paths | Manual SVG arc path math | `d3-shape` pie + arc generators | Arc path `d` attribute calculation involves trigonometry with edge cases at 0/360 degrees |
| Tooltip positioning | Manual absolute positioning + collision detection | `@floating-ui/react` (already installed) | Handles viewport overflow, scroll containers, flip/shift automatically |
| Responsive chart sizing | `window.addEventListener('resize')` + debounce | `ResizeObserver` in a `ChartContainer` wrapper | Works with container queries, not just viewport; more precise; handles CSS layout changes |
| Data table sorting | Custom sort implementation | Native `Array.sort()` with state toggle | Only 9 strategic areas or ~6-10 departments per area; no need for a table library |
| Currency formatting | `new Intl.NumberFormat()` inline | Existing `formatDollarsAbbreviated` / `formatDollarsFull` | Already built and tested in Phase 2; consistent formatting across the app |

**Key insight:** D3's value is in its layout algorithms, not its DOM manipulation. Use D3 modules as "math libraries" and let React render everything.

## Common Pitfalls

### Pitfall 1: BigInt String Serialization Breaking Charts
**What goes wrong:** Passing `"857560600000"` (string) to D3's `.sum()` or Recharts `dataKey` results in NaN or zero-sized elements.
**Why it happens:** All monetary values in the database are BigInt, serialized to strings for JSON transport between server and client components.
**How to avoid:** Always convert via `toChartValue()` before any chart computation. Create a single utility and use it everywhere.
**Warning signs:** Treemap renders all rectangles the same size, or donut chart shows no slices.

### Pitfall 2: D3 and React Fighting Over the DOM
**What goes wrong:** Using `d3.select(ref.current).append('rect')` inside `useEffect` creates elements outside React's virtual DOM. React can't clean them up on re-render, causing duplicates.
**Why it happens:** Traditional D3 tutorials use imperative DOM manipulation. Mixing this with React's declarative model causes stale or duplicated elements.
**How to avoid:** Use D3 ONLY for computation (`hierarchy()`, `treemap()`, `pie()`, `arc()`). Let React render all `<rect>`, `<path>`, `<text>` elements via JSX.
**Warning signs:** Chart elements double on each re-render, or React DevTools shows no children inside the SVG.

### Pitfall 3: Treemap Rendering Before Container Has Dimensions
**What goes wrong:** Component renders with width=0 or height=0 before the container is measured, producing an invisible or collapsed treemap.
**Why it happens:** `useRef` returns null on first render; ResizeObserver fires asynchronously.
**How to avoid:** Use the `ChartContainer` pattern that renders a `Skeleton` placeholder until dimensions are available. Gate chart rendering on `dimensions !== null`.
**Warning signs:** Chart flashes or is invisible on first load.

### Pitfall 4: Missing `root.sum()` Before Treemap Layout
**What goes wrong:** D3 treemap produces all rectangles with zero area.
**Why it happens:** `d3.hierarchy()` creates the tree structure but does NOT compute aggregate values. You MUST call `.sum(d => d.value)` to propagate values up the hierarchy.
**How to avoid:** Always chain: `hierarchy(data).sum(accessor).sort(comparator)` before passing to `treemap()`.
**Warning signs:** All treemap cells render as thin lines or are invisible.

### Pitfall 5: Waffle Chart Cents Not Summing to 100
**What goes wrong:** The 10x10 grid has gaps or overflows because `cents_per_dollar` values across 9 strategic areas don't sum to exactly 100.
**Why it happens:** Rounding in the data pipeline. The budget doesn't divide evenly into 100 pennies.
**How to avoid:** Validate in the query layer that `SUM(cents_per_dollar) = 100` for the current fiscal year. If it's 99 or 101, add/subtract from the largest area (rounding error adjustment). Document this in the code.
**Warning signs:** Empty squares in the grid, or more than 100 squares rendered.

### Pitfall 6: SVG Click Events Not Firing on Mobile Touch
**What goes wrong:** `onClick` on `<rect>` elements doesn't fire on mobile Safari.
**Why it happens:** SVG elements without `cursor: pointer` or explicit touch event handling can be ignored by mobile browsers.
**How to avoid:** Add `cursor: pointer` style and `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) to all clickable chart elements. Also add `touch-action: manipulation` CSS.
**Warning signs:** Treemap cells work on desktop but not on mobile.

### Pitfall 7: Accessibility -- Charts Without Text Alternatives
**What goes wrong:** Screen readers announce nothing meaningful for SVG charts.
**Why it happens:** SVG elements have no inherent semantic meaning. Without ARIA attributes, they're invisible to assistive technology.
**How to avoid:** Use `role="img"` + `aria-label` on the `<svg>` element. Add a `<title>` and `<desc>` inside the SVG. Implement the `DataTableToggle` component that shows a `<table>` alternative. The table should be the DEFAULT for screen reader users (use `aria-hidden="true"` on the SVG and visually hide the table with CSS that screen readers can still read).
**Warning signs:** Lighthouse accessibility audit flags missing labels.

## Code Examples

### Treemap with Click Navigation

```typescript
// src/components/charts/Treemap.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'
import { ChartTooltip } from './ChartTooltip'

type AreaData = {
  name: string
  slug: string
  color: string | null
  operatingBudget: string  // cents as string
}

type TreemapProps = {
  areas: AreaData[]
  width: number
  height: number
}

export function Treemap({ areas, width, height }: TreemapProps) {
  const router = useRouter()
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)

  const leaves = useMemo(() => {
    const root = hierarchy({ name: 'Budget', children: areas })
      .sum(d => 'operatingBudget' in d ? toChartValue(d.operatingBudget) : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    return treemap<{ name: string; children?: AreaData[] }>()
      .size([width, height])
      .padding(3)
      .round(true)
      .tile(treemapSquarify)(root)
      .leaves()
  }, [areas, width, height])

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Strategic area budget treemap. Use the data table toggle for an accessible alternative."
    >
      <title>Miami-Dade County Budget by Strategic Area</title>
      {leaves.map((leaf) => {
        const d = leaf.data as AreaData
        const w = leaf.x1 - leaf.x0
        const h = leaf.y1 - leaf.y0
        const isHovered = hoveredArea === d.slug

        return (
          <g
            key={d.slug}
            onClick={() => router.push(`/explorer/${d.slug}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.push(`/explorer/${d.slug}`)
              }
            }}
            onMouseEnter={() => setHoveredArea(d.slug)}
            onMouseLeave={() => setHoveredArea(null)}
            role="button"
            tabIndex={0}
            aria-label={`${d.name}: ${formatDollarsAbbreviated(d.operatingBudget)} operating budget`}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={leaf.x0}
              y={leaf.y0}
              width={w}
              height={h}
              fill={d.color ?? '#6B7280'}
              opacity={hoveredArea && !isHovered ? 0.5 : 1}
              rx={4}
              className="transition-opacity duration-150"
            />
            {w > 60 && h > 30 && (
              <text
                x={leaf.x0 + 8}
                y={leaf.y0 + 20}
                fill="white"
                fontSize={w > 120 ? 14 : 11}
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {d.name}
              </text>
            )}
            {w > 60 && h > 50 && (
              <text
                x={leaf.x0 + 8}
                y={leaf.y0 + 38}
                fill="rgba(255,255,255,0.8)"
                fontSize={12}
                style={{ pointerEvents: 'none' }}
              >
                {formatDollarsAbbreviated(d.operatingBudget)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

### Donut Chart with D3 Arc Generator

```typescript
// src/components/charts/DonutChart.tsx
'use client'

import { useMemo } from 'react'
import { pie, arc } from 'd3-shape'
import { scaleOrdinal } from 'd3-scale'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'

type RevenueItem = {
  name: string
  amount: string   // cents as string
  percentage: number
}

// Revenue-specific palette (NOT strategic area colors)
const REVENUE_COLORS = [
  '#2563EB',  // Property Tax (blue -- dominant)
  '#7C3AED',  // Proprietary (purple)
  '#059669',  // Sales Tax (green)
  '#D97706',  // Federal/State Grants (amber)
  '#DC2626',  // Miscellaneous (red)
  '#0891B2',  // Misc State Revenue (cyan)
  '#4B5563',  // Gas Tax (gray)
]

type DonutChartProps = {
  data: RevenueItem[]
  width: number
  height: number
}

export function DonutChart({ data, width, height }: DonutChartProps) {
  const radius = Math.min(width, height) / 2
  const innerRadius = radius * 0.55  // donut hole

  const colorScale = useMemo(
    () => scaleOrdinal<string>().domain(data.map(d => d.name)).range(REVENUE_COLORS),
    [data]
  )

  const arcs = useMemo(() => {
    const pieGenerator = pie<RevenueItem>()
      .value(d => toChartValue(d.amount))
      .sort(null)  // preserve data order

    const arcGenerator = arc<d3.PieArcDatum<RevenueItem>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)

    return pieGenerator(data).map(d => ({
      path: arcGenerator(d) ?? '',
      centroid: arcGenerator.centroid(d),
      data: d.data,
      color: colorScale(d.data.name),
    }))
  }, [data, radius, innerRadius, colorScale])

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Revenue sources donut chart"
    >
      <g transform={`translate(${width / 2},${height / 2})`}>
        {arcs.map(({ path, data: d, color }) => (
          <path
            key={d.name}
            d={path}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        ))}
      </g>
    </svg>
  )
}
```

### Waffle Chart (Pure CSS Grid, No D3)

```typescript
// src/components/charts/WaffleChart.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDollarsAbbreviated } from '@/lib/format'
import clsx from 'clsx'

type WaffleArea = {
  name: string
  slug: string
  color: string
  centsPerDollar: number
  operatingBudget: string
}

type WaffleChartProps = {
  areas: WaffleArea[]
  size?: 'sm' | 'md'  // sm for mobile, md for desktop
}

export function WaffleChart({ areas, size = 'md' }: WaffleChartProps) {
  const router = useRouter()
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)

  // Build 100 squares, colored by area
  const squares = useMemo(() => {
    const result: WaffleArea[] = []
    for (const area of areas) {
      for (let i = 0; i < (area.centsPerDollar ?? 0); i++) {
        result.push(area)
      }
    }
    return result
  }, [areas])

  const cellSize = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'

  return (
    <div>
      <div
        className="grid grid-cols-10 gap-1"
        role="img"
        aria-label="Where each dollar goes: penny allocation by strategic area"
      >
        {squares.map((sq, i) => (
          <button
            key={i}
            className={clsx(
              cellSize,
              'rounded-sm transition-opacity duration-150',
              hoveredArea && hoveredArea !== sq.slug && 'opacity-30'
            )}
            style={{ backgroundColor: sq.color }}
            onMouseEnter={() => setHoveredArea(sq.slug)}
            onMouseLeave={() => setHoveredArea(null)}
            onClick={() => router.push(`/explorer/${sq.slug}`)}
            aria-label={`${sq.name}: ${sq.centsPerDollar} cents`}
          />
        ))}
      </div>
      {/* Legend */}
      <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {areas.map(area => (
          <li key={area.slug} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: area.color }}
            />
            <span>{area.name}</span>
            <span className="text-text-secondary ml-auto">
              {area.centsPerDollar} cents
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### DataTableToggle Component

```typescript
// src/components/charts/DataTableToggle.tsx
'use client'

import { useState } from 'react'
import clsx from 'clsx'

type Column<T> = {
  key: keyof T
  label: string
  format?: (value: T[keyof T]) => string
  align?: 'left' | 'right'
}

type DataTableToggleProps<T extends Record<string, unknown>> = {
  chartLabel: string
  data: T[]
  columns: Column<T>[]
  children: React.ReactNode  // the chart component
}

export function DataTableToggle<T extends Record<string, unknown>>({
  chartLabel,
  data,
  columns,
  children,
}: DataTableToggleProps<T>) {
  const [showTable, setShowTable] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowTable(!showTable)}
          className="text-sm text-mdc-blue hover:underline"
          aria-pressed={showTable}
        >
          {showTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {showTable ? (
        <div role="region" aria-label={`Data table: ${chartLabel}`}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={clsx(
                      'py-2 px-3 font-medium text-text-secondary',
                      col.align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={clsx(
                        'py-2 px-3',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.format ? col.format(row[col.key]) : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div aria-hidden={false}>
          {children}
        </div>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import * as d3 from 'd3'` (full bundle) | Import specific modules: `d3-hierarchy`, `d3-shape` | D3 v4+ (2016), still best practice | ~240KB to ~15-20KB bundle reduction |
| D3 imperatively creates DOM elements | D3 computes layout, React renders SVG | React hooks era (2019+) | No DOM conflicts, proper cleanup, React DevTools work |
| `window.onresize` + debounce | `ResizeObserver` API | Widely supported since 2020 | Per-element sizing, no debounce needed, works with CSS changes |
| `viewBox` for responsive SVGs | `ResizeObserver` + explicit width/height | 2022+ | More control over text sizing and padding that doesn't scale |
| Nivo wrapper library | Direct D3 modules | User decision for this phase | Full control over treemap behavior, no wrapper abstraction leak |

**Deprecated/outdated:**
- **Nivo for treemap/donut**: Originally planned in v1.0 research. User changed to D3.js in Phase 3 context discussion. Nivo has no built-in drill-down state management, and D3 gives full control.
- **`d3.select().append()` pattern in React**: This imperative pattern conflicts with React's rendering model. Use `useMemo` for D3 layout computation instead.

## Discretion Recommendations

For areas marked as "Claude's Discretion" in CONTEXT.md:

### D3 Implementation: Hooks + useMemo (not useEffect)
**Recommendation:** Use `useMemo` for D3 layout computation (it's pure math), not `useEffect` (which implies side effects). React renders SVG via JSX. Only use `useRef` for the container measurement via `ResizeObserver`.

### Treemap Layout Algorithm: treemapSquarify (default)
**Recommendation:** Use `treemapSquarify` (D3's default). It produces the most readable rectangles with aspect ratios close to the golden ratio. Binary layout creates awkward thin strips. Slice-and-dice is only useful for animated transitions (use `treemapResquarify` if we add animations later).

### Tooltip Styling and Positioning
**Recommendation:** Create a shared `ChartTooltip` component using `@floating-ui/react` (already installed). Style matching existing `BudgetTerm` tooltip: white background, border, rounded-md, small shadow. Position with `offset(8)`, `flip()`, `shift()`.

### Loading Skeleton Designs
**Recommendation:** Use the existing `Skeleton` component. For treemap: single full-width skeleton matching container aspect ratio. For donut: circular skeleton. For waffle: 10x10 grid of small square skeletons.

### Animation/Transition Choices
**Recommendation:** Keep animations minimal for a civic tool -- fast, functional, not decorative. Use CSS `transition: opacity 150ms` for hover states on treemap cells. No entrance animations on initial load (data should appear immediately). CSS transitions are more performant than D3 transitions in React.

### Revenue Donut Color Palette
**Recommendation:** Use a 7-color palette distinct from strategic area colors. Suggested: blues/purples/greens/ambers that work well on white backgrounds and pass WCAG contrast checks. Property Tax (dominant source) should be the most prominent blue (#2563EB).

### Responsive Behavior 768px-Desktop
**Recommendation:** At 768px show the treemap (not mobile cards). Between 768-1024px the treemap fills full width with smaller text labels. Above 1024px the treemap has max-width with centered layout. Mobile card fallback is strictly `< 768px` (below `md` breakpoint).

### Data Table Defaults
**Recommendation:** Default sort: by budget amount descending (largest first). Columns: Name, Operating Budget (formatted), % of Total, Cents per Dollar (where applicable). Right-align numeric columns. No pagination needed (max 9 strategic areas, max ~10 departments per area).

## Open Questions

1. **Cents per dollar rounding**
   - What we know: The `strategic_area_budgets.cents_per_dollar` column stores integer cents per strategic area. There are 9 strategic areas.
   - What's unclear: Whether the sum of all 9 areas' `cents_per_dollar` equals exactly 100. Rounding during data pipeline may cause it to be 99 or 101.
   - Recommendation: Add a validation query in the data fetching layer. If sum is not 100, adjust the largest area by the difference. Document this as an expected rounding correction.

2. **Revenue donut data completeness**
   - What we know: Schema has `revenue_sources` (7 categories) and `revenue_by_source` table with amounts per fiscal year.
   - What's unclear: Whether revenue data for FY 2025-26 has been seeded by the data pipeline.
   - Recommendation: The query layer should handle empty results gracefully (show "No revenue data available" instead of an empty chart). Verify data exists before building the donut chart component.

3. **Department stub page structure**
   - What we know: Phase 3 creates `/department/[slug]` stub routes. Phase 4 fills in content.
   - What's unclear: What the stub page should show (just a heading? a skeleton? a "coming soon" message?).
   - Recommendation: Show department name, strategic area breadcrumb, and a "Details coming soon" placeholder with the existing Skeleton component. This gives Phase 4 a clear integration point.

## Sources

### Primary (HIGH confidence)
- [D3 Treemap API](https://d3js.org/d3-hierarchy/treemap) - Complete API reference for treemap layout, tiling methods, padding options
- [React Graph Gallery - Treemap](https://www.react-graph-gallery.com/treemap) - React + D3 treemap implementation pattern with code examples
- [React Graph Gallery - Donut](https://www.react-graph-gallery.com/donut) - React + D3 donut chart with pie/arc generators
- [Floating UI React Docs](https://floating-ui.com/docs/react) - Tooltip positioning API (library already installed in project)
- [D3 official site](https://d3js.org/) - Module documentation

### Secondary (MEDIUM confidence)
- [pganalyze - Building SVG Components with React.js and d3.js](https://pganalyze.com/blog/building-svg-components-in-react) - "D3 computes, React renders" pattern
- [Pluralsight - D3 Treemap in React](https://www.pluralsight.com/resources/blog/guides/d3-treemap-in-react) - Treemap component tutorial with animation patterns
- [A11Y Collective - Accessible SVG](https://www.a11y-collective.com/blog/svg-accessibility/) - SVG accessibility patterns (role, title, desc)
- [Smashing Magazine - Accessible SVG Patterns](https://www.smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/) - Screen reader compatibility for SVG

### Tertiary (LOW confidence)
- [npm: d3-hierarchy 3.1.2](https://www.npmjs.com/package/d3-hierarchy) - Version number from npm listing (may have updated)
- [npm: recharts 3.7.0](https://www.npmjs.com/package/recharts) - Version from GitHub releases page (Jan 2025)
- [npm: d3-shape 3.2.0](https://www.npmjs.com/package/d3-shape) - Version from npm listing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - D3 modules are stable (v3.x unchanged for years), well-documented, and the "D3 computes, React renders" pattern is established consensus
- Architecture: HIGH - Next.js App Router server/client component split is well-understood; the project already uses this pattern in Phase 2
- Pitfalls: HIGH - BigInt serialization issues, D3/React DOM conflicts, and SVG accessibility are well-documented problems with known solutions
- Waffle chart: HIGH - Pure CSS Grid implementation; no library risk
- Donut chart: HIGH - D3 pie/arc generators are the standard approach

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable libraries, 30-day window)
