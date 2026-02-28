# Architecture Research

**Domain:** Civic budget visualization (Next.js App Router + PostgreSQL + Recharts/D3)
**Researched:** 2026-02-28
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                    OFFLINE (one-time or annual)
  ┌──────────────────────────────────────────────────────┐
  │  ┌──────────┐    ┌───────────┐    ┌──────────────┐   │
  │  │  Budget   │    │  Python   │    │  JSON Seed   │   │
  │  │  PDF(s)   │───>│  Pipeline │───>│  Files       │   │
  │  └──────────┘    │ pdfplumber│    └──────┬───────┘   │
  │                  │ + Claude  │           │           │
  │                  └───────────┘           │           │
  └─────────────────────────────────────────┼───────────┘
                                            │
                    BUILD / SEED TIME       │
  ┌─────────────────────────────────────────┼───────────┐
  │  ┌──────────────┐    ┌─────────────┐    │           │
  │  │ prisma db    │<───│  Prisma     │<───┘           │
  │  │ seed         │    │  Seed       │                │
  │  │              │    │  Script     │                │
  │  └──────┬───────┘    └─────────────┘                │
  │         │                                           │
  │         v                                           │
  │  ┌──────────────┐                                   │
  │  │  PostgreSQL   │                                   │
  │  │  (Supabase/   │                                   │
  │  │   Railway)    │                                   │
  │  └──────┬───────┘                                   │
  └─────────┼───────────────────────────────────────────┘
            │
            │  RUNTIME (Next.js on Vercel)
  ┌─────────┼───────────────────────────────────────────┐
  │         v                                           │
  │  ┌──────────────────────────────────────────────┐   │
  │  │           Server Components (RSC)             │   │
  │  │  ┌────────────┐  ┌─────────────┐             │   │
  │  │  │ Data       │  │ Page        │             │   │
  │  │  │ Fetchers   │  │ Components  │             │   │
  │  │  │ (Prisma)   │  │ (layout,    │             │   │
  │  │  │            │  │  page, etc) │             │   │
  │  │  └────────────┘  └──────┬──────┘             │   │
  │  └─────────────────────────┼────────────────────┘   │
  │                            │ serializable props     │
  │                            v                        │
  │  ┌──────────────────────────────────────────────┐   │
  │  │           Client Components                   │   │
  │  │  ┌─────────┐  ┌──────────┐  ┌────────────┐  │   │
  │  │  │ Treemap │  │ Charts   │  │ Tax        │  │   │
  │  │  │ Drill-  │  │ (Recharts│  │ Calculator │  │   │
  │  │  │ Down    │  │  bar,pie)│  │ (form +    │  │   │
  │  │  │ (D3)    │  │          │  │  display)  │  │   │
  │  │  └─────────┘  └──────────┘  └────────────┘  │   │
  │  └──────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Python Pipeline | Extract budget data from PDFs, generate AI descriptions | Standalone Python scripts using pdfplumber + Claude API, outputs JSON files |
| Prisma Seed Script | Transform JSON into database records | TypeScript seed script via `prisma db seed`, runs at deploy or manually |
| PostgreSQL | Store normalized budget data across fiscal years | Supabase or Railway managed PostgreSQL with Prisma schema |
| Prisma Client | Type-safe database access from Server Components | Singleton PrismaClient in `lib/prisma.ts` using globalThis pattern |
| Server Components | Fetch data, render static HTML, pass serialized props to charts | Async page/layout components with direct Prisma queries |
| Client Components | Interactive charts, form inputs, drill-down state | `'use client'` components receiving serialized data as props |
| Treemap (D3) | Hierarchical budget drill-down with breadcrumb navigation | Custom D3-based component (not Recharts Treemap) for drill-down |
| Charts (Recharts) | Bar charts, pie/donut charts, line charts for trends | Recharts composable components for standard chart types |
| Tax Calculator | Property value input, personalized tax breakdown | Client Component with form state and computed display |

## Recommended Project Structure

