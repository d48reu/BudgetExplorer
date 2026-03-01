# Stack Research: v1.1 New Feature Additions

**Domain:** Civic budget visualization -- interactive charts, tax calculator, AI descriptions, search, SEO
**Researched:** 2026-02-28
**Confidence:** HIGH

## Existing Stack (DO NOT CHANGE -- validated in v1.0)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | 16.1.6 | Keep |
| React | 19.2.3 | Keep |
| Prisma | 7.4.2 | Keep (PrismaPg adapter) |
| PostgreSQL | 16+ | Keep |
| Tailwind CSS | v4 | Keep (@theme tokens) |
| @floating-ui/react | 0.27.18 | Keep (tooltips) |
| react-countup | 6.5.3 | Keep (hero counter) |
| clsx | 2.1.1 | Keep |
| pnpm | 9.x | Keep |
| Python pipeline | pdfplumber 0.11.9, anthropic 0.83.0 | Keep |

## New Dependencies for v1.1

### Total: 3 npm packages

```bash
pnpm add @nivo/treemap@0.99.0 @nivo/sunburst@0.99.0 @nivo/pie@0.99.0
```

That is the **complete** list of new npm packages. Everything else uses built-in Next.js features or existing PostgreSQL capabilities.

---

## Visualization: Nivo

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| @nivo/treemap | 0.99.0 | Budget drill-down: total -> strategic areas -> departments | HIGH |
| @nivo/sunburst | 0.99.0 | Radial hierarchy view of budget breakdown | HIGH |
| @nivo/pie | 0.99.0 | Revenue source donut chart (`innerRadius={0.5}`) | HIGH |

