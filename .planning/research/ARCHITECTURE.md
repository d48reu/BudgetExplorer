# Architecture Patterns: v1.1 Integration

**Domain:** Civic budget visualization -- adding interactive Nivo charts, tax calculator, AI descriptions, full-text search, and SEO to existing Next.js 16 App Router application
**Researched:** 2026-02-28
**Confidence:** HIGH
**Focus:** How NEW features integrate with the existing v1.0 architecture (not a from-scratch design)

## Existing Architecture (v1.0 Baseline)

What already exists and must be preserved:

```
budget-explorer-web/src/
  app/
    layout.tsx          # Root layout: Inter font, Navbar, Footer, MobileTabBar
    page.tsx            # Homepage: HeroBanner, QuickStats, CTASection + viz placeholders
    globals.css         # Tailwind v4 @theme tokens (MDC colors, spacing, z-index)
    glossary/page.tsx   # Static glossary page with Breadcrumbs
  components/
    homepage/           # HeroBanner ('use client'), QuickStats ('use client'), CTASection
    layout/             # Navbar ('use client'), MobileTabBar, Footer, Breadcrumbs
    ui/                 # Card, Button, Skeleton, BudgetTerm ('use client' tooltip)
  lib/
    db/queries.ts       # getCurrentFiscalYear(), getStrategicAreas(), getQuickStats()
    prisma.ts           # PrismaClient singleton (PrismaPg adapter, Pool)
    format.ts           # formatDollarsAbbreviated(), formatDollarsFull(), formatYoYChange()
    glossary.ts         # GLOSSARY_TERMS array
    nav-config.ts       # NAV_ITEMS: Home, Explorer, Calculator, Glossary
  types/
    budget.ts           # SerializedFiscalYear, SerializedStrategicArea, QuickStats
  generated/prisma/     # Prisma 7 generated client
prisma/
  schema.prisma         # 14 models including budget_descriptions, millage_rates, revenue_by_source
```

**Key architectural decisions already locked in:**
- BigInt cents stored in DB, serialized to strings at the query layer (not numbers -- v1.0 used string serialization via `.toString()`)
- Server Components fetch data via `lib/db/queries.ts`, pass serialized props to Client Components
- `'use client'` directive on all interactive components (HeroBanner uses react-countup, QuickStats uses BudgetTerm tooltips)
- Navigation routes already defined: `/explorer`, `/calculator`, `/glossary` (Explorer and Calculator are dead links)
- `dynamic = 'force-dynamic'` on homepage (runtime DB queries, not static generation)

## Updated System Diagram (v1.1 Additions)

```
                    OFFLINE (annual data pipeline)
  +--------------------------------------------------+
  |  Budget PDF --> Python Pipeline --> JSON seed      |
  |                                                    |
  |  NEW: describe.py calls Claude API for AI          |
  |  descriptions (summary, detailed, key_changes)     |
  |  --> ai-descriptions.json seeded to DB             |
  +--------------------------------------------------+
                         |
                    SEED TIME (prisma db seed)
  +--------------------------------------------------+
  |  JSON files --> Prisma seed script --> PostgreSQL   |
  |                                                    |
  |  NEW: search_vector tsvector column + GIN index    |
  |  on departments table (via raw SQL migration)      |
  +--------------------------------------------------+
                         |
           RUNTIME (Next.js 16 on Vercel)
  +--------------------------------------------------+
  |                                                    |
  |  SERVER COMPONENTS (data fetching layer)           |
  |  +----------------------------------------------+  |
  |  | EXISTING: queries.ts (fiscal year, stats)    |  |
  |  | NEW: explorer-queries.ts                     |  |
  |  |   - getTreemapData()                         |  |
  |  |   - getSunburstData()                        |  |
  |  |   - getRevenueDonutData()                    |  |
  |  |   - getPennyVizData()                        |  |
  |  | NEW: department-queries.ts                   |  |
  |  |   - getDepartmentBySlug()                    |  |
  |  |   - getDepartmentYoY()                       |  |
  |  |   - getDepartmentExpenditures()              |  |
  |  |   - getAllDepartmentSlugs()                   |  |
  |  | NEW: calculator-queries.ts                   |  |
  |  |   - getMillageRates()                        |  |
  |  |   - getStrategicAreaBreakdown()              |  |
  |  | NEW: search-queries.ts                       |  |
  |  |   - fullTextSearch() via $queryRaw           |  |
  |  +----------------------------------------------+  |
  |         | serialized props (strings, not BigInt)    |
  |         v                                          |
  |  CLIENT COMPONENTS ('use client')                  |
  |  +----------------------------------------------+  |
  |  | EXISTING: HeroBanner, QuickStats, BudgetTerm |  |
  |  | NEW: BudgetTreemap (@nivo/treemap)           |  |
  |  | NEW: BudgetSunburst (@nivo/sunburst)         |  |
  |  | NEW: RevenueDonut (@nivo/pie)                |  |
  |  | NEW: PennyViz (custom SVG)                   |  |
  |  | NEW: YoYBarChart (@nivo/bar)                 |  |
  |  | NEW: ExpenditureBreakdown (@nivo/pie)        |  |
  |  | NEW: TaxCalculatorForm (form + computation)  |  |
  |  | NEW: TaxBreakdownDisplay (results)           |  |
  |  | NEW: SearchBar (input + debounce)            |  |
  |  | NEW: SearchResults (result cards)            |  |
  |  +----------------------------------------------+  |
  |                                                    |
  |  API ROUTES (Route Handlers)                       |
  |  +----------------------------------------------+  |
  |  | NEW: /api/search/route.ts (GET)              |  |
  |  |   - Full-text search via PostgreSQL tsvector  |  |
  |  |   - Returns serialized results               |  |
  |  +----------------------------------------------+  |
  +--------------------------------------------------+
```

