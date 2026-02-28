# Stack Research

**Domain:** Civic budget visualization web application
**Researched:** 2026-02-28
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack React framework | Current stable release. Turbopack default (2-5x faster builds). App Router with Server Components lets you query Prisma directly in page components without API routes. React 19.2 View Transitions for smooth drill-down animations. Cache Components for explicit caching control. Node.js 20.9+ required. |
| TypeScript | 5.7+ | Type safety | Required by Next.js 16. Prisma 7 generates 98% fewer types for schema evaluation, so TypeScript builds are fast even with BigInt models. |
| React | 19.2 | UI library | Ships with Next.js 16. View Transitions API enables animated chart transitions. React Compiler (stable in Next.js 16) auto-memoizes chart components, preventing expensive re-renders during drill-downs. |
| Tailwind CSS | 4.2.1 | Styling | CSS-first config via @theme directive (no tailwind.config.js). 5x faster builds with Oxide engine. @starting-style variant for enter/exit animations without JS. Built-in container queries. |
| PostgreSQL | 16+ | Database | Handles $13.2B budget with BigInt cents. Full-text search for department/line-item queries. JSON columns for storing AI-generated descriptions. Recommended host: Railway or Supabase. |
| Prisma ORM | 7.4.x | Database ORM | Rust-free architecture: 3x faster queries, 90% smaller bundles. BigInt precision fix in 7.3.0 prevents silent data loss. TypeScript-native generated client. Use `provider = "prisma-client"` (not `prisma-client-js`). |
| pnpm | 9.x | Package manager | Strict dependency resolution prevents phantom dependencies. Fast installs via content-addressable storage. Specified in PROJECT.md constraints. |

### Visualization Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.7.0 | Primary charting | Bar charts, line charts, area charts, pie/donut charts, basic treemaps. Use for revenue breakdown donut, year-over-year comparisons, expenditure category bars. Recharts 3 is a full rewrite with better state management and 3,500+ unit tests. |
| @nivo/sunburst | 0.99.0 | Sunburst visualization | The budget hierarchy drill-down (total -> strategic area -> department -> line item). Nivo sunburst is production-ready with built-in animations, theming, and click handlers. Recharts does NOT have sunburst support (open issue since 2017). |
| @nivo/treemap | 0.99.0 | Treemap visualization | Alternative hierarchy view to sunburst. Nivo treemap supports SVG and Canvas renderers, with Canvas better for 35+ departments. Both @nivo packages share the same theming system, so visual consistency is easy. |
| D3.js | 7.9.0 | Low-level calculations | Import individual modules only (d3-scale, d3-format, d3-hierarchy). Use for custom number formatting ($13.2B -> "$13.2B"), scale calculations, and any visualization Recharts/Nivo cannot handle. Do NOT use D3 for DOM manipulation -- let React own the DOM. |
| @number-flow/react | 0.5.14 | Animated number transitions | Budget totals, tax calculator results, year-over-year deltas. Smooth digit-by-digit rolling animation. 2.5kb. Better than building custom animated counters with Motion. |

### Animation & Interaction

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | 12.34.x | Layout animations | Drill-down transitions between budget views, card expand/collapse, page transitions. Use AnimatePresence for mount/unmount animations. Only needed if React 19.2 View Transitions are insufficient for a specific interaction. |
| tw-animate-css | latest | Tailwind animation utilities | TailwindCSS v4 compatible replacement for tailwindcss-animate. Adds animate-in, animate-out, delays, stagger utilities. Use for subtle UI polish (fade-ins, slide-ups on scroll). |

