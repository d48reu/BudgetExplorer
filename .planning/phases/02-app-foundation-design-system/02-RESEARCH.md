# Phase 2: App Foundation + Design System - Research

**Researched:** 2026-02-28
**Domain:** Next.js App Router, Tailwind CSS design system, Prisma ORM data layer, responsive layout
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- $13.2B hero number uses a count-up animation (rolling from $0 to $13.2B over ~2 seconds)
- Below the hero number: a quick stats row showing key figures (9 strategic areas, 35 departments, etc.)
- Dual CTAs side by side: primary "Explore the Budget" and secondary "Calculate Your Taxes"
- Overall tone: authoritative but approachable -- trustworthy government resource that's actually well-designed
- Neutral base (white/gray) with color reserved almost entirely for data visualization and charts -- colors carry meaning, not decoration
- Miami-Dade brand colors (#0057B8 blue, #F7941D orange, #00A651 green, #EF4444 red) used primarily in data viz, not UI chrome
- Flat cards with subtle borders (no shadows) -- Linear/Notion aesthetic, clean and modern
- Medium information density -- balanced padding and text size, dashboard-like (Stripe Dashboard feel)
- Light mode only for v1, but design tokens (CSS variables) structured to support dark mode later
- Top navigation bar for main sections (Home, Explorer, Calculator, etc.)
- Sidebar navigation appears on detail/explorer pages for sub-navigation within sections
- Mobile: bottom tab bar (always visible, thumb-friendly, app-like feel)
- Resource footer: source budget PDF link, related resources (county budget office, open data portal), methodology notes, credit
- Breadcrumb navigation on all detail pages (e.g., Home > Explorer > Public Safety > Police)
- Budget jargon explained via inline tooltips on hover (desktop) / tap (mobile) -- dotted underline signals "this term is explained"
- Dedicated /glossary page listing all budget terms with plain-English definitions (good for SEO)
- Dollar amounts: adaptive formatting -- abbreviated in headlines/cards ($13.2B), full in tables/detail views ($13,233,238,000)
- Year-over-year percentage changes: neutral color-coding -- blue for increases, orange for decreases (avoids implying "good" or "bad")

### Claude's Discretion
- Loading skeleton design and animation patterns
- Exact spacing, typography scale, and component sizing
- Error state design and messaging
- Glossary term selection and definition writing
- Quick stats row: which specific stats to feature

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-01 | Homepage with hero ($13.2B animated), penny viz, treemap, revenue donut, CTA | Phase 2 builds the homepage shell with hero, quick stats, CTAs, and footer. Visualizations (treemap, penny viz, revenue donut) are Phase 3 -- leave placeholder slots. Use react-countup for hero animation. |
| UX-01 | Mobile-first responsive design (works on 375px+ viewports) | Tailwind CSS v4 responsive breakpoints with mobile-first utilities. Bottom tab bar on mobile, top navbar on desktop. Custom breakpoint at 375px minimum. |
| UX-02 | Miami-Dade brand colors (#0057B8 blue, #F7941D orange, #00A651 green, #EF4444 red) | Define as CSS custom properties via Tailwind v4 `@theme` directive. Reserve for data viz, not UI chrome per user decision. |
| UX-03 | Inter font for headings, system stack for body | next/font/google for Inter (self-hosted, zero layout shift). System font stack for body text. Configure via Tailwind `--font-*` tokens. |
| UX-04 | No jargon without tooltip/explanation | Build a `<BudgetTerm>` tooltip component using Floating UI for positioning. Dotted underline styling. Glossary data as static JSON. |
| UX-05 | Clean, modern UI -- "Mint.com for county budgets" | Linear/Notion flat card aesthetic with subtle borders. Stripe Dashboard density. Tailwind design tokens enforce consistency. |
| UX-06 | Semantic HTML throughout | Use proper `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<article>` elements. ARIA labels on interactive elements. |
| UX-07 | Every page has a clear "What am I looking at?" moment | Hero section with $13.2B number and tagline delivers this for homepage. Each page gets a header with title + one-sentence description. |
| SEO-03 | Footer links to source PDF on every page | Footer component with link to `https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf` rendered in layout. |
</phase_requirements>

## Summary

Phase 2 transforms the existing Python data pipeline project into a full-stack application by adding a Next.js frontend with Prisma ORM connecting to the same PostgreSQL database seeded in Phase 1. The frontend will be built with Next.js 15 (App Router, Server Components, TypeScript), styled with Tailwind CSS v4 using a custom design system based on Miami-Dade brand guidelines, and will use Prisma ORM to query the existing database schema via introspection (`prisma db pull`).

The key technical challenges are: (1) Prisma BigInt serialization -- all monetary values are stored as BigInt cents in PostgreSQL, and JavaScript BigInt is not JSON-serializable, requiring a data access layer that converts BigInts to strings/numbers before passing to client components; (2) Tailwind CSS v4 uses a new CSS-first configuration approach (`@theme` directive) replacing the old `tailwind.config.js`, which changes how design tokens are defined; (3) the responsive layout requires three distinct navigation patterns (top navbar desktop, sidebar on detail pages, bottom tab bar on mobile) that must work together coherently.

The project structure will co-locate the Next.js app alongside the existing `pipeline/` directory. Prisma introspects the existing PostgreSQL schema rather than defining models from scratch, ensuring the frontend data layer stays perfectly aligned with the Phase 1 database.

**Primary recommendation:** Use Next.js 15 with App Router + TypeScript, Prisma 6.x with `prisma db pull` to introspect the existing schema, Tailwind CSS v4 with `@theme` design tokens, react-countup for the hero animation, and Floating UI for tooltip positioning. Convert BigInt cents to display strings in a centralized data access layer.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | React framework with App Router, SSR, SSG | Industry standard for React apps; Server Components enable direct DB queries; built-in SEO via Metadata API |
| react / react-dom | 19.x | UI library | Ships with Next.js 15; required peer dependency |
| typescript | 5.x | Type safety | Ships with create-next-app; catches errors at build time |
| prisma | 6.19.x | ORM and schema management | Type-safe PostgreSQL queries; introspects existing schema; BigInt support |
| @prisma/client | 6.19.x | Generated database client | Type-safe query builder generated from schema |
| tailwindcss | 4.x | Utility-first CSS framework | CSS-first configuration; design tokens via CSS variables; 70% smaller output than v3 |
| @floating-ui/react | 0.26.x | Tooltip/popover positioning | Lightweight (~0.6KB), accessible, replaces Popper.js; powers tooltip component for budget jargon |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-countup | 6.5.x | Number count-up animation | Hero $13.2B animation with scroll spy support |
| @next/font (next/font) | built-in | Self-hosted font loading | Inter font with zero layout shift; included in Next.js |
| clsx | 2.x | Conditional class names | Combining Tailwind classes conditionally in components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind CSS v4 | Tailwind CSS v3 | v3 is more battle-tested but v4 is stable, produces smaller CSS, and is recommended for new projects |
| Floating UI | Radix UI Tooltip | Radix bundles more (trigger + content + portal); Floating UI is lower-level and lighter for custom tooltip styling |
| react-countup | Custom requestAnimationFrame | react-countup handles easing, formatting, scroll spy out of the box; custom solution is ~50 lines but needs testing |
| Prisma | Drizzle ORM | Drizzle is lighter and more SQL-like, but Prisma has better introspection support for existing databases and richer ecosystem |
| Prisma `prisma-client-js` | Prisma `prisma-client` (new) | New generator is the future (default in Prisma 7), but `prisma-client-js` is the stable default in Prisma 6.x. Use `prisma-client-js` for stability unless Prisma 7 is released before implementation. |

**Installation:**
```bash
pnpm create next-app@latest budget-explorer-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd budget-explorer-web
pnpm add prisma @prisma/client @floating-ui/react react-countup clsx
pnpm add -D prisma
```

## Architecture Patterns

### Recommended Project Structure
```
budget-explorer-web/
├── prisma/
│   └── schema.prisma           # Introspected from existing DB (prisma db pull)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout: Inter font, global nav, footer
│   │   ├── page.tsx            # Homepage: hero, quick stats, CTAs
│   │   ├── globals.css         # Tailwind imports + @theme design tokens
│   │   ├── glossary/
│   │   │   └── page.tsx        # Budget glossary (SEO page)
│   │   └── api/                # API routes (if needed)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx      # Top navigation bar (desktop)
│   │   │   ├── MobileTabBar.tsx # Bottom tab bar (mobile)
│   │   │   ├── Footer.tsx      # Resource footer with PDF link
│   │   │   └── Breadcrumbs.tsx # Breadcrumb navigation
│   │   ├── ui/
│   │   │   ├── BudgetTerm.tsx  # Tooltip component for jargon
│   │   │   ├── Card.tsx        # Flat card with subtle border
│   │   │   ├── Button.tsx      # Primary/secondary button variants
│   │   │   └── Skeleton.tsx    # Loading skeleton component
│   │   └── homepage/
│   │       ├── HeroBanner.tsx  # $13.2B count-up hero
│   │       ├── QuickStats.tsx  # Key figures row
│   │       └── CTASection.tsx  # Dual CTA buttons
│   ├── lib/
│   │   ├── prisma.ts           # Prisma singleton client
│   │   ├── db/
│   │   │   └── queries.ts      # Data access layer (BigInt -> string conversion)
│   │   ├── format.ts           # Dollar formatting utilities
│   │   └── glossary.ts         # Budget term definitions
│   └── types/
│       └── budget.ts           # TypeScript types for budget data
├── pipeline/                   # Existing Python pipeline (unchanged)
├── public/                     # Static assets
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
└── .env.local                  # DATABASE_URL (same as pipeline .env)
```

**Key decision:** The Next.js app lives at the project root in a `src/` directory. The existing `pipeline/` directory remains unchanged. Both share the same `DATABASE_URL` environment variable pointing to the same PostgreSQL database.

### Pattern 1: Prisma Introspection of Existing Schema
**What:** Use `prisma db pull` to generate a Prisma schema from the existing PostgreSQL database created by Phase 1 migrations, rather than writing Prisma models from scratch.
**When to use:** Always -- the database already exists with tables, views, and data.
**Example:**
```bash
# Initialize Prisma in the project
pnpm prisma init

# Set DATABASE_URL in .env.local (same as pipeline .env)
# Then introspect the existing database
pnpm prisma db pull

# Generate the typed client
pnpm prisma generate
```

The resulting `schema.prisma` will contain models for all tables: `fiscal_years`, `strategic_areas`, `departments`, `department_budgets`, `strategic_area_budgets`, `revenue_by_source`, `millage_rates`, etc. BigInt columns will automatically map to Prisma's `BigInt` type.

### Pattern 2: BigInt Serialization in Data Access Layer
**What:** Centralize BigInt-to-string conversion in a data access layer so Server Components never pass raw BigInt values to Client Components.
**When to use:** Every database query that returns monetary values (BigInt cents).
**Example:**
```typescript
// src/lib/db/queries.ts
import prisma from '@/lib/prisma'

// Type for serialized budget data (BigInt -> string)
export type SerializedFiscalYear = {
  id: number
  label: string
  totalOperating: string  // cents as string
  totalCapital: string
  totalBudget: string
  totalEmployees: number | null
}

export async function getCurrentFiscalYear(): Promise<SerializedFiscalYear | null> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

  if (!fy) return null

  return {
    id: fy.id,
    label: fy.label,
    totalOperating: fy.total_operating?.toString() ?? '0',
    totalCapital: fy.total_capital?.toString() ?? '0',
    totalBudget: fy.total_budget?.toString() ?? '0',
    totalEmployees: fy.total_employees,
  }
}
```

### Pattern 3: Dollar Formatting Utility
**What:** Centralized formatting functions that convert BigInt cents strings to display formats (abbreviated and full).
**When to use:** Every monetary value displayed in the UI.
**Example:**
```typescript
// src/lib/format.ts

/**
 * Format cents (as string or number) to abbreviated dollar display.
 * Examples: 1_323_323_800_000 -> "$13.2B", 857_560_600_000 -> "$8.6B"
 */
export function formatDollarsAbbreviated(cents: string | number): string {
  const dollars = Number(cents) / 100
  if (dollars >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toFixed(1)}B`
  }
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(0)}K`
  }
  return `$${dollars.toFixed(0)}`
}

/**
 * Format cents to full dollar display with commas.
 * Example: 1_323_323_800_000 -> "$13,233,238,000"
 */
export function formatDollarsFull(cents: string | number): string {
  const dollars = Math.round(Number(cents) / 100)
  return `$${dollars.toLocaleString('en-US')}`
}

/**
 * Format year-over-year percentage change.
 * Returns { value: "+5.2%", direction: "increase" | "decrease" | "unchanged" }
 */
export function formatYoYChange(
  currentCents: string | number,
  priorCents: string | number
): { value: string; direction: 'increase' | 'decrease' | 'unchanged' } {
  const current = Number(currentCents)
  const prior = Number(priorCents)

  if (prior === 0) return { value: 'N/A', direction: 'unchanged' }

  const pctChange = ((current - prior) / prior) * 100

  if (Math.abs(pctChange) < 0.05) {
    return { value: '0.0%', direction: 'unchanged' }
  }

  return {
    value: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`,
    direction: pctChange > 0 ? 'increase' : 'decrease',
  }
}
```

### Pattern 4: Tailwind v4 Design System with @theme
**What:** Define all design tokens (colors, fonts, spacing) via Tailwind v4's `@theme` directive in CSS, creating a consistent design system.
**When to use:** In `globals.css` -- the single source of truth for the design system.
**Example:**
```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Miami-Dade brand colors (for data viz, not UI chrome) */
  --color-mdc-blue: #0057B8;
  --color-mdc-orange: #F7941D;
  --color-mdc-green: #00A651;
  --color-mdc-red: #EF4444;

  /* Neutral UI palette */
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F9FAFB;
  --color-border: #E5E7EB;
  --color-border-strong: #D1D5DB;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;

  /* YoY change colors (neutral, not good/bad) */
  --color-change-increase: #0057B8;  /* blue */
  --color-change-decrease: #F7941D;  /* orange */

  /* Font families */
  --font-heading: "Inter", sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Responsive breakpoints */
  --breakpoint-xs: 23.4375rem;  /* 375px */
  --breakpoint-sm: 40rem;       /* 640px */
  --breakpoint-md: 48rem;       /* 768px */
  --breakpoint-lg: 64rem;       /* 1024px */
  --breakpoint-xl: 80rem;       /* 1280px */

  /* Spacing scale for dashboard density */
  --spacing-card: 1.25rem;      /* 20px - card padding */
  --spacing-section: 2rem;      /* 32px - between sections */
}
```

### Pattern 5: BudgetTerm Tooltip Component
**What:** A reusable component that wraps budget jargon with a dotted underline and shows a plain-English tooltip on hover/tap.
**When to use:** Any budget term that needs explanation (UX-04).
**Example:**
```tsx
// src/components/ui/BudgetTerm.tsx
'use client'