## New Routes and File Structure

### Routes to Create

| Route | Type | Data Source | Key Components |
|-------|------|-------------|----------------|
| `/explorer` | Server Component page | `explorer-queries.ts` | BudgetTreemap, BudgetSunburst, PennyViz |
| `/explorer/revenue` | Server Component page | `explorer-queries.ts` | RevenueDonut, revenue data table |
| `/department/[slug]` | Dynamic Server Component | `department-queries.ts` | AI description, YoYBarChart, ExpenditureBreakdown |
| `/calculator` | Server Component page | `calculator-queries.ts` | TaxCalculatorForm, TaxBreakdownDisplay |
| `/search` | Server Component page | `searchParams` prop | SearchBar, SearchResults |
| `/api/search` | Route Handler (GET) | `search-queries.ts` | JSON response |

### New Files to Create

```
src/
  app/
    explorer/
      page.tsx                    # Budget explorer with treemap + sunburst
      revenue/
        page.tsx                  # Revenue sources donut chart page
    department/
      [slug]/
        page.tsx                  # Department detail with AI description
        loading.tsx               # Skeleton loading state
    calculator/
      page.tsx                    # Tax calculator page
    search/
      page.tsx                    # Search results page
    api/
      search/
        route.ts                  # Full-text search API endpoint
    sitemap.ts                    # Dynamic sitemap for SEO
    robots.ts                     # Robots.txt generation
  components/
    charts/
      BudgetTreemap.tsx           # Nivo ResponsiveTreeMapHtml with drill-down
      BudgetSunburst.tsx          # Nivo ResponsiveSunburst with drill-down
      RevenueDonut.tsx            # Nivo ResponsivePie for revenue sources
      PennyViz.tsx                # Custom penny/dollar segment visualization
      YoYBarChart.tsx             # Nivo ResponsiveBar for year-over-year
      ExpenditureBreakdown.tsx    # Nivo ResponsivePie for expenditure categories
      ChartContainer.tsx          # Shared wrapper: loading, error, a11y table fallback
    calculator/
      TaxCalculatorForm.tsx       # Property value input + homestead toggle
      TaxBreakdownDisplay.tsx     # Personalized results with per-area breakdown
    department/
      DepartmentHeader.tsx        # Name, strategic area, AI summary
      DepartmentYoY.tsx           # Year-over-year comparison section
      ExpenditureTable.tsx        # Sortable expenditure category table
    search/
      SearchBar.tsx               # Debounced search input
      SearchResults.tsx           # Result cards with highlights
  lib/
    db/
      explorer-queries.ts         # Treemap, sunburst, revenue, penny data
      department-queries.ts       # Department detail, YoY, expenditures
      calculator-queries.ts       # Millage rates, strategic area breakdown
      search-queries.ts           # Full-text search via $queryRaw
    chart-colors.ts               # Strategic area color mapping for Nivo
  types/
    charts.ts                     # NivoTreemapNode, NivoSunburstNode, etc.
    calculator.ts                 # TaxInput, TaxBreakdown types
    search.ts                     # SearchResult, SearchParams types
```

### Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `src/app/page.tsx` | Add BudgetTreemap, PennyViz, RevenueDonut sections below QuickStats | Homepage visualization placeholders already exist in comments |
| `src/lib/nav-config.ts` | Add 'Search' and 'Departments' nav items, update icons | New routes need navigation |
| `src/app/layout.tsx` | Add per-route SEO metadata template, possibly add search in header | SEO enhancement |
| `src/app/globals.css` | Add chart-specific CSS custom properties if needed | Nivo chart styling |
| `src/types/budget.ts` | Add SerializedDepartmentDetail, SerializedRevenueSource types | New data shapes |
| `package.json` | Add @nivo/* packages, @anthropic-ai/sdk (if server-side AI) | New dependencies |

## Component Architecture

### Pattern 1: Nivo Charts as Client Component Islands

**What:** Every Nivo chart component gets `'use client'` at the top. The parent Server Component page fetches data via Prisma, transforms it into Nivo's expected data shape, and passes it as props. The chart component itself is purely presentational + interactive.

**Why Nivo requires this:** Nivo uses React Context internally (`createContext`), which is only available in Client Components. Attempting to render any Nivo chart in a Server Component throws: `TypeError: createContext only works in Client Components`.

**Data transformation happens in the query layer, NOT the chart component.** The query function returns data already shaped for Nivo (with `id`, `value`, `children` keys). This keeps chart components thin and testable.

**Confidence:** HIGH (verified via [Nivo GitHub Issue #2626](https://github.com/plouc/nivo/issues/2626))

```typescript
// src/lib/db/explorer-queries.ts (SERVER ONLY)
import prisma from '@/lib/prisma'

export type TreemapNode = {
  id: string           // Nivo identity key
  value?: number       // Nivo value key (cents converted to dollars)
  children?: TreemapNode[]
  color?: string       // Strategic area hex color
  slug?: string        // For navigation on click
}

export async function getTreemapData(): Promise<TreemapNode> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })
  if (!fy) throw new Error('Fiscal year not found')

  const areas = await prisma.strategic_areas.findMany({
    include: {
      departments: {
        include: {
          department_budgets: {
            where: { fiscal_year_id: fy.id, is_actual: false },
          },
        },
      },
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id },
      },
    },
    orderBy: { display_order: 'asc' },
  })

  return {
    id: 'Miami-Dade County Budget',
    children: areas.map((area) => ({
      id: area.name,
      color: area.color ?? '#6B7280',
      slug: area.slug,
      children: area.departments.map((dept) => {
        const budget = dept.department_budgets[0]
        return {
          id: dept.name,
          value: Number(budget?.total_budget ?? 0n) / 100, // cents to dollars
          slug: dept.slug,
        }
      }),
    })),
  }
}
```

```typescript
// src/components/charts/BudgetTreemap.tsx (CLIENT COMPONENT)
'use client'

import { useState, useCallback } from 'react'
import { ResponsiveTreeMapHtml } from '@nivo/treemap'
import { useRouter } from 'next/navigation'
import type { TreemapNode } from '@/lib/db/explorer-queries'

type Props = {
  data: TreemapNode
}

export function BudgetTreemap({ data }: Props) {
  const router = useRouter()
  const [currentData, setCurrentData] = useState<TreemapNode>(data)
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; data: TreemapNode }[]>([])

  const handleClick = useCallback((node: { data: TreemapNode }) => {
    const clickedNode = node.data
    if (clickedNode.children && clickedNode.children.length > 0) {
      // Drill down into strategic area
      setBreadcrumbs(prev => [...prev, { label: currentData.id, data: currentData }])
      setCurrentData(clickedNode)
    } else if (clickedNode.slug) {
      // Navigate to department page
      router.push(`/department/${clickedNode.slug}`)
    }
  }, [currentData, router])

  const handleBreadcrumbClick = useCallback((index: number) => {
    const target = breadcrumbs[index]
    setCurrentData(target.data)
    setBreadcrumbs(prev => prev.slice(0, index))
  }, [breadcrumbs])

  return (
    <div>
      <nav aria-label="Treemap breadcrumb" className="flex gap-2 mb-4 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <button
            key={i}
            onClick={() => handleBreadcrumbClick(i)}
            className="text-mdc-blue hover:underline"
          >
            {crumb.label} &gt;
          </button>
        ))}
        <span className="font-semibold">{currentData.id}</span>
      </nav>
      <div style={{ height: 500 }}>
        <ResponsiveTreeMapHtml
          data={currentData}
          identity="id"
          value="value"
          valueFormat="$.2s"
          label="id"
          labelSkipSize={40}
          onClick={handleClick}
          colors={(node) => node.data.color ?? '#6B7280'}
          borderWidth={2}
          borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
          animate={true}
          motionConfig="gentle"
        />
      </div>
    </div>
  )
}
```

```typescript
// src/app/explorer/page.tsx (SERVER COMPONENT)
import { getTreemapData, getSunburstData, getPennyVizData } from '@/lib/db/explorer-queries'
import { BudgetTreemap } from '@/components/charts/BudgetTreemap'
import { BudgetSunburst } from '@/components/charts/BudgetSunburst'
import { PennyViz } from '@/components/charts/PennyViz'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

export const metadata = {
  title: 'Explore the Budget',
  description: "Interactive treemap and sunburst visualizations of Miami-Dade County's $13.2 billion budget.",
}

export default async function ExplorerPage() {
  const [treemapData, sunburstData, pennyData] = await Promise.all([
    getTreemapData(),
    getSunburstData(),
    getPennyVizData(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-(--spacing-section)">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Explorer' }]} />
      <h1 className="text-3xl font-heading font-bold mt-6 mb-2">Explore the Budget</h1>
      <p className="text-text-secondary mb-8">
        Click any area to drill down. Click a department to see its detail page.
      </p>

      <section aria-label="Budget treemap">
        <BudgetTreemap data={treemapData} />
      </section>

      <section aria-label="Budget sunburst" className="mt-(--spacing-section)">
        <BudgetSunburst data={sunburstData} />
      </section>

      <section aria-label="Penny visualization" className="mt-(--spacing-section)">
        <PennyViz data={pennyData} />
      </section>
    </div>
  )
}
```

### Pattern 2: Tax Calculator -- Server-Fetched Rates, Client-Side Computation

**What:** Millage rates and strategic area budget proportions are fetched by the Server Component and passed as props. All computation (taxable value calculation, per-area breakdown) happens client-side in the form component. No API call needed on form submit.

**Why this pattern:** The computation is purely mathematical (property value * millage rate = tax). The data (millage rates) is static for the fiscal year. Doing this client-side avoids unnecessary round-trips and makes the calculator feel instant.

**Homestead exemption:** Standard Florida homestead exemption logic: first $25,000 exempt from all taxes, next $25,000 taxable, next $25,000 exempt from non-school taxes only, remainder taxable. For simplicity and since this is county-only (not school board), apply $50,000 exemption when homestead toggle is on.

```typescript
// src/lib/db/calculator-queries.ts
import prisma from '@/lib/prisma'

export type MillageRateData = {
  authority: string
  rate: number     // decimal millage rate
  isCounty: boolean
}

export type StrategicAreaProportion = {
  name: string
  slug: string
  color: string
  proportion: number  // 0-1 fraction of operating budget
}

export async function getCalculatorData() {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })
  if (!fy) throw new Error('Fiscal year not found')

  const [millageRates, areaBudgets] = await Promise.all([
    prisma.millage_rates.findMany({
      where: { fiscal_year_id: fy.id },
      orderBy: { display_order: 'asc' },
    }),
    prisma.strategic_area_budgets.findMany({
      where: { fiscal_year_id: fy.id },
      include: { strategic_areas: true },
    }),
  ])

  const totalOperating = Number(fy.total_operating ?? 0n)

  return {
    millageRates: millageRates.map((mr) => ({
      authority: mr.authority,
      rate: Number(mr.millage_rate),
      isCounty: mr.is_county ?? true,
    })),
    strategicAreaProportions: areaBudgets
      .map((ab) => ({
        name: ab.strategic_areas.name,
        slug: ab.strategic_areas.slug,
        color: ab.strategic_areas.color ?? '#6B7280',
        proportion: totalOperating > 0
          ? Number(ab.operating_budget ?? 0n) / totalOperating
          : 0,
      }))
      .sort((a, b) => b.proportion - a.proportion),
    fiscalYear: fy.label,
  }
}
```

```typescript
// src/components/calculator/TaxCalculatorForm.tsx
'use client'

import { useState, useMemo } from 'react'
import type { MillageRateData, StrategicAreaProportion } from '@/lib/db/calculator-queries'

type Props = {
  millageRates: MillageRateData[]
  strategicAreaProportions: StrategicAreaProportion[]
}

export function TaxCalculatorForm({ millageRates, strategicAreaProportions }: Props) {
  const [propertyValue, setPropertyValue] = useState<number | ''>('')
  const [hasHomestead, setHasHomestead] = useState(false)

  const results = useMemo(() => {
    if (propertyValue === '' || propertyValue <= 0) return null

    const exemption = hasHomestead ? 50_000 : 0
    const taxableValue = Math.max(0, propertyValue - exemption)

    // Total county millage (sum of is_county=true rates)
    const countyMillage = millageRates
      .filter((mr) => mr.isCounty)
      .reduce((sum, mr) => sum + mr.rate, 0)

    const totalCountyTax = (taxableValue / 1000) * countyMillage

    // Per-area breakdown based on operating budget proportions
    const perAreaBreakdown = strategicAreaProportions.map((area) => ({
      ...area,
      taxAmount: totalCountyTax * area.proportion,
    }))

    return {
      taxableValue,
      countyMillage,
      totalCountyTax,
      perAreaBreakdown,
      millageDetails: millageRates.filter((mr) => mr.isCounty),
    }
  }, [propertyValue, hasHomestead, millageRates, strategicAreaProportions])

  return (
    <div>
      {/* Form inputs */}
      <label>Property Value ($)</label>
      <input
        type="number"
        value={propertyValue}
        onChange={(e) => setPropertyValue(e.target.value ? Number(e.target.value) : '')}
        min={0}
        step={1000}
      />
      <label>
        <input
          type="checkbox"
          checked={hasHomestead}
          onChange={(e) => setHasHomestead(e.target.checked)}
        />
        Homestead Exemption
      </label>

      {/* Results rendered by TaxBreakdownDisplay */}
      {results && <TaxBreakdownDisplay results={results} />}
    </div>
  )
}
```

### Pattern 3: Department Detail Pages with generateStaticParams

**What:** Pre-render all 35 department pages at build time using `generateStaticParams`. Each page shows: AI-generated description (from `budget_descriptions` table), year-over-year budget chart, expenditure category breakdown, and department metadata.

**Why generateStaticParams:** Budget data changes once per year. Static pages mean zero runtime DB queries for department pages, instant load from Vercel CDN, and perfect SEO (full HTML at crawl time).

**Dynamic metadata:** Each department page gets its own `<title>`, `<meta description>`, and Open Graph tags via `generateMetadata`.

**Confidence:** HIGH (Next.js official pattern)

```typescript
// src/app/department/[slug]/page.tsx
import { notFound } from 'next/navigation'
import {
  getDepartmentBySlug,
  getDepartmentYoY,
  getDepartmentExpenditures,
  getAllDepartmentSlugs,
} from '@/lib/db/department-queries'
import { DepartmentHeader } from '@/components/department/DepartmentHeader'
import { YoYBarChart } from '@/components/charts/YoYBarChart'
import { ExpenditureBreakdown } from '@/components/charts/ExpenditureBreakdown'
import { ExpenditureTable } from '@/components/department/ExpenditureTable'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import type { Metadata } from 'next'