### Data Pipeline (Python)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfplumber | 0.11.9 | PDF extraction | Extract tables from Miami-Dade Budget in Brief PDF. Supports Python 3.10-3.14. Use region-based extraction (crop to specific page areas) for complex budget tables. Inspect layout before defining extraction strategy. |
| anthropic | latest | AI descriptions | Generate plain-English department descriptions. Use claude-sonnet-4-5-20250929 per PROJECT.md. Batch processing with structured output for consistent JSON. |
| pandas | 2.x | Data transformation | Clean and reshape extracted budget data before loading to PostgreSQL. Convert string dollar amounts to BigInt cents. |
| psycopg2-binary | 2.9.x | PostgreSQL driver | Direct database loading from Python pipeline. Use COPY for bulk inserts of budget line items. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint (flat config) | Linting | Next.js 16 removed `next lint`. Use ESLint directly with @next/eslint-plugin-next (now defaults to flat config). |
| Biome | Fast linting/formatting | Alternative to ESLint+Prettier. Single tool for both. Consider if ESLint setup is too complex. |
| Prisma Studio | Database GUI | Built into Prisma CLI. `npx prisma studio` for visual data inspection during development. |
| next-devtools-mcp | AI debugging | New in Next.js 16. MCP integration for AI-assisted debugging with contextual route awareness. |

## Installation