import { useState, useRef } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

type BudgetTermProps = {
  term: string
  definition: string
  children: React.ReactNode
}

export function BudgetTerm({ term, definition, children }: BudgetTermProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, { move: false })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover, focus, dismiss, role,
  ])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="border-b border-dotted border-text-secondary cursor-help"
        tabIndex={0}
        aria-describedby={isOpen ? `tooltip-${term}` : undefined}
      >
        {children}
      </span>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            id={`tooltip-${term}`}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
            role="tooltip"
          >
            <strong className="font-heading">{term}</strong>
            <p className="mt-1 text-text-secondary">{definition}</p>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
```

### Pattern 6: Server Component Data Fetching for Homepage
**What:** The homepage is a Server Component that queries the database directly via Prisma, then passes serialized data to Client Components (like the count-up hero).
**When to use:** All page-level data fetching.
**Example:**
```tsx
// src/app/page.tsx (Server Component)
import { getCurrentFiscalYear, getStrategicAreaCount, getDepartmentCount } from '@/lib/db/queries'
import { HeroBanner } from '@/components/homepage/HeroBanner'
import { QuickStats } from '@/components/homepage/QuickStats'
import { CTASection } from '@/components/homepage/CTASection'

export default async function HomePage() {
  const fiscalYear = await getCurrentFiscalYear()

  return (
    <main>
      <HeroBanner totalBudgetCents={fiscalYear?.totalBudget ?? '0'} />
      <QuickStats
        strategicAreas={9}
        departments={35}
        totalEmployees={fiscalYear?.totalEmployees ?? 0}
        fiscalYear={fiscalYear?.label ?? 'FY 2025-26'}
      />
      <CTASection />
      {/* Placeholder slots for Phase 3 visualizations */}
      <section aria-label="Budget visualizations" className="py-section">
        {/* Treemap, Penny Viz, Revenue Donut go here in Phase 3 */}
      </section>
    </main>
  )
}
```

### Anti-Patterns to Avoid
- **Passing raw Prisma objects to Client Components:** BigInt fields will crash JSON serialization. Always convert in the data access layer.
- **Using `tailwind.config.js` with Tailwind v4:** v4 uses CSS-first configuration via `@theme`. A JS config file is only needed for legacy compatibility, not new projects.
- **Hardcoding colors in component styles:** All colors must come from design tokens (`text-mdc-blue`, `bg-surface`, etc.) so dark mode can be added later by swapping token values.
- **Using `'use client'` on page components:** Pages should be Server Components for data fetching. Only mark interactive components (tooltips, count-up, mobile menu) as client components.
- **Building navigation from scratch without responsive states:** The three navigation patterns (top bar, sidebar, bottom tabs) must share route definitions to stay in sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Count-up number animation | Custom requestAnimationFrame loop | react-countup with `enableScrollSpy` | Handles easing, formatting, scroll trigger, accessibility; tested across browsers |
| Tooltip positioning | Manual absolute positioning | @floating-ui/react | Handles viewport boundaries, flipping, shifting, portal rendering; 0.6KB |
| CSS class composition | String concatenation | clsx utility | Handles arrays, objects, conditionals cleanly; prevents className bugs |
| Database query types | Manual TypeScript interfaces | Prisma generated types | Auto-generated from schema; always in sync with database |
| Font loading | Manual @font-face declarations | next/font/google (Inter) | Self-hosted, zero layout shift, automatic font-display:swap |
| BigInt serialization | Per-query manual conversion | Centralized data access layer | One place to maintain; prevents serialization errors from leaking |

**Key insight:** The biggest risk in this phase is not the individual components -- it's the data flow from PostgreSQL BigInt -> Prisma BigInt -> Server Component -> Client Component. Every step in that chain has serialization constraints. A centralized data access layer that converts BigInts at the boundary eliminates an entire class of runtime errors.

## Common Pitfalls

### Pitfall 1: BigInt Serialization Crash
**What goes wrong:** Passing Prisma query results containing BigInt fields directly to Client Components causes `TypeError: Do not know how to serialize a BigInt`.
**Why it happens:** JavaScript BigInt is not JSON-serializable. Next.js serializes Server Component props to send to the client.
**How to avoid:** Create a data access layer (`src/lib/db/queries.ts`) that converts all BigInt values to strings before returning. Never pass raw Prisma objects to components.
**Warning signs:** Runtime error on page load; works in server logs but crashes in browser.

### Pitfall 2: Tailwind v4 Configuration Confusion
**What goes wrong:** Developers try to use `tailwind.config.js` or `tailwind.config.ts` to define custom colors, fonts, and breakpoints, but Tailwind v4 ignores or partially reads them.
**Why it happens:** Tailwind v4 replaced JS config with CSS-first `@theme` directive. The old config format is only supported via `@config` directive for migration, not as the primary approach.
**How to avoid:** Define all design tokens in `globals.css` using `@theme { ... }`. Do not create a `tailwind.config.js` unless migrating an existing v3 project.
**Warning signs:** Custom colors/fonts not applying; Tailwind utilities not matching expected values.

### Pitfall 3: Prisma Client Instantiation in Development
**What goes wrong:** Hot module reloading creates multiple Prisma Client instances, exhausting database connections.
**Why it happens:** Each module reload creates a new `new PrismaClient()`. In development, Next.js reloads modules frequently.
**How to avoid:** Use the global singleton pattern: attach the client to `globalThis` in development, reuse across reloads.
**Warning signs:** "Too many clients already" error; database connection pool exhausted; slow queries in development.

### Pitfall 4: Mobile Navigation Z-Index Conflicts
**What goes wrong:** The bottom tab bar on mobile overlaps content, tooltips render behind the nav bar, or modal overlays don't cover the tab bar.
**Why it happens:** Multiple fixed-position navigation elements (top bar, bottom tabs) compete for z-index space with tooltips, dropdowns, and modals.
**How to avoid:** Define a z-index scale in design tokens: `z-base: 0`, `z-nav: 40`, `z-tooltip: 50`, `z-modal: 60`. Apply consistently. Use Floating UI's `FloatingPortal` for tooltips to render above navigation.
**Warning signs:** Tooltips cut off by nav bar; bottom tab bar covers page footer; scroll padding not accounting for fixed elements.

### Pitfall 5: Missing Body Padding for Fixed Navigation
**What goes wrong:** Page content hides behind the fixed top navbar or bottom tab bar.
**Why it happens:** Fixed-position elements are removed from document flow. Without compensating padding, content starts at y=0 behind the nav.
**How to avoid:** Add `pt-16` (top navbar height) to `<main>` and `pb-16` (bottom tab bar height) on mobile. Use CSS variables for nav heights so padding stays in sync.
**Warning signs:** First heading on page is hidden; footer is unreachable on mobile because bottom tab bar covers it.

### Pitfall 6: Prisma Introspection Naming Conventions
**What goes wrong:** `prisma db pull` generates model names matching PostgreSQL table names (snake_case), but TypeScript/React conventions expect PascalCase models and camelCase fields.
**Why it happens:** Prisma introspection mirrors the database schema exactly. The Phase 1 schema uses PostgreSQL naming conventions (snake_case).
**How to avoid:** After introspection, add `@@map("table_name")` and `@map("column_name")` annotations to the Prisma schema to keep TypeScript-friendly model names while preserving database column mappings. Alternatively, accept snake_case in the data access layer and convert to camelCase in the serialization step.
**Warning signs:** TypeScript code full of `fiscal_year_id` instead of `fiscalYearId`; inconsistent naming between frontend and data layer.

## Code Examples

### Next.js Root Layout with Inter Font and Navigation
```tsx
// Source: Next.js docs (next/font/google) + Context7
// src/app/layout.tsx
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/layout/Navbar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