```
budget-explorer/
├── app/                          # Next.js App Router (routing only)
│   ├── layout.tsx                # Root layout: html, body, Inter font, nav
│   ├── page.tsx                  # Homepage: hero, treemap, penny viz
│   ├── loading.tsx               # Global loading skeleton
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   ├── department/
│   │   └── [slug]/
│   │       ├── page.tsx          # Department detail (Server Component)
│   │       └── loading.tsx       # Department loading skeleton
│   ├── calculator/
│   │   └── page.tsx              # Tax calculator page
│   ├── search/
│   │   └── page.tsx              # Full-text search results
│   ├── about/
│   │   └── page.tsx              # About/methodology page
│   └── api/
│       └── search/
│           └── route.ts          # Search API route (full-text search)
├── components/                   # Shared UI components
│   ├── charts/                   # All chart components (Client)
│   │   ├── budget-treemap.tsx    # D3 drill-down treemap
│   │   ├── revenue-donut.tsx     # Revenue source donut chart
│   │   ├── trend-bar-chart.tsx   # Year-over-year bar chart
│   │   ├── penny-viz.tsx         # Dollar breakdown visualization
│   │   └── chart-wrapper.tsx     # Shared chart container with fallback
│   ├── calculator/               # Tax calculator components (Client)
│   │   ├── tax-form.tsx          # Property value input form
│   │   └── tax-breakdown.tsx     # Personalized breakdown display
│   ├── layout/                   # Layout components
│   │   ├── header.tsx            # Site header with nav
│   │   ├── footer.tsx            # Site footer
│   │   └── breadcrumb.tsx        # Navigation breadcrumb
│   ├── department/               # Department-specific components
│   │   ├── department-card.tsx   # Department summary card
│   │   ├── department-grid.tsx   # Grid of department cards
│   │   └── expenditure-table.tsx # Line item table with sort
│   ├── search/                   # Search components (Client)
│   │   ├── search-bar.tsx        # Search input with debounce
│   │   └── search-results.tsx    # Results display
│   └── ui/                       # Generic UI primitives
│       ├── skeleton.tsx          # Loading skeleton component
│       ├── format-currency.tsx   # Currency display (BigInt -> $X,XXX)
│       └── data-table.tsx        # Accessible data table fallback
├── lib/                          # Shared utilities and data access
│   ├── prisma.ts                 # Prisma client singleton
│   ├── queries/                  # Data access layer
│   │   ├── budget.ts             # Budget summary queries
│   │   ├── departments.ts        # Department queries
│   │   ├── revenue.ts            # Revenue source queries
│   │   ├── trends.ts             # Year-over-year trend queries
│   │   └── search.ts             # Full-text search queries
│   ├── format.ts                 # Number/currency formatting (BigInt cents -> display)
│   ├── constants.ts              # Miami-Dade colors, millage rates, fiscal years
│   └── types.ts                  # Shared TypeScript types
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Seed script (reads JSON, inserts records)
│   └── seed-data/                # JSON files from Python pipeline
│       ├── fiscal-years.json
│       ├── strategic-areas.json
│       ├── departments.json
│       ├── revenue-sources.json
│       ├── expenditure-categories.json
│       ├── department-budgets.json
│       ├── millage-rates.json
│       └── ai-descriptions.json
├── pipeline/                     # Python data pipeline (separate from web app)
│   ├── extract.py                # PDF extraction with pdfplumber
│   ├── transform.py              # Data normalization and validation
│   ├── describe.py               # AI description generation via Claude API
│   ├── output/                   # Generated JSON files (copy to prisma/seed-data/)
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Pipeline usage instructions
├── public/
│   ├── og-image.png              # Open Graph image
│   └── favicon.ico               # Favicon
├── tailwind.config.ts            # Tailwind with Miami-Dade theme colors
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
├── package.json                  # Node dependencies
└── .env.local                    # Database URL, API keys (not committed)
```

### Structure Rationale