```bash
# Core framework
pnpm add next@latest react@latest react-dom@latest

# Database
pnpm add prisma@latest @prisma/client@latest

# Visualization
pnpm add recharts@latest @nivo/sunburst@latest @nivo/treemap@latest @nivo/core@latest
pnpm add d3-scale d3-format d3-hierarchy
pnpm add @number-flow/react

# Animation
pnpm add motion
pnpm add tw-animate-css

# Styling (Tailwind v4 - PostCSS plugin or Vite plugin)
pnpm add tailwindcss@latest @tailwindcss/postcss@latest

# Dev dependencies
pnpm add -D typescript @types/react @types/react-dom @types/d3-scale @types/d3-format @types/d3-hierarchy
pnpm add -D eslint @next/eslint-plugin-next
pnpm add -D prisma

# Python data pipeline (separate environment)
# pip install pdfplumber anthropic pandas psycopg2-binary
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Recharts 3 + Nivo | Chart.js / react-chartjs-2 | Never for this project. Chart.js uses Canvas only (no SVG), making accessibility harder. No treemap/sunburst support. |
| Recharts 3 + Nivo | Visx (Airbnb) | If you need maximum control over every SVG element. Visx v3.12.0 provides low-level D3 primitives as React components, but requires more code to build a treemap than Nivo. Choose if Nivo's opinionated styling fights your design. |
| Recharts 3 + Nivo | AG Charts | If you need commercial-grade charts with enterprise support. AG Charts has treemap and sunburst. But it is paid for commercial use. |
| @nivo/sunburst | Recharts sunburst | Recharts has NO sunburst component. Issue #576 open since 2017. Do not wait for it. |
| @nivo/treemap | Recharts Treemap | If your treemap needs are simple (no drill-down, no Canvas fallback). Recharts Treemap works for flat hierarchies. Nivo treemap is better for nested drill-down with 35 departments. |
| @number-flow/react | Custom Motion counter | If you need non-numeric animations. NumberFlow handles currency formatting, locale-aware separators, and digit-by-digit transitions out of the box. |
| Prisma 7 | Drizzle ORM | If you want SQL-closer syntax and smaller bundle. Drizzle is lighter but has less mature migration tooling. Prisma 7's Rust-free rewrite closes the bundle size gap significantly. |
| Prisma 7 | Kysely | If you want type-safe raw SQL. Good for complex queries, but you lose Prisma's migration system and Studio. |
| Next.js 16 | Next.js 15 | Only if a critical dependency is incompatible with Next.js 16. As of Feb 2026, Next.js 16 is stable (16.1.6). For a greenfield project, use 16. |
| Tailwind CSS 4 | Tailwind CSS 3 | Only if a UI component library you depend on hasn't migrated to v4. shadcn/ui works with Tailwind v4. |
| pdfplumber | Camelot / Tabula | If pdfplumber fails on a specific table layout. Try pdfplumber first -- it handles most budget PDFs well. Camelot uses OpenCV for visual line detection, which helps with borderless tables. |
| pdfplumber | PyMuPDF (fitz) | For faster extraction of simple text. But pdfplumber is significantly better at tables. |
| Motion (Framer Motion) | React Spring | If you want physics-based animations only. Motion is more versatile (layout, gestures, variants, AnimatePresence). |
| Railway / Supabase | Neon | If you want serverless PostgreSQL with auto-scaling to zero. Good for low-traffic civic tools. Prisma works with all three. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| D3.js for DOM manipulation | Conflicts with React's virtual DOM. D3.select() and React both want to own the DOM, causing bugs and memory leaks. | Use D3 only for math (scales, formats, layouts). Let React render SVG. |
| Recharts for sunburst charts | Feature does not exist. Open GitHub issue since 2017, never implemented. | @nivo/sunburst |
| Chart.js with React | Canvas-only rendering. No SVG output means no semantic HTML, harder accessibility (no element inspection, no aria labels on chart segments). | Recharts (SVG) or Nivo (SVG + Canvas option) |
| Float/Decimal for money | JavaScript floating point: 0.1 + 0.2 !== 0.3. Budget calculations with $13.2B will accumulate errors. | BigInt cents in PostgreSQL + Prisma BigInt type. Format with d3-format or Intl.NumberFormat in display layer only. |
| Pages Router | Legacy. App Router is the standard for new Next.js projects. Server Components, streaming, and parallel routes only work with App Router. | App Router |
| tailwind.config.js | Tailwind v4 uses CSS-first configuration with @theme directive. JS config still works but is the legacy path. | @theme directive in CSS |
| next lint | Removed in Next.js 16. Will error if you try to use it. | ESLint CLI directly, or Biome |
| middleware.ts | Deprecated in Next.js 16. Still works but will be removed. | proxy.ts |
| Prisma provider "prisma-client-js" | Old generator. Prisma 7 uses "prisma-client" for the Rust-free TypeScript-native client. | `provider = "prisma-client"` |
| JSON.stringify on BigInt directly | Throws "Do not know how to serialize a BigInt". Common crash in Next.js Server -> Client Component boundaries. | Convert BigInt to string/number in repository layer before passing to Client Components. |

## Stack Patterns by Variant

**If deploying to Vercel (recommended for Next.js):**
- Use Vercel's built-in Turbopack support (default in Next.js 16)
- Use Railway or Supabase for PostgreSQL (Vercel Postgres is Neon under the hood)
- Environment variables via Vercel dashboard
- Edge functions not needed (budget data is not latency-sensitive)

**If deploying to Render.com (per developer preference):**
- Use Render's Node.js service for Next.js
- Use Render PostgreSQL for database
- May need custom build command: `pnpm build`
- Set `NODE_ENV=production` in environment

**If budget data extraction fails with pdfplumber:**
- Try Camelot with `flavor='lattice'` for tables with visible borders
- Try Camelot with `flavor='stream'` for borderless tables
- Last resort: manual data entry from PDF into CSV, then import via Python script
- The Budget in Brief PDF is structured enough that pdfplumber should work

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.1.x | React 19.2.x | Must upgrade both together. Next.js 16 requires React 19.2. |
| Next.js 16.1.x | Node.js 20.9+ | Node 18 is NOT supported. Use Node 20 LTS or 22 LTS. |
| Next.js 16.1.x | TypeScript 5.1+ | TypeScript 5 required minimum. |
| Prisma 7.4.x | Node.js 18.18+ | Prisma 7 supports Node 18.18+, but since Next.js 16 requires 20.9+, use 20.9+. |
| Prisma 7.4.x | PostgreSQL 12+ | Works with PG 12-16. Recommend PG 16 for best performance. |
| Tailwind CSS 4.2.x | Next.js 16 | Use @tailwindcss/postcss plugin. Tailwind v4 works with Turbopack. |
| Recharts 3.7.x | React 18-19 | Recharts 3 supports React 18 and 19. |
| @nivo/* 0.99.x | React 18-19 | Nivo 0.99 tested with React 18 and 19. |
| motion 12.x | React 19 | Motion 12 has React 19 test suite in CI. |
| pdfplumber 0.11.9 | Python 3.10-3.14 | Tested across these Python versions. |

## Key Configuration Patterns

### Prisma Singleton for Next.js (Critical)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### BigInt Serialization for Server -> Client Components (Critical)

```typescript
// lib/serialize.ts
// Convert BigInt fields to numbers before passing to Client Components
export function serializeBudget<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}