// Pre-render all 35 department pages at build time
export async function generateStaticParams() {
  const slugs = await getAllDepartmentSlugs()
  return slugs.map((slug) => ({ slug }))
}

// Dynamic SEO metadata per department
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return {}

  return {
    title: dept.name,
    description: dept.aiSummary ?? `Explore ${dept.name}'s budget, spending breakdown, and year-over-year trends.`,
    openGraph: {
      title: `${dept.name} | Miami-Dade Budget Explorer`,
      description: dept.aiSummary ?? `Budget details for ${dept.name}`,
    },
  }
}

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [dept, yoyData, expenditures] = await Promise.all([
    getDepartmentBySlug(slug),
    getDepartmentYoY(slug),
    getDepartmentExpenditures(slug),
  ])

  if (!dept) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-(--spacing-section)">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Explorer', href: '/explorer' },
          { label: dept.strategicAreaName, href: `/explorer#${dept.strategicAreaSlug}` },
          { label: dept.name },
        ]}
      />

      <DepartmentHeader
        name={dept.name}
        strategicArea={dept.strategicAreaName}
        strategicAreaColor={dept.strategicAreaColor}
        totalBudget={dept.totalBudget}
        employeeCount={dept.employeeCount}
        aiSummary={dept.aiSummary}
        aiDetailedDescription={dept.aiDetailedDescription}
        aiKeyChanges={dept.aiKeyChanges}
      />

      <section aria-label="Year-over-year trends" className="mt-(--spacing-section)">
        <h2 className="text-xl font-heading font-semibold mb-4">Budget Over Time</h2>
        <YoYBarChart data={yoyData} />
      </section>

      <section aria-label="Expenditure breakdown" className="mt-(--spacing-section)">
        <h2 className="text-xl font-heading font-semibold mb-4">How the Money Is Spent</h2>
        <ExpenditureBreakdown data={expenditures.chartData} />
        <ExpenditureTable data={expenditures.tableData} />
      </section>
    </div>
  )
}
```

### Pattern 4: Full-Text Search via PostgreSQL tsvector + API Route Handler

**What:** Add a `search_vector tsvector` generated column to the `departments` table (combining `name` and `description` fields). Create a GIN index on it. Use a Next.js Route Handler (`/api/search`) that queries with `$queryRaw` using `to_tsquery()`. The `/search` page reads `searchParams` from the URL and renders results.

**Why not Prisma's built-in full-text search:** Prisma's FTS preview feature does not support tsvector columns or weighted search. For a small dataset (35 departments + descriptions), PostgreSQL native FTS is more than sufficient and avoids adding a third-party search service.

**Why Route Handler instead of Server Action:** Search is a GET request (cacheable, shareable URLs, browser back button works). Route Handlers are the correct pattern for GET endpoints. Server Actions are for mutations (POST).

**Confidence:** HIGH for PostgreSQL FTS approach; MEDIUM for Prisma `$queryRaw` integration (requires raw SQL migration outside Prisma's schema management)

```sql
-- Migration: Add full-text search support
-- Run via raw SQL migration (not Prisma migrate, which doesn't support tsvector)

ALTER TABLE departments
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

CREATE INDEX idx_departments_search ON departments USING GIN (search_vector);

-- Also make budget_descriptions searchable
ALTER TABLE budget_descriptions
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(detailed_description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(key_changes, '')), 'C')
) STORED;