**React 19 compatibility:** Confirmed. All @nivo/* packages declare peer dependency `react: "^16.14 || ^17.0 || ^18.0 || ^19.0"`. Verified via `npm view` on 2026-02-28.

**Why Nivo (and not alternatives):**
- Recharts has NO sunburst or treemap components (sunburst issue #576 open since 2017, never implemented)
- Victory has no treemap support
- Chart.js / react-chartjs-2 has no treemap or sunburst; canvas-only limits accessibility
- Visx (Airbnb) provides low-level D3 primitives requiring significant boilerplate
- D3 alone requires too much imperative code; conflicts with React's DOM ownership
- Nivo provides treemap + sunburst + pie in one unified ecosystem with shared theming via `@nivo/core` (pulled in automatically as a dependency)

**Transitive dependencies pulled in by Nivo** (no action needed, just awareness):
- `@nivo/core`, `@nivo/colors`, `@nivo/theming`, `@nivo/tooltip`, `@nivo/text` (shared infra)
- `@nivo/arcs`, `@nivo/legends` (for pie/sunburst)
- `@react-spring/core` + `@react-spring/web` (animations)
- `d3-hierarchy` ^3.1.2 (treemap/sunburst layout math)
- `d3-shape` ^3.2.0 (arc generation for pie)
- `lodash` ^4.17.21

**Critical Next.js integration pattern:** Nivo components use React context internally, which requires `"use client"` directive. Data fetching stays in Server Components; chart rendering in Client Components.

```typescript
// Server Component (page.tsx) -- fetches data
const areas = await prisma.strategic_area_budgets.findMany({ ... });
const chartData = transformToNivoFormat(areas);
return <BudgetTreemap data={chartData} />;

// Client Component (BudgetTreemap.tsx) -- renders chart
"use client";
import { ResponsiveTreeMap } from '@nivo/treemap';
export function BudgetTreemap({ data }) { ... }
```

### Penny Visualization: No Library Needed

The "penny visualization" (dollar broken into colored segments by strategic area) uses the existing `strategic_area_budgets.cents_per_dollar` column. Build with:
- Pure CSS grid or flexbox with colored segments
- Each segment width = `cents_per_dollar` percent
- Strategic area colors from `strategic_areas.color` column
- This is a styling exercise, not a charting problem

### Year-over-Year Comparisons: No Library Needed

Bar comparisons for 5 fiscal years can be built with:
- Tailwind CSS width percentages for horizontal bars
- Or reuse `@nivo/pie` (already added) if ring comparison is desired
- The data exists in `department_budgets` table with `fiscal_year_id` foreign key
- The `v_department_yoy` database view already computes prior-year values via LAG()

**If bar charts are needed later:** Add `@nivo/bar` at that point. Do not add it now.

---

## AI-Generated Descriptions: Python Pipeline (No New Dependencies)

| Technology | Version | Already Installed | Confidence |
|------------|---------|-------------------|------------|
| anthropic (Python SDK) | 0.83.0 | Yes | HIGH |

**Use the existing Python pipeline, NOT a Node.js SDK.**

Rationale:
1. The `budget_descriptions` table already exists with `summary`, `detailed_description`, `key_changes`, and `model_version` columns
2. Descriptions are generated once per budget cycle (annually), not per user request
3. Python pipeline (`/pipeline/`) already has anthropic 0.83.0 installed
4. Adding `@anthropic-ai/sdk` to Node.js would introduce runtime API latency and unpredictable costs
5. Model: `claude-sonnet-4-5-20250929` per PROJECT.md constraints

**Implementation:** Add a new pipeline command `python -m pipeline generate-descriptions` that:
1. Reads department and strategic area data from PostgreSQL
2. Calls Claude API for each entity (batch, not real-time)
3. Writes results to `budget_descriptions` table
4. Records `model_version` for reproducibility

**Do NOT add @anthropic-ai/sdk (v0.78.0) to the Node.js app** unless a real-time AI feature (chatbot, ask-about-budget) is added in a future milestone.

---

## Full-Text Search: PostgreSQL Native via $queryRaw (No New Dependencies)

| Technology | Version | Already Available | Confidence |
|------------|---------|-------------------|------------|
| PostgreSQL tsvector + GIN index | native | Yes (PostgreSQL 16) | HIGH |
| Prisma $queryRaw | 7.4.2 | Yes | HIGH |

**Why PostgreSQL native FTS, not Prisma's preview feature:**
- `fullTextSearchPostgres` is still a Preview feature in Prisma 7 (GA only for MySQL)
- Preview features can change between versions
- The search corpus is tiny (~35 departments, ~9 strategic areas, ~300 budget descriptions)
- `$queryRaw` with `to_tsvector`/`plainto_tsquery` is simple, stable, and fully type-safe

**Why NOT Elasticsearch, Algolia, or Meilisearch:**
- Massive overkill for ~350 searchable rows
- Adds operational complexity (another service to deploy and pay for)
- PostgreSQL handles this volume in single-digit milliseconds

**Implementation approach:**

1. SQL migration -- add generated tsvector columns with GIN indexes:

```sql
ALTER TABLE departments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX idx_departments_search ON departments USING gin(search_vector);

ALTER TABLE budget_descriptions ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(summary, '') || ' ' ||
      coalesce(detailed_description, '') || ' ' ||
      coalesce(key_changes, ''))
  ) STORED;
CREATE INDEX idx_descriptions_search ON budget_descriptions USING gin(search_vector);
```

2. Search function using Prisma `$queryRaw`:

```typescript
export async function searchBudget(query: string) {
  const sanitized = query.replace(/[^\w\s]/g, '').trim();
  if (!sanitized) return [];

  return prisma.$queryRaw`
    SELECT d.name, d.slug, sa.name as strategic_area, 'department' as type,
           ts_rank(d.search_vector, plainto_tsquery('english', ${sanitized})) as rank
    FROM departments d
    JOIN strategic_areas sa ON sa.id = d.strategic_area_id
    WHERE d.search_vector @@ plainto_tsquery('english', ${sanitized})
    UNION ALL
    SELECT bd.summary as name, d.slug, sa.name as strategic_area, 'description' as type,
           ts_rank(bd.search_vector, plainto_tsquery('english', ${sanitized})) as rank
    FROM budget_descriptions bd
    JOIN departments d ON d.id = bd.entity_id AND bd.entity_type = 'department'
    JOIN strategic_areas sa ON sa.id = d.strategic_area_id
    WHERE bd.search_vector @@ plainto_tsquery('english', ${sanitized})
    ORDER BY rank DESC
    LIMIT 20
  `;
}
```

3. Expose via Next.js Server Action or Route Handler (`app/api/search/route.ts`)

**Note on Prisma schema:** The `search_vector` columns are `GENERATED ALWAYS AS ... STORED`, so Prisma schema needs `Unsupported("tsvector")?` annotation. Since we use `$queryRaw` for search, this column does not need to be modeled in Prisma -- it exists at the database level only. Add via raw SQL migration, not Prisma migrate.

---

## SEO: Next.js Built-in Features (Zero New Dependencies)

| Feature | Implementation | New Packages | Confidence |
|---------|---------------|--------------|------------|
| Page metadata | `generateMetadata()` in each page.tsx | None (built-in) | HIGH |
| Open Graph tags | Return `openGraph` object from generateMetadata | None (built-in) | HIGH |
| Twitter cards | Return `twitter` object from generateMetadata | None (built-in) | HIGH |
| Dynamic OG images | `opengraph-image.tsx` file convention with `ImageResponse` from `next/og` | None (built-in) | HIGH |
| Sitemap | `app/sitemap.ts` file convention | None (built-in) | HIGH |
| Robots.txt | `app/robots.ts` file convention | None (built-in) | HIGH |
| JSON-LD structured data | `<script type="application/ld+json">` in page components | None | HIGH |

**Why NOT add next-seo:** Deprecated for App Router. The built-in Metadata API replaced it entirely. Mixing the two causes conflicts.

**Why NOT add schema-dts for JSON-LD typing:** Only 6-8 JSON-LD objects needed across the entire site. Hand-typing the few Schema.org interfaces (`GovernmentOrganization`, `Dataset`, `WebPage`) is simpler than adding a 1.1MB type-only package.

**Key patterns:**

```typescript
// app/departments/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dept = await getDepartment(params.slug);
  return {
    title: `${dept.name} | Miami-Dade Budget Explorer`,
    description: dept.description || `${dept.name} budget breakdown`,
    openGraph: {
      title: `${dept.name} Budget`,
      description: `See how ${dept.name} spends its $${formatDollars(dept.total_budget)} budget`,
      type: 'website',
    },
  };
}
```

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const departments = await prisma.departments.findMany({ select: { slug: true } });
  const strategicAreas = await prisma.strategic_areas.findMany({ select: { slug: true } });

  return [
    { url: 'https://budgetexplorer.miamidade.tools', lastModified: new Date(), priority: 1.0 },
    { url: 'https://budgetexplorer.miamidade.tools/explorer', priority: 0.9 },
    { url: 'https://budgetexplorer.miamidade.tools/calculator', priority: 0.8 },
    ...departments.map(d => ({
      url: `https://budgetexplorer.miamidade.tools/departments/${d.slug}`,
      priority: 0.7,
    })),
    ...strategicAreas.map(sa => ({
      url: `https://budgetexplorer.miamidade.tools/areas/${sa.slug}`,
      priority: 0.7,
    })),
  ];
}
```

```typescript
// app/departments/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export default async function OGImage({ params }: { params: { slug: string } }) {
  const dept = await getDepartment(params.slug);
  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 48, background: '#0057B8',
      color: 'white', width: '100%', height: '100%',
      alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div>
        <div style={{ fontSize: 24, opacity: 0.8 }}>Miami-Dade Budget Explorer</div>
        <div>{dept.name}</div>
        <div style={{ fontSize: 32 }}>
          ${(Number(dept.total_budget) / 100 / 1e6).toFixed(1)}M Budget
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

**OG image limitation:** Satori (the engine behind `ImageResponse`) does not support CSS Grid, `calc()`, or CSS custom properties. Use flexbox and inline styles only in OG image templates.

---

## Tax Calculator: No New Dependencies

The tax calculator is pure computation:
- **Input:** Property assessed value (user-entered number)
- **Data:** `millage_rates` table (already seeded with FY 2025-26 rates, total: 9.5778 mills)
- **Math:** `tax = assessed_value * millage_rate / 1000` for each authority
- **Output:** Breakdown table showing tax per authority, mapped to strategic area spending

**Implementation:**
- Server Component fetches millage rates from database
- Client Component handles the interactive input/slider
- Pure TypeScript arithmetic -- no math library needed
- If visual breakdown desired, reuse `@nivo/pie` (already being added)
- BigInt is not needed here since we are working with user-input property values and display-formatted results

---

## What NOT to Add for v1.1

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @anthropic-ai/sdk (Node.js) | Descriptions are batch-generated offline in Python pipeline | anthropic Python SDK (already installed) |
| Recharts | No sunburst or treemap; would duplicate Nivo functionality | @nivo/* packages |
| next-seo | Deprecated for App Router; conflicts with built-in Metadata API | Next.js generateMetadata |
| schema-dts | 1.1MB of types for 6-8 JSON-LD objects | Hand-type the few interfaces needed |
| Elasticsearch / Algolia / Meilisearch | Overkill for ~350 searchable rows | PostgreSQL native full-text search |
| Prisma fullTextSearchPostgres | Still Preview; raw SQL is simpler and stable | Prisma $queryRaw with tsvector |
| @nivo/bar, @nivo/line | Not needed for any v1.1 feature | Add later if bar/line charts needed |
| framer-motion / motion | Nivo provides animations via @react-spring (transitive dep) | @react-spring (comes with Nivo) |
| D3.js (direct) | Nivo wraps D3 internally; no need for separate D3 install | Nivo components |
| @number-flow/react | react-countup already handles animated numbers in v1.0 | Existing react-countup |
| tw-animate-css | Tailwind v4 has built-in animation utilities | Tailwind CSS native |
| pandas (Python) | Not needed for description generation | Direct SQL queries in pipeline |

---

## Version Compatibility Matrix

| New Package | Compatible With | Verified |
|-------------|-----------------|----------|
| @nivo/treemap@0.99.0 | React ^19.0 | Yes -- npm view peerDependencies |
| @nivo/sunburst@0.99.0 | React ^19.0 | Yes -- npm view peerDependencies |
| @nivo/pie@0.99.0 | React ^19.0 | Yes -- npm view peerDependencies |
| @nivo/*@0.99.0 | Next.js 16 App Router | Yes -- requires "use client" on chart wrappers |
| @nivo/*@0.99.0 | @react-spring 9.4.5, ^9.7.2, or ^10.0 | Transitive dep, auto-resolved |
| PostgreSQL tsvector | Prisma 7.4.2 $queryRaw | Yes -- raw SQL bypasses Prisma schema |
| next/og ImageResponse | Next.js 16.1.6 | Yes -- built-in module |

## Sources

- [@nivo/treemap npm](https://www.npmjs.com/package/@nivo/treemap) -- v0.99.0, peer deps verified via `npm view` (HIGH)
- [@nivo/sunburst npm](https://www.npmjs.com/package/@nivo/sunburst) -- v0.99.0, peer deps verified (HIGH)
- [@nivo/pie npm](https://www.npmjs.com/package/@nivo/pie) -- v0.99.0, peer deps verified (HIGH)
- [Nivo GitHub: React 19 support issue #2618](https://github.com/plouc/nivo/issues/2618) -- confirmed resolved (HIGH)
- [Nivo GitHub: Next.js "use client" issue #2626](https://github.com/plouc/nivo/issues/2626) -- confirmed required (HIGH)
- [Nivo Sunburst docs](https://nivo.rocks/sunburst/) -- official (HIGH)
- [Nivo Treemap docs](https://nivo.rocks/treemap/) -- official (HIGH)
- [Nivo Pie docs](https://nivo.rocks/pie/) -- official, innerRadius for donut (HIGH)
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.78.0 available but not recommended (HIGH)
- [Prisma Full-Text Search docs](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search) -- PostgreSQL FTS still Preview (MEDIUM)
- [PostgreSQL FTS with Prisma raw SQL](https://www.pedroalonso.net/blog/postgres-full-text-search/) -- pattern verified (MEDIUM)
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- official docs (HIGH)
- [Next.js OG images](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) -- official docs (HIGH)
- [Next.js sitemap.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) -- official docs (HIGH)
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld) -- official docs (HIGH)
- [Next.js robots.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) -- official docs (HIGH)
- [Recharts sunburst issue #576](https://github.com/recharts/recharts/issues/576) -- open since 2017, never implemented (HIGH)

---
*Stack research for: Miami-Dade Budget Explorer v1.1 feature additions*
*Researched: 2026-02-28*
