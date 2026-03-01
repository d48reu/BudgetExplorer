# Phase 6: Search + SEO + Launch - Research

**Researched:** 2026-03-01
**Domain:** Full-text search (PostgreSQL tsvector), Next.js Metadata/SEO/OG images, sitemap/robots
**Confidence:** HIGH

## Summary

Phase 6 combines three distinct technical domains: (1) PostgreSQL full-text search via `tsvector` with Prisma `$queryRaw`, (2) Next.js file-based metadata conventions for SEO and Open Graph images, and (3) infrastructure files (sitemap, robots.txt, 404 page). All three are well-documented, stable patterns with no experimental APIs or risky library choices.

The search implementation requires a raw SQL migration to create a materialized search index table with `tsvector` columns and a GIN index, then a Prisma `$queryRaw` function to query it. The SEO work uses Next.js built-in file conventions (`opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `not-found.tsx`) with the `ImageResponse` API from `next/og` (bundled with Next.js, no extra dependency). The canonical domain `budgetexplorer.miami` must be hardcoded throughout.

**Primary recommendation:** Use a single SQL migration to create a `search_index` materialized view with weighted `tsvector` columns; use Next.js file-based metadata conventions (not API routes) for OG images; place root-level `opengraph-image.tsx` as default with route-level overrides for dynamic pages.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Search icon in navbar that navigates to a dedicated `/search` page (add to `nav-config.ts`)
- Full search box on `/search` page -- not a typeahead/command-K overlay
- Results grouped by type under section headers: "Departments", "Strategic Areas", "Glossary Terms"
- Type-appropriate result cards sharing a flat card shell:
  - **Departments**: name + strategic area badge + budget amount + AI description snippet
  - **Strategic areas**: name + colored border + cents-per-dollar badge + mission snippet
  - **Glossary terms**: term + full definition only
- Empty state shows helpful suggestions: "No results for 'xyz'. Try: parks, fire rescue, public safety" -- suggest popular departments or terms
- Searchable content: departments, strategic areas, and glossary terms
- Department search indexes: name + AI summary + key changes (from `budget_descriptions`)
- Strategic area search indexes: name + description
- Glossary search indexes: term + definition
- Do NOT index department aliases, expenditure categories, revenue sources, or disbursements
- Use PostgreSQL full-text search (`tsvector`) with ranking and stemming
- Weighted fields: names weighted higher than descriptions
- Single branded OG image template for all page types (via Next.js ImageResponse API)
- Minimal text card design: white/light background, page title prominently displayed, small "Miami-Dade Budget Explorer" branding at bottom
- Every page type gets a unique meta description: Homepage, explorer, department, calculator, glossary, search
- Sitemap auto-generated from database -- queries all department and area slugs dynamically
- Include `robots.txt`
- Canonical domain: `budgetexplorer.miami` -- use this URL everywhere in the codebase (sitemap.ts, robots.ts, OG images, footer, canonical tags)
- Deploy to Vercel preview URL for testing; DNS pointed to Vercel when ready for public launch
- No analytics setup now -- add TODO comment in layout.tsx
- Branded "page not found" with navigation back to homepage and explorer
- Match existing design system styling

### Claude's Discretion
- Search ranking weights and tsvector configuration details
- OG image exact layout, font sizes, and spacing
- 404 page illustration or icon choice
- Loading/skeleton states for search results
- Popular search suggestions list for empty state
- robots.txt crawl directives specifics

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Full-text search across departments, descriptions, and line items | PostgreSQL tsvector with weighted fields + GIN index + Prisma `$queryRaw` pattern; materialized search index view joining departments, strategic_areas, budget_descriptions, and glossary terms |
| SRCH-02 | Search results link to relevant department/area pages | Search query returns slug and entity type; result cards render as Next.js `Link` components to `/department/{slug}`, `/explorer/{area-slug}`, `/glossary#{term-slug}` |
| SRCH-03 | Empty state with helpful message when no results found | Client component checks results array length; renders suggestion chips linking to popular departments/terms |
| SEO-01 | Unique title/description/OG image per page type | Next.js `generateMetadata` (already on department + area + explorer + glossary + calculator pages) + root `opengraph-image.tsx` with route-level overrides for dynamic pages |
| SEO-02 | Department pages statically generated for SEO | Already implemented via `generateStaticParams` in `department/[slug]/page.tsx`; sitemap.ts enumerates all department + area slugs from DB |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Metadata API, ImageResponse, sitemap/robots file conventions, not-found.tsx | Already installed; all SEO features are built-in, no extra deps |
| `next/og` (ImageResponse) | bundled | OG image generation via JSX-to-PNG | Ships with Next.js; uses Satori + Resvg under the hood |
| PostgreSQL | 14+ | Full-text search via tsvector/tsquery/ts_rank | Database already in use; FTS is built into Postgres core |
| Prisma | 7.4.2 | `$queryRaw` for tsvector queries | Already installed; raw SQL is the standard approach for Postgres FTS with Prisma |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` | 2.1.1 | Conditional class merging for search result cards | Already installed; use for active states, card variants |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL tsvector | Prisma `search` preview feature | Prisma FTS is Preview-only, limited to `@fulltext` on MySQL; not available for PostgreSQL via Prisma API |
| PostgreSQL tsvector | Elasticsearch/Meilisearch | Massive overkill for ~50 searchable entities; adds infrastructure cost and complexity |
| `next/og` ImageResponse | `@vercel/og` package | `@vercel/og` was the old standalone package; `next/og` is the canonical import since Next.js 14+ |
| File-based `opengraph-image.tsx` | API route `/api/og` | File convention is simpler, auto-wires meta tags, cached by default; API route needed only for external image access |

**Installation:**
```bash
# No new dependencies needed -- everything is built-in to Next.js and PostgreSQL
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── opengraph-image.tsx          # Root OG image (default for all pages)
├── sitemap.ts                   # Dynamic sitemap from DB
├── robots.ts                    # robots.txt with canonical domain
├── not-found.tsx                # Custom 404 page
├── layout.tsx                   # Update: add canonical URL, analytics TODO
├── search/
│   └── page.tsx                 # Search page (server component for initial, client for interaction)
├── department/[slug]/
│   └── opengraph-image.tsx      # Dynamic OG for department pages
├── explorer/
│   └── [area-slug]/
│       └── opengraph-image.tsx  # Dynamic OG for area pages
src/lib/
├── db/queries.ts                # Add: searchBudget() function
├── nav-config.ts                # Add: Search nav entry
├── constants.ts                 # NEW: CANONICAL_DOMAIN, popular search suggestions
pipeline/migrations/
└── 004_search_index.sql         # NEW: Materialized view + GIN index
```

### Pattern 1: Materialized Search Index with Weighted tsvector
**What:** Create a materialized view that unions departments, strategic areas, and glossary terms into a single searchable table with a pre-computed `tsvector` column using `setweight()` for field priority.
**When to use:** When searching across multiple entity types with different schemas.
**Why materialized view:** The dataset is small (~55 rows: 35 depts + 9 areas + 11 glossary terms) and changes only at budget cycle boundaries. A materialized view avoids runtime tsvector computation and simplifies the query.

```sql
-- Source: PostgreSQL docs + verified pattern from multiple sources
-- Migration 004: Search index
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS

-- Departments: name (A weight) + AI summary + key_changes (B weight)
SELECT
  'department' AS entity_type,
  d.id AS entity_id,
  d.name AS title,
  d.slug,
  COALESCE(bd.summary, '') AS snippet,
  sa.name AS area_name,
  sa.color AS area_color,
  sa.slug AS area_slug,
  db.operating_budget,
  sab.cents_per_dollar,
  setweight(to_tsvector('english', d.name), 'A') ||
  setweight(to_tsvector('english', COALESCE(bd.summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(bd.key_changes, '')), 'B') AS search_vector
FROM departments d
JOIN strategic_areas sa ON d.strategic_area_id = sa.id
LEFT JOIN budget_descriptions bd ON bd.entity_type = 'department'
  AND bd.entity_id = d.id
  AND bd.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
LEFT JOIN department_budgets db ON db.department_id = d.id
  AND db.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')
  AND db.is_actual = false
LEFT JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
  AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')

UNION ALL

-- Strategic areas: name (A weight) + description (B weight)
SELECT
  'strategic_area' AS entity_type,
  sa.id AS entity_id,
  sa.name AS title,
  sa.slug,
  COALESCE(sa.description, '') AS snippet,
  sa.name AS area_name,
  sa.color AS area_color,
  sa.slug AS area_slug,
  sab.operating_budget,
  sab.cents_per_dollar,
  setweight(to_tsvector('english', sa.name), 'A') ||
  setweight(to_tsvector('english', COALESCE(sa.description, '')), 'B') AS search_vector
FROM strategic_areas sa
LEFT JOIN strategic_area_budgets sab ON sab.strategic_area_id = sa.id
  AND sab.fiscal_year_id = (SELECT id FROM fiscal_years WHERE label = 'FY 2025-26')

UNION ALL

-- Glossary terms: term (A weight) + definition (B weight)
-- Note: glossary is in-code (lib/glossary.ts), not DB. These are inserted via a seed step.
SELECT
  'glossary' AS entity_type,
  0 AS entity_id,
  term AS title,
  slug,
  definition AS snippet,
  NULL AS area_name,
  NULL AS area_color,
  NULL AS area_slug,
  NULL AS operating_budget,
  NULL AS cents_per_dollar,
  setweight(to_tsvector('english', term), 'A') ||
  setweight(to_tsvector('english', definition), 'B') AS search_vector
FROM glossary_terms;

-- GIN index for fast full-text lookups
CREATE INDEX idx_search_index_fts ON search_index USING gin(search_vector);
```

**Key decision: Glossary terms are currently in-code (`lib/glossary.ts`), not in the database.** Two options:
1. **Recommended:** Create a `glossary_terms` table and seed it from the existing `GLOSSARY_TERMS` array, so the materialized view can UNION them in. This keeps all searchable content in one place.
2. **Alternative:** Handle glossary search client-side with simple string matching, keeping DB search for departments/areas only. Simpler but splits search logic.

**Recommendation:** Option 1 (glossary in DB). The materialized view pattern is cleaner when all entities are queryable via the same SQL. The seed is trivial (~11 rows).

### Pattern 2: Prisma $queryRaw Search Function
**What:** A typed search function using `$queryRaw` with parameterized input.
**When to use:** For the search page server action or API.

```typescript
// Source: Prisma docs - $queryRaw tagged template literal (verified via Context7)
import { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'

export type SearchResult = {
  entity_type: 'department' | 'strategic_area' | 'glossary'
  entity_id: number
  title: string
  slug: string
  snippet: string
  area_name: string | null
  area_color: string | null
  area_slug: string | null
  operating_budget: bigint | null
  cents_per_dollar: number | null
  rank: number
}

export async function searchBudget(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  // Convert user input to tsquery: "fire rescue" -> "fire & rescue"
  const tsQuery = query.trim().split(/\s+/).join(' & ')

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      entity_type,
      entity_id,
      title,
      slug,
      snippet,
      area_name,
      area_color,
      area_slug,
      operating_budget,
      cents_per_dollar,
      ts_rank(search_vector, to_tsquery('english', ${tsQuery})) AS rank
    FROM search_index
    WHERE search_vector @@ to_tsquery('english', ${tsQuery})
    ORDER BY rank DESC
    LIMIT 50
  `
  return results
}
```

### Pattern 3: Next.js File-Based OG Image Convention
**What:** Place `opengraph-image.tsx` files at route segment levels. Root-level serves as default; route-level overrides for dynamic content.
**When to use:** When every page needs a unique OG image.

```typescript
// Source: Next.js v16.1.6 docs (verified via Context7)
// app/opengraph-image.tsx - Root default OG image
import { ImageResponse } from 'next/og'

export const alt = 'Miami-Dade Budget Explorer'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#111827' }}>
          Miami-Dade Budget Explorer
        </div>
        <div style={{ fontSize: 28, color: '#6B7280', marginTop: 16 }}>
          See where your tax dollars go
        </div>
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 18,
          color: '#9CA3AF',
        }}>
          budgetexplorer.miami
        </div>
      </div>
    ),
    { ...size }
  )
}
```

```typescript
// Source: Next.js v16.1.6 docs (verified via Context7)
// app/department/[slug]/opengraph-image.tsx - Dynamic per-department
import { ImageResponse } from 'next/og'
import { getDepartmentDetail } from '@/lib/db/queries'

export const alt = 'Department Budget'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const detail = await getDepartmentDetail(slug)
  const title = detail?.name ?? 'Department'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', backgroundColor: 'white',
      }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: '#111827' }}>
          {title}
        </div>
        <div style={{
          position: 'absolute', bottom: 40,
          fontSize: 18, color: '#9CA3AF',
        }}>
          Miami-Dade Budget Explorer
        </div>
      </div>
    ),
    { ...size }
  )
}
```

### Pattern 4: Dynamic Sitemap from Database
**What:** `app/sitemap.ts` exports a function that queries all department and area slugs.
**When to use:** When routes are database-driven.

```typescript
// Source: Next.js v16.1.6 docs (verified via Context7)
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

const BASE_URL = 'https://budgetexplorer.miami'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [departments, areas] = await Promise.all([
    prisma.departments.findMany({ select: { slug: true } }),
    prisma.strategic_areas.findMany({ select: { slug: true } }),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/explorer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/calculator`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.7 },
    { url: `${BASE_URL}/glossary`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ]

  const departmentPages = departments.map(dept => ({
    url: `${BASE_URL}/department/${dept.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const areaPages = areas.map(area => ({
    url: `${BASE_URL}/explorer/${area.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...departmentPages, ...areaPages]
}
```

### Pattern 5: robots.ts with Canonical Domain
```typescript
// Source: Next.js v16.1.6 docs (verified via Context7)
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://budgetexplorer.miami/sitemap.xml',
  }
}
```

### Anti-Patterns to Avoid
- **Using Prisma's `search` filter for FTS:** Prisma's full-text search is Preview-only and only supports MySQL `@@fulltext`. PostgreSQL requires `$queryRaw`.
- **Computing tsvector at query time:** Always pre-compute into a stored column or materialized view with a GIN index. Runtime `to_tsvector()` on every row is slow even for small datasets.
- **Using `$queryRawUnsafe` with string concatenation:** Always use the tagged template literal `$queryRaw` which auto-parameterizes. Never interpolate user input into SQL strings.
- **API route for OG images when file convention works:** The file convention (`opengraph-image.tsx`) auto-wires the `<meta>` tags. An API route requires manual meta tag setup.
- **Deriving canonical URL from request headers:** The user explicitly requires `budgetexplorer.miami` to be hardcoded, not derived from `req.headers.host`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search | Custom LIKE/ILIKE queries | PostgreSQL tsvector + GIN index | Stemming, ranking, stop words, accent handling all built-in; LIKE doesn't stem ("running" won't match "run") |
| OG image generation | Canvas/Puppeteer screenshot | `next/og` ImageResponse | Built into Next.js, uses Satori (JSX-to-SVG-to-PNG), no browser dependency, edge-compatible |
| Sitemap XML | Manual XML string builder | Next.js `sitemap.ts` convention | Auto-generates valid XML, handles encoding, integrates with build system |
| robots.txt | Static file in /public | Next.js `robots.ts` convention | Programmatic generation, type-safe, can reference canonical domain from constants |
| Search input debouncing | Custom setTimeout wrapper | URL search params with `useSearchParams` | Server component can read `?q=` param; no debounce needed for form submission pattern (not typeahead) |

**Key insight:** This phase uses zero external dependencies. Everything is built into Next.js or PostgreSQL. The only "new" code is the SQL migration and the search query function.

## Common Pitfalls

### Pitfall 1: Prisma Schema Drift with Raw SQL Objects
**What goes wrong:** Adding tsvector columns or materialized views via raw SQL migration causes Prisma to flag "drift" because `prisma db pull` doesn't know about the materialized view.
**Why it happens:** Prisma's introspection doesn't track materialized views or tsvector columns.
**How to avoid:** Use a materialized view (not a new column on existing tables). Materialized views are invisible to Prisma's schema introspection. The `$queryRaw` function queries the view directly without needing a Prisma model.
**Warning signs:** `prisma migrate dev` warns about schema drift or tries to drop your custom objects.

### Pitfall 2: tsquery Syntax Errors from User Input
**What goes wrong:** Raw user input like `"fire & rescue"` or `"parks | "` passed directly to `to_tsquery()` causes PostgreSQL syntax errors.
**Why it happens:** `to_tsquery()` expects strict syntax (`fire & rescue`). User typos, special characters, or empty strings crash the query.
**How to avoid:** Use `plainto_tsquery()` instead of `to_tsquery()` for user-facing search. It handles natural language input without syntax requirements. Alternatively, sanitize input by splitting on whitespace and joining with `&`.
**Warning signs:** 500 errors on search with unusual query strings.

**Recommendation:** Use `websearch_to_tsquery()` (PostgreSQL 11+) which handles quoted phrases, OR operators, and negation from natural user input. It's the most forgiving parser.

### Pitfall 3: ImageResponse Font Loading in Production
**What goes wrong:** Custom fonts loaded via `readFile` with `process.cwd()` work in dev but fail in serverless/edge environments.
**Why it happens:** Edge runtime doesn't have filesystem access. `process.cwd()` may not resolve correctly in all deployment targets.
**How to avoid:** Load fonts via `fetch()` from a public URL or embed them as base64. For this project, Inter is already loaded via `next/font/google` -- the OG image can fetch Inter from Google Fonts CDN or use the system font fallback (Satori supports system fonts).
**Warning signs:** OG images render with wrong/fallback font in production but look fine locally.

### Pitfall 4: Materialized View Not Refreshed After Data Changes
**What goes wrong:** New departments or updated descriptions don't appear in search results.
**Why it happens:** Materialized views are snapshots. They don't auto-update when underlying tables change.
**How to avoid:** This is acceptable for this project -- budget data changes once per fiscal year. Document that `REFRESH MATERIALIZED VIEW search_index;` must be run after any data pipeline update. Could add to the pipeline's post-load step.
**Warning signs:** Search returns stale data after running the data pipeline.

### Pitfall 5: Missing generateStaticParams for OG Image Routes
**What goes wrong:** Dynamic `opengraph-image.tsx` in `department/[slug]/` generates images on-demand instead of at build time, causing slow first-hit latency.
**Why it happens:** Without `generateStaticParams` in the parent `page.tsx`, Next.js doesn't know which slugs to pre-render.
**How to avoid:** The department page already exports `generateStaticParams`. Next.js uses the parent page's static params for the OG image route too. Verify this works in the build output.
**Warning signs:** OG image URLs return slowly on first request.

### Pitfall 6: Glossary Terms Not in Database
**What goes wrong:** Glossary terms can't be included in the `search_index` materialized view because they only exist as a TypeScript array in `lib/glossary.ts`.
**Why it happens:** Glossary was implemented as a static in-code array (appropriate for a simple glossary page, but not for DB-powered search).
**How to avoid:** Create a `glossary_terms` table and seed it from the existing array. The migration is small (~11 INSERT statements). Update the glossary page to read from DB or keep the in-code array for the page and use DB only for search.
**Warning signs:** Search only returns departments and strategic areas, never glossary terms.

## Code Examples

Verified patterns from official sources:

### Search Page with URL Params (Server + Client Pattern)
```typescript
// app/search/page.tsx - Server component reads ?q= param
import { searchBudget } from '@/lib/db/queries'
import { SearchResults } from '@/components/search/SearchResults'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search across Miami-Dade County budget departments, strategic areas, and glossary terms.',
}

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const results = q ? await searchBudget(q) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-(--spacing-section)">
      {/* Search form posts to same page with ?q= */}
      <SearchForm initialQuery={q ?? ''} />
      <SearchResults query={q ?? ''} results={results} />
    </div>
  )
}
```

### Not-Found Page
```typescript
// Source: Next.js v16.1.6 docs (verified via Context7)
// app/not-found.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-heading font-bold text-text-primary">404</h1>
      <p className="mt-4 text-lg text-text-secondary">
        This page doesn't exist in the budget.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="...">Home</Link>
        <Link href="/explorer" className="...">Explorer</Link>
      </div>
    </div>
  )
}
```

### Updating Layout with Canonical Domain and Analytics TODO
```typescript
// app/layout.tsx - updates needed
export const metadata: Metadata = {
  metadataBase: new URL('https://budgetexplorer.miami'),
  title: {
    default: 'Miami-Dade Budget Explorer',
    template: '%s | Miami-Dade Budget Explorer',
  },
  description: "See where your tax dollars go. Explore Miami-Dade County's $13.2 billion budget.",
  openGraph: {
    title: 'Miami-Dade Budget Explorer',
    description: 'See where your tax dollars go.',
    siteName: 'Miami-Dade Budget Explorer',
    locale: 'en_US',
    type: 'website',
  },
}
// Note: metadataBase sets the base URL for all relative OG image URLs and canonical tags
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/og` standalone package | `next/og` (bundled with Next.js) | Next.js 14+ | No extra dependency needed; import from `next/og` |
| Manual `<meta>` tags in `<Head>` | `generateMetadata` + file conventions | Next.js 13+ (App Router) | Type-safe, auto-deduped, supports async data fetching |
| Static `sitemap.xml` in /public | `app/sitemap.ts` dynamic generation | Next.js 13+ | Database-driven, type-safe, auto-generates XML |
| `to_tsquery()` for user search | `websearch_to_tsquery()` | PostgreSQL 11 (2018) | Handles natural language input without syntax errors |
| tsvector column + trigger | Materialized view | N/A (both valid) | MV simpler when data changes infrequently (budget cycles) |
| `next-seo` package | Built-in Next.js Metadata API | Next.js 13+ | No external dependency; project STATE.md confirms this decision |

**Deprecated/outdated:**
- `next-seo`: Unnecessary with App Router's built-in Metadata API (confirmed in project STATE.md decisions)
- `@vercel/og`: Superseded by `next/og` bundled export
- `pages/_document.tsx` for meta tags: Replaced by App Router metadata conventions

## Open Questions

1. **Glossary terms table migration**
   - What we know: Glossary is currently a static TypeScript array (`lib/glossary.ts`, 11 terms). The materialized search view needs DB access to UNION glossary terms.
   - What's unclear: Whether to create a `glossary_terms` table and migrate the data, or handle glossary search separately in application code.
   - Recommendation: Create the table. It's ~11 INSERT statements and keeps all search logic in one SQL materialized view. The glossary page can continue using the in-code array or switch to DB reads.

2. **Materialized view refresh strategy**
   - What we know: Budget data changes once per fiscal year via the data pipeline.
   - What's unclear: Whether to add `REFRESH MATERIALIZED VIEW` to the pipeline automatically or document it as a manual step.
   - Recommendation: Add a `REFRESH MATERIALIZED VIEW search_index;` call at the end of the pipeline's load step. Also document the command for manual use.

3. **Search page rendering strategy**
   - What we know: User decided on a dedicated `/search` page with a full search box, not typeahead.
   - What's unclear: Whether to use `searchParams` (server-rendered results on page load with `?q=`) or a client-side fetch after form submit.
   - Recommendation: Use `searchParams` (`?q=` in URL). This makes search results bookmarkable/shareable, works without JavaScript, and the server component pattern is simpler. The search form can use a `<form action="/search">` with a `<input name="q">`.

## Sources

### Primary (HIGH confidence)
- Next.js v16.1.6 docs via Context7 (`/vercel/next.js/v16.1.6`) - Metadata API, ImageResponse, sitemap.ts, robots.ts, not-found.tsx, opengraph-image.tsx file conventions
- Prisma docs via Context7 (`/prisma/docs`) - `$queryRaw` tagged template literal, parameterized queries, SQL injection prevention
- PostgreSQL 18 official docs - [tsvector types](https://www.postgresql.org/docs/current/datatype-textsearch.html), [text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html)

### Secondary (MEDIUM confidence)
- [Pedro Alonso - Full-Text Search with PostgreSQL and Prisma](https://www.pedroalonso.net/blog/postgres-full-text-search/) - Prisma + tsvector integration pattern with `$queryRaw`, GIN index creation
- [Better Stack - Full-Text Search in Postgres with TypeScript](https://betterstack.com/community/guides/scaling-nodejs/full-text-search-in-postgres-with-typescript/) - `setweight()` pattern for weighted fields, generated tsvector columns
- [Next.js Official Metadata & OG Images Guide](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) - File-based vs API route OG image generation
- [Build with Matija - Dynamic OG Image Generation for Next.js 15+](https://www.buildwithmatija.com/blog/complete-guide-dynamic-og-image-generation-for-next-js-15) - Root-level vs route-level opengraph-image.tsx strategy

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed; no new dependencies; patterns verified via Context7 official docs
- Architecture: HIGH - Materialized view + GIN index is textbook PostgreSQL FTS; Next.js file conventions are well-documented stable APIs
- Pitfalls: HIGH - Each pitfall verified against official docs or confirmed by multiple community sources

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable -- no fast-moving dependencies; all APIs are GA)