- **`app/` for routing only:** Pages are thin orchestrators that import from `lib/queries/` and `components/`. This keeps routing logic clean and makes components independently testable.
- **`components/charts/` all Client Components:** Every chart uses `'use client'` because Recharts and D3 require browser APIs (SVG rendering, event handlers, useState for interactivity). They receive pre-fetched, serialized data as props.
- **`lib/queries/` as data access layer:** All Prisma queries live here, not in page components. This provides a single place to optimize queries, add caching, and handle BigInt serialization. Imported only by Server Components.
- **`pipeline/` is fully separate:** The Python pipeline is an offline tool with its own dependencies. It produces JSON files that are manually copied into `prisma/seed-data/`. No runtime dependency between pipeline and web app.
- **`prisma/seed-data/` as the bridge:** JSON files are the contract between the Python pipeline and the TypeScript seed script. This decouples the two languages completely.

## Architectural Patterns

### Pattern 1: Server-First with Client Islands

**What:** Default everything to Server Components. Only add `'use client'` to the specific leaf components that need interactivity (charts, forms, search input). Server Components fetch data directly via Prisma and pass serialized props down.

**When to use:** Every page in this application. The homepage Server Component fetches budget totals, strategic area breakdowns, and revenue data, then passes pre-computed arrays to Client chart components.

**Trade-offs:** Minimal JavaScript shipped to browser (budget data is read-only, no auth). Slight complexity in ensuring all props crossing the server/client boundary are serializable (BigInt must be converted to number or string before passing).

**Example:**
```typescript
// app/page.tsx (Server Component - NO 'use client')
import { getBudgetOverview } from '@/lib/queries/budget'
import { BudgetTreemap } from '@/components/charts/budget-treemap'
import { RevenueDonut } from '@/components/charts/revenue-donut'

export default async function HomePage() {
  const overview = await getBudgetOverview() // Direct Prisma query

  return (
    <main>
      <h1>Miami-Dade County Budget: {overview.fiscalYear}</h1>
      <p>Total: {formatCurrency(overview.totalBudget)}</p>

      {/* Client Component receives serialized data */}
      <BudgetTreemap
        data={overview.strategicAreas}  // Already serialized (BigInt -> number)
        totalBudget={overview.totalBudget}
      />

      <RevenueDonut data={overview.revenueSources} />
    </main>
  )
}
```

### Pattern 2: BigInt Serialization at the Query Layer

**What:** Convert BigInt cents to JavaScript numbers at the data access layer before data ever reaches components. Since Miami-Dade's total budget (~$13.2B = 1,320,000,000,000 cents) fits within Number.MAX_SAFE_INTEGER (9,007,199,254,740,991), this conversion is safe. Format to display strings only in the UI layer.

**When to use:** Every query function in `lib/queries/`. Never let BigInt values leak into component props.

**Trade-offs:** Slight precision loss is irrelevant for budget display (we are showing dollars, not sub-cent values). Avoids JSON serialization errors across the server/client boundary. Keeps component code clean.

**Example:**
```typescript
// lib/queries/budget.ts
import 'server-only'  // Prevents accidental client import
import prisma from '@/lib/prisma'

interface StrategicAreaData {
  id: number
  name: string
  operatingBudget: number  // cents as number, NOT BigInt
  capitalBudget: number
  totalBudget: number
  departments: { name: string; slug: string; budget: number }[]
}

export async function getBudgetOverview(): Promise<{
  fiscalYear: string
  totalBudget: number
  strategicAreas: StrategicAreaData[]
}> {
  const fy = await prisma.fiscalYear.findFirst({
    where: { isCurrent: true },
    include: {
      strategicAreas: {
        include: {
          departments: {
            include: { budgets: true }
          }
        }
      }
    }
  })

  // Serialize BigInt at the boundary
  return {
    fiscalYear: fy.name,
    totalBudget: Number(fy.totalBudget),
    strategicAreas: fy.strategicAreas.map(sa => ({
      id: sa.id,
      name: sa.name,
      operatingBudget: Number(sa.operatingBudget),
      capitalBudget: Number(sa.capitalBudget),
      totalBudget: Number(sa.operatingBudget) + Number(sa.capitalBudget),
      departments: sa.departments.map(d => ({
        name: d.name,
        slug: d.slug,
        budget: Number(d.budgets?.[0]?.totalBudget ?? 0n),
      })),
    })),
  }
}
```