// Usage in Server Component:
// const data = await prisma.departmentBudget.findMany()
// return <ClientChart data={data.map(serializeBudget)} />
```

**Important:** For budget values up to $13.2B ($13,233,238,000), storing as cents means max value is 1,323,323,800,000 (1.3 trillion cents). This is well within Number.MAX_SAFE_INTEGER (9,007,199,254,740,991), so converting BigInt to Number is safe for this project. If dealing with national-level budgets (trillions of dollars), you would need to keep BigInt and serialize to string instead.

### Tailwind v4 CSS-First Config

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --color-mdc-blue: #0057B8;
  --color-mdc-orange: #F7941D;
  --color-mdc-green: #00A651;
  --color-mdc-red: #EF4444;
  --font-sans: 'Inter', sans-serif;
}
```

### Next.js 16 Server Component Data Fetching

```typescript
// app/budget/page.tsx (Server Component - default)
import { prisma } from '@/lib/prisma'
import { BudgetTreemap } from '@/components/BudgetTreemap' // Client Component

export default async function BudgetPage() {
  const strategicAreas = await prisma.strategicArea.findMany({
    include: {
      departments: {
        include: { budgets: true }
      }
    }
  })

  // Serialize BigInt before passing to Client Component
  const data = JSON.parse(
    JSON.stringify(strategicAreas, (_, v) =>
      typeof v === 'bigint' ? Number(v) : v
    )
  )

  return <BudgetTreemap data={data} />
}
```

### D3 for Math, React for Rendering

```typescript
// Use D3 for calculations only
import { scaleLinear } from 'd3-scale'
import { format } from 'd3-format'

const formatDollars = format('$,.0f')
const formatBillions = (cents: number) =>
  format('$.2f')(cents / 100_000_000_000) + 'B'

// Let React render the SVG
function BudgetBar({ value, maxValue }: { value: number; maxValue: number }) {
  const scale = scaleLinear().domain([0, maxValue]).range([0, 100])
  return (
    <div
      className="h-4 bg-mdc-blue rounded"
      style={{ width: `${scale(value)}%` }}
    />
  )
}
```

## Sources

- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) -- HIGH confidence. Official Vercel blog, Oct 2025. Verified upgrade guide at nextjs.org/docs shows 16.1.6 as current.
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- HIGH confidence. Official docs, last updated 2026-02-27.
- [Prisma 7 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) -- HIGH confidence. Official Prisma blog.
- [Prisma 7.3.0 BigInt Fix](https://www.prisma.io/blog/prisma-orm-7-3-0) -- HIGH confidence. Official release notes documenting BigInt JSON precision fix.
- [Recharts GitHub Releases](https://github.com/recharts/recharts/releases) -- HIGH confidence. v3.7.0 confirmed on npm.
- [Recharts Sunburst Issue #576](https://github.com/recharts/recharts/issues/576) -- HIGH confidence. Open since March 2017, confirms no sunburst support.
- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/) -- HIGH confidence. Official docs with interactive examples.
- [Nivo Treemap Documentation](https://nivo.rocks/treemap/) -- HIGH confidence. Official docs.
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4) -- HIGH confidence. Official blog.
- [pdfplumber GitHub](https://github.com/jsvine/pdfplumber) -- HIGH confidence. v0.11.9 confirmed on PyPI.
- [Motion (Framer Motion) Docs](https://motion.dev/docs/react) -- HIGH confidence. Official docs. v12.34.x confirmed.
- [NumberFlow React](https://number-flow.barvian.me/) -- MEDIUM confidence. npm confirms v0.5.14. Small but actively maintained.
- [D3.js npm](https://www.npmjs.com/package/d3) -- HIGH confidence. v7.9.0 is latest stable.
- [Prisma BigInt Serialization Discussion](https://github.com/prisma/prisma/discussions/9793) -- MEDIUM confidence. Community solutions verified across multiple sources.
- [Prisma Singleton Pattern](https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help) -- HIGH confidence. Official Prisma docs for Next.js.

---
*Stack research for: Miami-Dade Budget Explorer*
*Researched: 2026-02-28*