import type { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Miami-Dade Budget Explorer',
    template: '%s | Miami-Dade Budget Explorer',
  },
  description:
    'See where your tax dollars go. Explore Miami-Dade County\'s $13.2 billion budget with interactive visualizations.',
  openGraph: {
    title: 'Miami-Dade Budget Explorer',
    description: 'See where your tax dollars go.',
    url: 'https://budgetexplorer.miamidade.tools',
    siteName: 'Miami-Dade Budget Explorer',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface text-text-primary font-body antialiased">
        <Navbar />
        <main className="pt-16 pb-16 md:pb-0 min-h-screen">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  )
}
```

### Prisma Singleton Client
```typescript
// Source: Prisma docs (guides/nextjs) + Context7
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
}

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
```

**Note on Prisma client generator:** The examples above use `prisma-client-js` (default in Prisma 6.x). If Prisma 7 is released before implementation, switch to the new `prisma-client` generator with explicit output path. The API is the same; only the import path changes.

### Hero Count-Up Component
```tsx
// Source: react-countup npm docs
// src/components/homepage/HeroBanner.tsx
'use client'

import CountUp from 'react-countup'

type HeroBannerProps = {
  totalBudgetCents: string
}

export function HeroBanner({ totalBudgetCents }: HeroBannerProps) {
  const totalBillions = Number(totalBudgetCents) / 100 / 1_000_000_000

  return (
    <section
      className="flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center"
      aria-label="Budget overview"
    >
      <p className="text-text-secondary text-sm md:text-base font-body uppercase tracking-wider mb-2">
        Miami-Dade County FY 2025-26 Total Budget
      </p>
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold text-text-primary">
        $<CountUp
          end={totalBillions}
          decimals={1}
          duration={2}
          separator=","
          suffix="B"
          enableScrollSpy
          scrollSpyOnce
        />
      </h1>
      <p className="mt-4 text-text-secondary text-lg md:text-xl max-w-2xl font-body">
        See where your money goes.
      </p>
    </section>
  )
}
```

### Responsive Footer with PDF Link
```tsx
// Source: project requirements (SEO-03)
// src/components/layout/Footer.tsx
const BUDGET_PDF_URL =
  'https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-secondary px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-heading font-semibold text-text-primary mb-3">
            Source Data
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <a
                href={BUDGET_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-primary underline"
              >
                FY 2025-26 Budget in Brief (PDF)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-text-primary mb-3">
            Related Resources
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>
              <a
                href="https://www.miamidade.gov/global/management/budget.page"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-primary underline"
              >
                County Budget Office
              </a>
            </li>
            <li>
              <a
                href="https://gis-mdc.opendata.arcgis.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-primary underline"
              >
                Open Data Portal
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-text-primary mb-3">
            About
          </h3>
          <p className="text-sm text-text-secondary">
            Built by Abreu Data Works LLC. Budget data sourced from the
            Miami-Dade County FY 2025-26 Adopted Budget.
          </p>
        </div>
      </div>
      <div className="mt-8 pt-4 border-t border-border text-center text-xs text-text-muted">
        Not an official Miami-Dade County website. Data is for informational
        purposes only.
      </div>
    </footer>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` (JS config) | `@theme` directive in CSS | Tailwind v4 (Jan 2025) | No JS config file needed; CSS variables as design tokens; 70% smaller output |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | Single import replaces three directives |
| Prisma `prisma-client-js` generator | `prisma-client` generator | Prisma 6.6+ (default in v7) | Generates individual .ts files; better tree-shaking; explicit output path |
| Next.js Pages Router | App Router (Server Components) | Next.js 13+ (stable 14+) | Direct DB queries in components; streaming; better SEO |
| `getStaticProps`/`getServerSideProps` | `async` Server Components | Next.js 13+ | Data fetching directly in component; no special functions |
| Manual font loading (@font-face) | `next/font/google` | Next.js 13+ | Self-hosted, zero CLS, automatic font-display:swap |

**Deprecated/outdated:**
- **Tailwind `tailwind.config.js`:** Still works via `@config` migration path but not recommended for new projects.
- **Prisma `prisma-client-js` generator:** Being phased out in favor of `prisma-client`. Still the default in Prisma 6.x but deprecated.
- **`getStaticProps` / `getServerSideProps`:** Pages Router patterns. Use `async` Server Components in App Router instead.
- **next-superjson-plugin:** Was popular for BigInt/Date serialization in Pages Router. With Server Components, centralized data access layer is cleaner.

## Open Questions

1. **Prisma generator choice: `prisma-client-js` vs `prisma-client`**
   - What we know: `prisma-client` is the new generator (better tree-shaking, individual files), becoming default in Prisma 7. `prisma-client-js` is the stable default in Prisma 6.x.
   - What's unclear: Whether Prisma 7 will be released before Phase 2 implementation. The new generator requires an explicit output path and changes the import pattern.
   - Recommendation: Use `prisma-client-js` (stable default) for Phase 2. The migration to `prisma-client` is straightforward and can be done in a future phase if desired.

2. **Project root structure: monorepo vs co-located**
   - What we know: The pipeline is Python, the frontend is Next.js/TypeScript. They share a database but have completely different toolchains.
   - What's unclear: Whether to use a monorepo tool (turborepo) or simply co-locate both directories at the project root.
   - Recommendation: Co-locate without monorepo tooling. The pipeline is a batch tool run manually; the frontend is the primary application. Keep them as siblings at the root (`pipeline/` and `src/`). This avoids monorepo complexity while keeping everything in one git repo.

3. **Navigation route definitions for future phases**
   - What we know: Phase 2 builds the nav shell, but most pages (Explorer, Calculator, etc.) don't exist yet.
   - What's unclear: How to handle nav links to pages that don't exist yet.
   - Recommendation: Define all nav routes in a central config. Pages that don't exist yet should either be hidden or link to a "Coming Soon" state. The nav component reads from this config so future phases just add route entries.

## Sources

### Primary (HIGH confidence)
- [Next.js GitHub docs (Context7 /vercel/next.js)](https://github.com/vercel/next.js) - App Router setup, layout, Server Components, metadata API, next/font/google
- [Prisma docs (Context7 /websites/prisma_io)](https://www.prisma.io/docs) - Singleton pattern, BigInt fields, schema introspection, PostgreSQL adapter
- [Tailwind CSS docs (Context7 /websites/tailwindcss)](https://tailwindcss.com/docs) - v4 @theme directive, responsive breakpoints, font configuration, design tokens

### Secondary (MEDIUM confidence)
- [react-countup npm](https://www.npmjs.com/package/react-countup) - v6.5.x, scroll spy, component/hook patterns
- [Floating UI docs](https://floating-ui.com/) - v0.26.x, tooltip positioning, React integration
- [Prisma BigInt serialization (GitHub discussions)](https://github.com/prisma/prisma/discussions/9793) - Community patterns for BigInt JSON serialization
- [Prisma upgrade to v6 docs](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-6) - Generator changes, new client output pattern
- [Tailwind CSS v4 + Next.js setup (GitHub discussion)](https://github.com/vercel/next.js/discussions/82623) - Community-verified compatibility

### Tertiary (LOW confidence)
- Prisma 7 timeline -- unclear if released before implementation begins
- Next.js 16 vs 15 -- v16 is available but v15 is the battle-tested choice; v16 compatibility with all dependencies not fully verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All library versions verified via Context7 and official docs; patterns confirmed with multiple sources
- Architecture: HIGH - Prisma introspection of existing DB is well-documented; Next.js App Router Server Components are stable; Tailwind v4 @theme is the documented approach
- Pitfalls: HIGH - BigInt serialization is the #1 reported issue in Prisma + Next.js projects; Tailwind v4 config confusion is widely documented; Prisma singleton pattern is in official docs

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable libraries; Prisma 7 release could change generator recommendation)