### Pattern 3: D3 Treemap with React State for Drill-Down

**What:** Use D3's `d3-hierarchy` and `d3-treemap` layout algorithms to compute rectangle positions, but render with React (SVG elements managed by React, not D3 DOM manipulation). Manage drill-down state (current node, breadcrumb path) in React useState. Recharts' Treemap does NOT support drill-down natively (confirmed via GitHub issue #1276, closed without implementation).

**When to use:** The homepage treemap and any hierarchical budget drill-down visualization.

**Trade-offs:** More code than a Recharts Treemap, but full control over drill-down behavior, animations, and breadcrumb navigation. D3 handles the math; React handles the DOM. This is the established pattern for interactive treemaps in React.

**Example:**
```typescript
// components/charts/budget-treemap.tsx
'use client'

import { useState, useMemo } from 'react'
import * as d3 from 'd3-hierarchy'

interface TreeNode {
  name: string
  value?: number
  children?: TreeNode[]
}

interface BreadcrumbItem {
  name: string
  node: d3.HierarchyRectangularNode<TreeNode>
}

export function BudgetTreemap({ data, width, height }: {
  data: TreeNode
  width: number
  height: number
}) {
  const [currentNode, setCurrentNode] = useState<d3.HierarchyRectangularNode<TreeNode> | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])

  const root = useMemo(() => {
    return d3.treemap<TreeNode>()
      .size([width, height])
      .padding(2)
      .round(true)(
        d3.hierarchy(data)
          .sum(d => d.value ?? 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      )
  }, [data, width, height])

  const displayNode = currentNode ?? root

  function handleDrillDown(node: d3.HierarchyRectangularNode<TreeNode>) {
    if (node.children) {
      setBreadcrumbs(prev => [...prev, { name: node.data.name, node: displayNode }])
      setCurrentNode(node)
    }
  }

  function handleBreadcrumbClick(index: number) {
    const target = breadcrumbs[index]
    setCurrentNode(target.node === root ? null : target.node)
    setBreadcrumbs(prev => prev.slice(0, index))
  }

  // Re-layout children of the display node to fill full dimensions
  const leaves = useMemo(() => {
    if (!displayNode.children) return []
    const sub = d3.treemap<TreeNode>()
      .size([width, height])
      .padding(2)
      .round(true)(
        d3.hierarchy({ name: displayNode.data.name, children: displayNode.children.map(c => c.data) })
          .sum(d => d.value ?? 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      )
    return sub.leaves()
  }, [displayNode, width, height])

  return (
    <div>
      {/* Breadcrumb navigation */}
      <nav aria-label="Budget breadcrumb">
        <button onClick={() => { setCurrentNode(null); setBreadcrumbs([]) }}>
          Total Budget
        </button>
        {breadcrumbs.map((crumb, i) => (
          <button key={i} onClick={() => handleBreadcrumbClick(i)}>
            {crumb.name}
          </button>
        ))}
      </nav>

      {/* Treemap rendered by React, positioned by D3 */}
      <svg width={width} height={height}>
        {leaves.map((leaf, i) => (
          <g key={i} onClick={() => handleDrillDown(leaf)}>
            <rect
              x={leaf.x0} y={leaf.y0}
              width={leaf.x1 - leaf.x0} height={leaf.y1 - leaf.y0}
              fill={getColorForArea(leaf.data.name)}
              style={{ cursor: leaf.children ? 'pointer' : 'default' }}
            />
            <text x={leaf.x0 + 4} y={leaf.y0 + 16} fontSize={12}>
              {leaf.data.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
```

### Pattern 4: Static Generation with Long Revalidation

**What:** Use `generateStaticParams` to pre-render all 35 department pages at build time. Set `revalidate` to a very long interval (e.g., 86400 seconds = 1 day, or even `false` for no revalidation until the next deploy). Budget data changes once per year, so pages are effectively static.

**When to use:** Department detail pages (`/department/[slug]`), homepage, any page displaying budget data.

**Trade-offs:** Near-zero runtime cost on Vercel. First visitor gets cached HTML instantly. Only needs rebuild/redeploy when annual budget data is seeded. No runtime database queries after initial build.

**Example:**
```typescript
// app/department/[slug]/page.tsx
import { getDepartmentBySlug, getAllDepartmentSlugs } from '@/lib/queries/departments'
import { notFound } from 'next/navigation'

// Pre-render all 35 department pages at build time
export async function generateStaticParams() {
  const slugs = await getAllDepartmentSlugs()
  return slugs.map(slug => ({ slug }))
}

// Revalidate once per day (safety net; data only changes yearly)
export const revalidate = 86400

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const department = await getDepartmentBySlug(slug)
  if (!department) notFound()

  return (
    <article>
      <h1>{department.name}</h1>
      <p>{department.aiDescription}</p>
      {/* ... charts and tables */}
    </article>
  )
}
```

### Pattern 5: Prisma Client Singleton

**What:** Instantiate PrismaClient once using the globalThis pattern to prevent connection pool exhaustion during Next.js hot module reload in development.

**When to use:** Always. This is required infrastructure, not optional.

**Trade-offs:** None. This is the officially documented pattern from both Prisma and Next.js.

**Example:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

## Data Flow

### Request Flow (Page Load)

```
User requests /department/fire-rescue
    |
    v
Next.js Router matches app/department/[slug]/page.tsx
    |
    v
Server Component (page.tsx) calls getDepartmentBySlug('fire-rescue')
    |
    v
lib/queries/departments.ts runs Prisma query against PostgreSQL
    |
    v
Query result: BigInt values converted to numbers at query layer
    |
    v
Server Component renders HTML + passes serialized props to Client Components
    |
    v
Client Components hydrate: charts render SVG, interactivity activates
    |
    v
User sees fully interactive page (treemap clickable, charts tooltippable)
```

### Data Pipeline Flow (Annual/Manual)

```
Budget PDF published by Miami-Dade County
    |
    v
pipeline/extract.py: pdfplumber extracts tables, text from PDF
    |
    v
pipeline/transform.py: normalizes data, validates totals, structures hierarchy
    |                   (strategic areas -> departments -> line items)
    v
pipeline/describe.py: sends each department to Claude API for plain-English description
    |
    v
pipeline/output/: JSON files written (one per table)
    |
    v
Manual copy: JSON files placed in prisma/seed-data/
    |
    v
prisma db seed: TypeScript seed script reads JSON, inserts records
    |
    v
PostgreSQL updated with new fiscal year data
    |
    v
Redeploy: next build regenerates all static pages with fresh data
```

### Client-Side State Flow (Treemap Drill-Down)

```
User clicks "Public Safety" in treemap
    |
    v
onClick handler fires in BudgetTreemap component
    |
    v
useState updates: currentNode = Public Safety node
                   breadcrumbs = [...prev, { name: "Total Budget", node: root }]
    |
    v
useMemo recalculates: D3 treemap layout for Public Safety children
                       (Fire Rescue, Police, Corrections, etc.)
    |
    v
React re-renders SVG rectangles with new positions/sizes
    |
    v
User sees Public Safety departments filling full treemap area
    + breadcrumb shows: Total Budget > Public Safety
```

### Key Data Flows

1. **Budget overview (homepage):** Server Component fetches fiscal year + all strategic areas with department rollups via single Prisma query with includes. Passes pre-computed arrays to BudgetTreemap (Client) and RevenueDonut (Client).

2. **Department detail:** Server Component fetches single department with expenditure categories, historical budgets, and AI description. Passes trend data to TrendBarChart (Client) and line items to ExpenditureTable (Client, for sorting).

3. **Tax calculator:** Fully client-side. Millage rates are fetched by Server Component at page level and passed as props. Form input and computation happen entirely in the browser.

4. **Search:** Client Component sends query to `/api/search` route. Route handler queries PostgreSQL full-text search via Prisma. Returns serialized results. No Server Component data fetching needed because search is user-initiated.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is ideal. Static pages served from Vercel CDN edge. PostgreSQL only hit at build time (not runtime for most pages). Zero scaling concerns. |
| 1k-100k users | Add ISR revalidation headers. Consider moving search to a dedicated API route with rate limiting. Vercel handles CDN scaling automatically. |
| 100k+ users | Unlikely for a county budget tool, but: add Redis caching for search results, consider Algolia for full-text search instead of PostgreSQL. Pre-render search result pages for common queries. |

### Scaling Priorities

1. **First bottleneck (search):** Full-text search against PostgreSQL is the only runtime database query. At scale, add debouncing on client (already planned), response caching with short TTL, and eventually a search index.

2. **Second bottleneck (none for static pages):** The treemap, department pages, and calculator are all statically generated or fully client-side. Vercel CDN handles any traffic volume for static assets.

## Anti-Patterns

### Anti-Pattern 1: Fetching Data in Client Components via useEffect

**What people do:** Import Prisma or call fetch() inside chart components to load data.
**Why it's wrong:** Doubles the JavaScript bundle (Prisma client code ships to browser), exposes database connection strings, creates loading waterfalls (page loads, then JS loads, then data loads), and prevents static generation.
**Do this instead:** Fetch all data in the Server Component (page.tsx), serialize it, and pass as props to Client Components. The chart receives data immediately at hydration time.

### Anti-Pattern 2: Using Recharts Treemap for Drill-Down

**What people do:** Try to build drill-down navigation using Recharts' `<Treemap>` component with onClick handlers to swap data.
**Why it's wrong:** Recharts Treemap has no native drill-down support (GitHub issue #1276, closed without implementation). Building it on top requires fighting the library's rendering pipeline, and custom content rendering is limited.
**Do this instead:** Use D3's `d3-hierarchy` and `d3-treemap` for layout math, render rectangles with React SVG. Full control over drill-down state, transitions, and breadcrumb navigation.

### Anti-Pattern 3: Passing BigInt Directly to Client Components

**What people do:** Return Prisma query results directly as props without serializing BigInt values.
**Why it's wrong:** `JSON.stringify` throws "Do not know how to serialize a BigInt." This error surfaces at the server/client boundary when Next.js serializes props for the RSC payload. It is a runtime error, not a build error, so it appears only when the page is visited.
**Do this instead:** Convert BigInt to number in the query layer (`Number(bigintValue)`). For this project, all budget values fit within Number.MAX_SAFE_INTEGER. Use the `server-only` package on query files to prevent accidental client import.

### Anti-Pattern 4: Monolithic Page Components

**What people do:** Put data fetching, layout, chart rendering, and formatting all in a single page.tsx file that grows to 300+ lines.
**Why it's wrong:** Untestable, hard to read, impossible to reuse components across pages.
**Do this instead:** Page components should be thin orchestrators: import from `lib/queries/`, import from `components/`, wire them together with minimal logic. Each file under 100 lines.

### Anti-Pattern 5: Python Pipeline Coupled to Web App Runtime

**What people do:** Call Python scripts from Next.js API routes or build pipeline, or have the web app directly read PDFs.
**Why it's wrong:** Adds Python as a runtime dependency, complicates deployment (Vercel does not natively run Python), creates fragile inter-process communication.
**Do this instead:** Keep the pipeline fully offline. It produces JSON files. Those files are committed to the repo or manually placed in `prisma/seed-data/`. The web app never knows Python exists.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL (Supabase/Railway) | Prisma Client via `DATABASE_URL` | Use connection pooler URL for serverless (Supabase provides PgBouncer URL). Add `?pgbouncer=true&connection_limit=1` for serverless compatibility. |
| Anthropic Claude API | Python `anthropic` SDK in pipeline only | Only used offline during description generation. API key stays in pipeline `.env`, never in web app. |
| Vercel | Next.js deployment via `vercel.json` or Git push | Static pages cached on CDN edge. Only `/api/search` route runs as serverless function. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Python pipeline -> Web app | JSON files in `prisma/seed-data/` | Fully decoupled. No runtime dependency. Contract is the JSON schema matching Prisma model shapes. |
| Server Components -> Client Components | Serializable props (no BigInt, no Date objects, no functions) | Convert BigInt to number in query layer. Pass only plain objects and arrays. |
| Page components -> Query layer | Function imports from `lib/queries/` | Server-only boundary. Query functions tagged with `import 'server-only'` to prevent client bundling. |
| Client Components -> API Routes | `fetch('/api/search?q=...')` | Only for user-initiated actions (search). Budget data never fetched client-side. |

## Build Order (Dependencies)

The following ordering reflects hard technical dependencies between components:

```
Phase 1: Foundation
  Database schema (Prisma) + seed data (JSON) + seed script
  Must exist before any page can fetch data.
    |
    v
Phase 2: Data Layer
  lib/prisma.ts singleton + lib/queries/*.ts functions + lib/format.ts
  Must exist before any Server Component can render.
    |
    v
Phase 3: Static Pages (Server Components)
  Homepage (page.tsx) + Department pages + Layout + Navigation
  Can render immediately with query data, even without charts.
    |
    v
Phase 4: Interactive Charts (Client Components)
  Treemap (D3), Recharts bar/pie/donut charts, penny visualization
  Receives data from Phase 3 pages. Can be built and tested independently.
    |
    v
Phase 5: User Features
  Tax calculator, full-text search, year-over-year comparison
  Depends on data layer and UI components from prior phases.
    |
    v
Phase 6: Polish
  SEO metadata, Open Graph images, accessibility audit, responsive refinement
  Everything functional; this is optimization.
```

**Critical path:** Phases 1-3 must be sequential. Phases 4-5 can partially overlap since charts are independent Client Components that receive props. Phase 6 is purely additive.

## Sources

- [Next.js Official Docs: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - HIGH confidence (official docs, updated 2026-02-27)
- [Next.js Official Docs: Caching and Revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) - HIGH confidence (official docs, updated 2026-02-27)
- [Next.js Official Docs: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - HIGH confidence (official docs, updated 2026-02-27)
- [Next.js Official Docs: generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) - HIGH confidence
- [Prisma: How to use Prisma ORM with Next.js](https://www.prisma.io/docs/guides/nextjs) - HIGH confidence (official Prisma docs)
- [Prisma BigInt Serialization Discussion #9793](https://github.com/prisma/prisma/discussions/9793) - HIGH confidence (official GitHub)
- [Prisma BigInt Issue #22736 with Next.js 14](https://github.com/prisma/prisma/issues/22736) - HIGH confidence (official GitHub)
- [Recharts Treemap API](https://recharts.github.io/en-US/api/Treemap/) - HIGH confidence (official docs)
- [Recharts Treemap Drill-Down Issue #1276](https://github.com/recharts/recharts/issues/1276) - HIGH confidence (official GitHub, confirmed no native support)
- [D3 Treemap Documentation](https://d3js.org/d3-hierarchy/treemap) - HIGH confidence (official D3 docs)
- [D3 Zoomable Treemap Observable Example](https://observablehq.com/@d3/zoomable-treemap) - HIGH confidence (official Observable)
- [react-d3-treemap npm package](https://www.npmjs.com/package/react-d3-treemap) - MEDIUM confidence (community library, may be unmaintained)
- [Visual Town Budget (GoInvo)](https://github.com/goinvo/Visual-Town-Budget) - MEDIUM confidence (open source civic tech reference)
- [Centralize Prisma Serialization in Next.js](https://www.buildwithmatija.com/blog/centralize-prisma-serialization-nextjs) - MEDIUM confidence (verified blog post)

---
*Architecture research for: Miami-Dade Budget Explorer*
*Researched: 2026-02-28*