CREATE INDEX idx_budget_descriptions_search ON budget_descriptions USING GIN (search_vector);
```

```typescript
// src/lib/db/search-queries.ts
import prisma from '@/lib/prisma'

export type SearchResult = {
  type: 'department' | 'description'
  name: string
  slug: string
  strategicArea: string
  excerpt: string
  rank: number
}

export async function fullTextSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  // Sanitize and format query for tsquery
  const sanitized = query.trim().replace(/[^\w\s]/g, '').split(/\s+/).join(' & ')

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      'department' as type,
      d.name,
      d.slug,
      sa.name as "strategicArea",
      ts_headline('english', coalesce(d.description, d.name),
        to_tsquery('english', ${sanitized}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
      ) as excerpt,
      ts_rank(d.search_vector, to_tsquery('english', ${sanitized})) as rank
    FROM departments d
    JOIN strategic_areas sa ON sa.id = d.strategic_area_id
    WHERE d.search_vector @@ to_tsquery('english', ${sanitized})

    UNION ALL

    SELECT
      'description' as type,
      d.name,
      d.slug,
      sa.name as "strategicArea",
      ts_headline('english', coalesce(bd.summary, ''),
        to_tsquery('english', ${sanitized}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
      ) as excerpt,
      ts_rank(bd.search_vector, to_tsquery('english', ${sanitized})) as rank
    FROM budget_descriptions bd
    JOIN departments d ON bd.entity_type = 'department' AND bd.entity_id = d.id
    JOIN strategic_areas sa ON sa.id = d.strategic_area_id
    WHERE bd.search_vector @@ to_tsquery('english', ${sanitized})

    ORDER BY rank DESC
    LIMIT 50
  `

  return results
}
```

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fullTextSearch } from '@/lib/db/search-queries'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [], query: '' })
  }

  const results = await fullTextSearch(query)

  return NextResponse.json({
    results,
    query: query.trim(),
    count: results.length,
  })
}
```

```typescript
// src/app/search/page.tsx (SERVER COMPONENT)
import { fullTextSearch } from '@/lib/db/search-queries'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResults } from '@/components/search/SearchResults'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Miami-Dade County budget departments, descriptions, and spending data.',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const results = q ? await fullTextSearch(q) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-(--spacing-section)">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />
      <h1 className="text-3xl font-heading font-bold mt-6 mb-4">Search the Budget</h1>
      <SearchBar initialQuery={q ?? ''} />
      {q && <SearchResults results={results} query={q} />}
    </div>
  )
}
```

### Pattern 5: AI Descriptions -- Offline Generation, Not Runtime

**What:** AI-generated budget descriptions are produced by the Python pipeline (using the Anthropic Claude API) and stored in the `budget_descriptions` table. The web app reads them like any other database column. There is NO runtime Claude API call from the Next.js app.

**Why offline:** Descriptions are deterministic per fiscal year. Generating them once and storing them avoids: per-request API costs, latency (2-5 seconds per Claude call), rate limiting concerns, and API key exposure in the web app. The 35 departments generate approximately 35 API calls total per fiscal year, costing roughly $0.50-$2.00.

**Schema already exists:** The `budget_descriptions` table with `summary`, `detailed_description`, `key_changes`, and `model_version` columns is already in the Prisma schema from v1.0.

**Confidence:** HIGH (this is the pattern described in PROJECT.md constraints)

```typescript
// src/lib/db/department-queries.ts (relevant excerpt)
export async function getDepartmentBySlug(slug: string) {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })
  if (!fy) return null

  const dept = await prisma.departments.findUnique({
    where: { slug },
    include: {
      strategic_areas: true,
      department_budgets: {
        where: { fiscal_year_id: fy.id, is_actual: false },
      },
    },
  })
  if (!dept) return null

  // Fetch AI description from budget_descriptions table
  const description = await prisma.budget_descriptions.findFirst({
    where: {
      fiscal_year_id: fy.id,
      entity_type: 'department',
      entity_id: dept.id,
    },
  })

  const budget = dept.department_budgets[0]

  return {
    name: dept.name,
    slug: dept.slug,
    strategicAreaName: dept.strategic_areas.name,
    strategicAreaSlug: dept.strategic_areas.slug,
    strategicAreaColor: dept.strategic_areas.color ?? '#6B7280',
    totalBudget: budget?.total_budget?.toString() ?? '0',
    operatingBudget: budget?.operating_budget?.toString() ?? '0',
    capitalBudget: budget?.capital_budget?.toString() ?? '0',
    employeeCount: budget?.employee_count ?? null,
    // AI-generated fields (may be null if pipeline hasn't run yet)
    aiSummary: description?.summary ?? null,
    aiDetailedDescription: description?.detailed_description ?? null,
    aiKeyChanges: description?.key_changes ?? null,
  }
}
```

### Pattern 6: SEO with generateMetadata and Dynamic Sitemap

**What:** Each page exports a static `metadata` object or async `generateMetadata` function. A `sitemap.ts` file at `src/app/sitemap.ts` queries all department slugs and generates a sitemap. A `robots.ts` file controls crawler access.

**Existing state:** The root `layout.tsx` already has a base `metadata` object with `title.template: '%s | Miami-Dade Budget Explorer'`. The homepage and glossary pages already have page-specific metadata.

**New:** Department pages use `generateMetadata` to include the department name and AI summary in the `<title>` and Open Graph tags. The sitemap includes all static routes plus all 35 department routes.

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getAllDepartmentSlugs } from '@/lib/db/department-queries'

const BASE_URL = 'https://budgetexplorer.miamidade.tools'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const departmentSlugs = await getAllDepartmentSlugs()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'yearly', priority: 1.0 },
    { url: `${BASE_URL}/explorer`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.9 },
    { url: `${BASE_URL}/explorer/revenue`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.7 },
    { url: `${BASE_URL}/calculator`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${BASE_URL}/glossary`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ]

  const departmentRoutes: MetadataRoute.Sitemap = departmentSlugs.map((slug) => ({
    url: `${BASE_URL}/department/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...departmentRoutes]
}
```

```typescript
// src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://budgetexplorer.miamidade.tools/sitemap.xml',
  }
}
```

## Data Flow Diagrams

### Homepage Visualization Data Flow

```
page.tsx (Server Component)
  |
  |-- getTreemapData()  --> Prisma: strategic_areas + departments + department_budgets
  |                          Returns: TreemapNode hierarchy (id/value/children/color)
  |-- getSunburstData() --> Same data, different shape (Nivo sunburst format)
  |-- getPennyVizData() --> Prisma: strategic_area_budgets (cents_per_dollar)
  |-- getRevenueDonutData() --> Prisma: revenue_by_source + revenue_sources
  |
  v
Pass as props to Client Components:
  <BudgetTreemap data={treemapData} />     -- @nivo/treemap, drill-down via useState
  <BudgetSunburst data={sunburstData} />   -- @nivo/sunburst, drill-down via useState
  <PennyViz data={pennyData} />            -- Custom SVG, no interactivity beyond tooltip
  <RevenueDonut data={revenueData} />      -- @nivo/pie, interactive legends
```

### Tax Calculator Data Flow

```
/calculator page.tsx (Server Component)
  |
  |-- getCalculatorData() --> Prisma: millage_rates + strategic_area_budgets
  |                           Returns: { millageRates[], strategicAreaProportions[] }
  v
<TaxCalculatorForm
  millageRates={data.millageRates}
  strategicAreaProportions={data.strategicAreaProportions}
/>
  |
  |-- User types property value, toggles homestead
  |-- useMemo recomputes:
  |     taxableValue = propertyValue - exemption
  |     totalCountyTax = (taxableValue / 1000) * countyMillage
  |     perArea = strategicAreaProportions.map(area => tax * area.proportion)
  |
  v
<TaxBreakdownDisplay results={computedResults} />
  Renders: total tax, per-area breakdown, millage rate details
  No API call. Instant feedback.
```

### Search Data Flow

```
User types in SearchBar (Client Component)
  |
  |-- Debounce 300ms
  |-- router.push(`/search?q=${encodeURIComponent(query)}`)
  |     (URL-based state, enables browser back/forward and sharing)
  v
/search page.tsx (Server Component)
  |
  |-- const { q } = await searchParams
  |-- fullTextSearch(q) --> Prisma $queryRaw:
  |     departments.search_vector @@ to_tsquery(q)
  |     UNION budget_descriptions.search_vector @@ to_tsquery(q)
  |     ts_headline for highlighted excerpts
  |     ORDER BY ts_rank DESC
  |
  v
<SearchResults results={results} query={q} />
  Renders: result cards with <mark> highlights, department links
```

### Department Detail Data Flow

```
/department/[slug] page.tsx (Server Component)
  |
  |-- generateStaticParams() --> getAllDepartmentSlugs() (35 slugs, build-time)
  |-- generateMetadata({ params }) --> department name + AI summary for SEO
  |
  |-- getDepartmentBySlug(slug)
  |     Prisma: departments + strategic_areas + department_budgets + budget_descriptions
  |     Returns: { name, slug, totalBudget, aiSummary, aiDetailedDescription, aiKeyChanges }
  |
  |-- getDepartmentYoY(slug)
  |     Prisma: department_budgets across 5 fiscal years
  |     Returns: [{ year: 'FY 2021-22', operating: '...', capital: '...' }, ...]
  |
  |-- getDepartmentExpenditures(slug)
  |     Prisma: department_expenditures + expenditure_categories
  |     Returns: { chartData: NivoPieData[], tableData: ExpenditureRow[] }
  |
  v
<DepartmentHeader />           -- AI summary, key changes, metadata
<YoYBarChart data={yoyData} /> -- @nivo/bar, grouped bars (operating + capital)
<ExpenditureBreakdown />       -- @nivo/pie, category percentages
<ExpenditureTable />           -- HTML table, sortable, accessible
```

## Component Boundary Rules

### Server vs Client Decision Matrix

| Component | Server or Client | Why |
|-----------|-----------------|-----|
| Any page.tsx | Server | Fetches data via Prisma, renders initial HTML |
| Any Nivo chart | Client | Requires React Context, SVG interactivity |
| TaxCalculatorForm | Client | Form state, user input, real-time computation |
| SearchBar | Client | Keyboard input, debounce, router.push |
| SearchResults | Server or Client | Server if rendered from page.tsx with searchParams; Client if using API route |
| DepartmentHeader | Server | Static text rendering, no interactivity |
| ExpenditureTable | Client | Sortable columns require useState |
| Breadcrumbs | Server | Static navigation, no state |
| ChartContainer | Server | Wrapper div with aria attributes, heading |

### Props Crossing Server-Client Boundary

All props must be serializable. The existing codebase uses string serialization for BigInt (`.toString()`). Continue this pattern.

| Type | Serialization | Example |
|------|---------------|---------|
| BigInt cents | `.toString()` -> string | `'1323323800000'` |
| Decimal (millage) | `Number()` -> number | `9.5778` |
| Date | Not passed as props | Formatted to string in query layer |
| Nivo data nodes | Plain objects with id/value/children | See TreemapNode type above |
| Colors | Hex string | `'#0057B8'` |

## Accessibility Architecture

### Chart Accessibility

Every Nivo chart component must be wrapped with an accessible fallback pattern:

```typescript
// src/components/charts/ChartContainer.tsx
type Props = {
  title: string
  description: string
  tableData: { label: string; value: string }[]
  children: React.ReactNode
}

export function ChartContainer({ title, description, tableData, children }: Props) {
  return (
    <figure role="img" aria-label={`${title}: ${description}`}>
      <figcaption className="sr-only">{title}. {description}</figcaption>
      {/* Visual chart for sighted users */}
      <div aria-hidden="true">
        {children}
      </div>
      {/* Data table for screen readers */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr><th>Category</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
```

### Keyboard Navigation

- Treemap drill-down: `onClick` + `onKeyDown` (Enter/Space) on nodes
- Search: Standard form input, `<label>` associated with `<input>`
- Calculator: Tab order follows form fields, results announced via `aria-live`

## New Dependencies

```bash
# Nivo chart packages (install exactly these -- each is a separate package)
pnpm add @nivo/treemap @nivo/sunburst @nivo/pie @nivo/bar @nivo/core @nivo/colors

# Note: @nivo/core is a peer dependency of all Nivo packages
# React 19 is supported as of Nivo 0.88.0+
```

**No @anthropic-ai/sdk in the web app.** AI descriptions are generated by the Python pipeline and stored in the database. The web app reads them as plain text from the `budget_descriptions` table.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Runtime Claude API Calls from Next.js

**What people do:** Call the Anthropic API from a Route Handler or Server Action to generate descriptions on-demand.
**Why it's wrong for this project:** Descriptions are static per fiscal year. Runtime calls add 2-5 second latency, per-request API costs ($0.01-0.05 per description), rate limiting risk, and API key management in the web app.
**Do this instead:** Generate all descriptions in the Python pipeline, store in `budget_descriptions`, read as static data.

### Anti-Pattern 2: Client-Side Data Fetching for Charts

**What people do:** Use `useEffect` + `fetch` inside chart components to load data.
**Why it's wrong:** Creates loading waterfall (page loads -> JS hydrates -> fetch fires -> data arrives -> chart renders). Doubles the perceived load time. Also prevents static generation.
**Do this instead:** Fetch all chart data in the Server Component, pass as props. Chart components render immediately with data.

### Anti-Pattern 3: Using Nivo in Server Components

**What people do:** Import `ResponsiveTreeMap` directly in a Server Component page.
**Why it's wrong:** Crashes with `TypeError: createContext only works in Client Components`. Nivo uses React Context internally.
**Do this instead:** Always wrap Nivo charts in a separate file with `'use client'` directive.

### Anti-Pattern 4: Storing Computed Tax Results in the Database

**What people do:** Create an API endpoint that takes property value and returns computed tax, or store common calculations.
**Why it's wrong:** The computation is `taxableValue * millageRate / 1000`. It is pure math with no external data dependency beyond the millage rates (which are already loaded). An API call adds latency for no benefit.
**Do this instead:** Load millage rates in the Server Component, pass to Client Component, compute in `useMemo`.

### Anti-Pattern 5: Full-Text Search with Prisma's Preview Feature

**What people do:** Enable Prisma's `fullTextSearch` preview feature and use `search` filter.
**Why it's wrong:** Prisma's preview FTS does not support tsvector columns, weighted search, or `ts_headline` for result highlighting. It uses basic LIKE queries under the hood, which are slower and less relevant.
**Do this instead:** Use `$queryRaw` with proper PostgreSQL `to_tsvector`, `to_tsquery`, `ts_rank`, and `ts_headline` functions. Create the tsvector column and GIN index via raw SQL migration.

## Build Order (Dependency Chain)

```
Phase 1: Data Layer + Queries (no visible UI changes)
  - explorer-queries.ts (treemap, sunburst, penny, revenue data)
  - department-queries.ts (detail, YoY, expenditures)
  - calculator-queries.ts (millage rates, proportions)
  - New TypeScript types (charts.ts, calculator.ts, search.ts)
  - Raw SQL migration for search_vector columns + GIN indexes
  - search-queries.ts ($queryRaw full-text search)
  Depends on: existing Prisma schema, existing prisma.ts singleton
  |
  v
Phase 2: Chart Components (independent, can be built in parallel)
  - ChartContainer.tsx (a11y wrapper)
  - BudgetTreemap.tsx (@nivo/treemap with drill-down)
  - BudgetSunburst.tsx (@nivo/sunburst with drill-down)
  - RevenueDonut.tsx (@nivo/pie)
  - PennyViz.tsx (custom SVG)
  - YoYBarChart.tsx (@nivo/bar)
  - ExpenditureBreakdown.tsx (@nivo/pie)
  Depends on: @nivo/* packages installed, query types defined
  |
  v
Phase 3: Explorer + Department Pages (main content routes)
  - /explorer page with treemap, sunburst, penny viz
  - /explorer/revenue page with donut chart
  - /department/[slug] page with generateStaticParams
  - Department components (DepartmentHeader, ExpenditureTable)
  - Homepage updated to include visualizations
  Depends on: chart components, query functions
  |
  v
Phase 4: Calculator + Search (user-input features)
  - /calculator page with TaxCalculatorForm
  - TaxBreakdownDisplay component
  - /search page with SearchBar, SearchResults
  - /api/search route handler
  - SearchBar with debounce + URL state
  Depends on: query functions, basic UI components
  |
  v
Phase 5: SEO + Polish
  - sitemap.ts (dynamic with department slugs)
  - robots.ts
  - generateMetadata on all new pages
  - Open Graph images
  - nav-config.ts updates (add Search, rename Explorer)
  - Accessibility audit on all new components
  Depends on: all routes exist, all content rendered
```

**Critical path:** Phase 1 must complete before Phases 2-3. Phase 2 components can be built in parallel. Phase 3 integrates Phase 2 components into pages. Phase 4 is independent of Phase 3 (no shared components). Phase 5 is purely additive.

## Scaling Considerations

| Concern | Current (< 1k users) | At 10k users | At 100k users |
|---------|----------------------|--------------|---------------|
| Chart rendering | Nivo renders client-side, zero server cost | Same | Same (client-side) |
| Department pages | Static via generateStaticParams, CDN-served | Same | Same |
| Tax calculator | Fully client-side computation | Same | Same |
| Search | PostgreSQL FTS on 35 departments | Add 60s response cache | Consider Algolia if dataset grows |
| API route /api/search | Serverless function, cold start ~200ms | Add rate limiting | Add Redis cache |

**Bottom line:** This is a read-heavy, static-content application. The only runtime database query is search, and the dataset is tiny (35 departments). Scaling is a non-concern for the foreseeable future.

## Sources

- [Nivo React 19 Support - GitHub Issue #2618](https://github.com/plouc/nivo/issues/2618) - HIGH confidence (resolved, React 19 supported since ~0.88.0)
- [Nivo SSR with Next.js 13+ - GitHub Issue #2626](https://github.com/plouc/nivo/issues/2626) - HIGH confidence (confirmed: must use 'use client')
- [Nivo TreeMap Documentation](https://nivo.rocks/treemap/) - HIGH confidence (official docs)
- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/) - HIGH confidence (official docs)
- [Nivo Pie Documentation](https://nivo.rocks/pie/) - HIGH confidence (official docs)
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - HIGH confidence (official docs)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) - HIGH confidence (official docs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) - HIGH confidence (official docs)
- [Next.js Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - HIGH confidence (official tutorial)
- [Prisma Full-Text Search (Preview)](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search) - HIGH confidence (official docs, but preview feature is limited)
- [PostgreSQL Full-Text Search with Prisma via $queryRaw](https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3) - MEDIUM confidence (community article, verified approach)
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - HIGH confidence (official package)
- [Miami-Dade Property Tax Calculation](https://www.propertyexemption.com/property-tax/miami-property-tax/) - MEDIUM confidence (third-party guide, formula verified)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - HIGH confidence (official docs)
- [Nivo Sunburst Drill-Down Demo](https://github.com/plouc/nivo/commit/b058f7b7a9750ce923e59b03bd6413391d6fa72f) - HIGH confidence (official repo)

---
*Architecture research for: Miami-Dade Budget Explorer v1.1*
*Researched: 2026-02-28*
*Supersedes v1.0 architecture research (same file path)*
