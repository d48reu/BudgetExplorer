# Pitfalls Research

**Domain:** Adding Interactive Visualizations, Tax Calculator, AI Descriptions, Search, and SEO to Existing Miami-Dade Budget Explorer
**Researched:** 2026-02-28
**Confidence:** HIGH (multi-source verification; existing codebase analyzed alongside current documentation)

**Context:** This is a v1.1 pitfalls analysis. The existing app ships Next.js 16 with App Router, Prisma 7 with PrismaPg adapter, PostgreSQL, BigInt cents for all monetary values, and a working homepage with Server Components. The pitfalls below focus on what goes wrong when ADDING treemap/sunburst drill-down, tax calculator, Claude API descriptions, full-text search, and SEO to this specific codebase.

## Critical Pitfalls

### Pitfall 1: Nivo Sunburst/Treemap Drill-Down Is Not Built-In -- Requires Custom State Management

**What goes wrong:**
Developers assume Nivo's treemap or sunburst component has a `drillDown` prop or built-in zoom behavior. It does not. The `onClick` handler fires with a `ComputedDatum` that historically lacked a `parent` property (Issue #1936). Without this, "zoom out" is impossible unless you track the hierarchy yourself. Teams build the chart, wire up onClick, then discover they cannot navigate back up the tree -- forcing a mid-feature rewrite of their state management.

**Why it happens:**
Nivo's documentation shows a "drill down to children" recipe on the sunburst page, which makes it look like a supported feature. In reality, it is a demo pattern that requires external state to track breadcrumb history and re-slice the data tree on each click. Developers prototype with one level of nesting and think it works, then hit the wall when implementing 4-level drill-down (Total -> Strategic Area -> Department -> Expenditure Category).

**How to avoid:**
1. Build the drill-down state machine FIRST, before touching Nivo. Define: current node path (breadcrumb), data slice function, zoom-in handler, zoom-out handler.
2. Use this pattern for state:
```typescript
type DrillState = {
  path: string[]        // ['root', 'public-safety', 'fire-rescue']
  currentData: TreeNode // sliced subset of full tree
}
```
3. Manage the full hierarchy tree in a `useRef` or context, and derive `currentData` from `path` on each navigation.
4. The `path` property on Nivo's `ComputedDatum` (added in later versions) lists ancestors -- verify your installed version has it before relying on it.
5. Prototype all 4 levels of drill-down with real budget data BEFORE building any UI polish. If the interaction feels wrong at the prototype stage, consider switching to a simpler drill-down pattern (click row in a sorted bar chart to expand, accordion-style).

**Warning signs:**
- onClick handler works for drill-in but no mechanism for drill-out
- Breadcrumb component shows path but clicking it does not update the chart
- Nivo re-renders the entire chart on every drill action (no transition, just a jump)
- Data tree is reshaped in a way that loses parent references

**Phase to address:**
Phase 1 (Interactive Visualizations) -- build the drill-down state machine and validate it with a throwaway Nivo prototype in the first 2 days. This is the single highest-risk feature in v1.1.

---

### Pitfall 2: BigInt Cents Leak Into Nivo Data Props, Crashing Visualizations

**What goes wrong:**
The existing codebase serializes BigInt to strings in `queries.ts` (e.g., `fy.total_budget?.toString() ?? '0'`). But when building Nivo chart data, developers query Prisma directly and forget to convert -- or they convert to string but Nivo expects `number` for its `value` property. Nivo silently renders zero-height rectangles or throws "value is not a number" errors. The chart appears but shows wrong proportions, or renders as a single colored block.

**Why it happens:**
The current serialization pattern converts BigInt to string in `queries.ts`, which works for display. But Nivo treemap/sunburst `value` fields must be JavaScript `number`. Converting BigInt cents directly to Number is safe for Miami-Dade's budget values (max ~$13.2B = 1,323,323,800,000 cents, well within `Number.MAX_SAFE_INTEGER`), but the conversion step is easy to forget. Additionally, the existing `formatDollarsAbbreviated()` in `format.ts` accepts `string | number` but Nivo data prep needs raw numbers, not formatted strings.

**How to avoid:**
1. Create a dedicated `toChartValue(cents: bigint | string | null): number` utility that converts cents to dollars as a Number, with an explicit safety check:
```typescript
export function toChartValue(cents: bigint | string | null): number {
  if (cents === null) return 0
  const n = Number(cents)
  if (!Number.isSafeInteger(n) && typeof cents === 'bigint') {
    console.warn(`Value ${cents} exceeds safe integer range for charts`)
  }
  return n / 100 // cents to dollars
}
```
2. Create chart-specific data query functions separate from display query functions. The chart queries return `number` values; the display queries return `string` values.
3. Never pass Prisma results directly to Nivo data arrays. Always transform through a typed mapping function.

**Warning signs:**
- Chart renders but all segments appear equal size
- Console shows NaN or Infinity in chart calculations
- Treemap renders as a single block with no subdivisions
- Type errors at build time about `string` not assignable to `number`

**Phase to address:**
Phase 1 (Interactive Visualizations) -- establish `toChartValue()` and chart-specific query functions before building any visualization component.

---

### Pitfall 3: force-dynamic on Every Page Kills SEO and Performance

**What goes wrong:**
The existing homepage uses `export const dynamic = 'force-dynamic'`, which means it is server-rendered on every single request. If this pattern is copied to department detail pages (`/departments/[slug]`), the strategic area pages, and the explorer page, then: every page hit generates a database query, no page is statically rendered for search engine crawlers, Time to First Byte (TTFB) depends on database latency, and Vercel serverless cold starts add 200-500ms to every uncached request. Google's crawler sees slow pages and deprioritizes them.

**Why it happens:**
The v1.0 homepage set `force-dynamic` because it queries the database. Developers copy this pattern to every new page because "it works." For a budget app where data changes once per year (annual budget cycle), this is dramatically over-fetching. The data is effectively static for 12 months.

**How to avoid:**
1. Use `generateStaticParams` for department and strategic area pages -- these slugs are known at build time:
```typescript
// app/departments/[slug]/page.tsx
export async function generateStaticParams() {
  const departments = await prisma.departments.findMany({
    select: { slug: true }
  })
  return departments.map(d => ({ slug: d.slug }))
}
```
2. Use ISR with a long revalidation period: `export const revalidate = 86400` (24 hours) as a safety net.
3. Remove `force-dynamic` from the homepage. Replace with `revalidate = 3600` (1 hour) or even `revalidate = 86400`.
4. The tax calculator page is the ONE page that should remain dynamic (user input varies), but even there, the millage rate data should be fetched with caching.
5. Use `unstable_cache` or the `"use cache"` directive (Next.js 15+) for database queries that return budget data.

**Warning signs:**
- Every page file contains `export const dynamic = 'force-dynamic'`
- Lighthouse TTFB exceeds 800ms on department pages
- Google Search Console shows "Slow" Core Web Vitals for indexed pages
- Vercel dashboard shows high serverless function invocations for a low-traffic site

**Phase to address:**
Phase 4 (SEO & Launch) -- but the pattern must be established in Phase 2 (Department Detail Pages) when creating the first batch of static department pages.

---

### Pitfall 4: Prisma Cannot Create or Query tsvector Columns Natively

**What goes wrong:**
Developers try to add PostgreSQL full-text search by adding a `tsvector` column to the Prisma schema. Prisma does not support the `tsvector` type -- it must be marked as `Unsupported("tsvector")`. This means: Prisma migrations cannot create the column properly, GIN indexes on tsvector columns get removed during `prisma migrate dev` drift detection, `prisma db push` may drop the search column entirely, and all full-text search queries must use `$queryRaw` or TypedSQL.

**Why it happens:**
Prisma's `fullTextSearch` preview feature (for PostgreSQL) uses `ILIKE` and `@@` operators but does not manage `tsvector` columns or GIN indexes. Developers read about Prisma's "full-text search" feature and assume it handles everything. In reality, for production-quality PostgreSQL FTS with proper indexing, you need raw SQL for column creation, index management, and querying.

**How to avoid:**
1. Do NOT add tsvector columns to `schema.prisma`. Manage them entirely in raw SQL migrations.
2. Create the tsvector column and GIN index in a standalone SQL migration file that Prisma does not manage:
```sql
-- Manual migration: add full-text search
ALTER TABLE departments ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) STORED;
CREATE INDEX idx_departments_search ON departments USING GIN(search_vector);
```
3. Use Prisma's `$queryRaw` with tagged template literals for search queries:
```typescript
const results = await prisma.$queryRaw`
  SELECT id, name, slug,
    ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
  FROM departments
  WHERE search_vector @@ plainto_tsquery('english', ${query})
  ORDER BY rank DESC
  LIMIT 20
`
```
4. Add a `prisma migrate diff` check to CI that warns if Prisma tries to drop search-related columns or indexes.
5. Consider TypedSQL (`.sql` files with `$queryRawTyped`) for type-safe raw search queries in Prisma 7.

**Warning signs:**
- `prisma migrate dev` generates a migration that drops the `search_vector` column
- `prisma db push` warnings about "column not in schema"
- Search queries using `LIKE '%term%'` instead of `@@` operator (not using GIN index)
- Search response time exceeds 200ms for simple queries (missing GIN index)

**Phase to address:**
Phase 3 (Full-Text Search) -- set up the raw SQL migration approach from the start. Do not attempt to use Prisma's schema for FTS columns.

---

### Pitfall 5: Claude API Descriptions Generated at Runtime Blow Up Costs and Latency

**What goes wrong:**
Developers wire up Claude API calls in Server Components or API routes so that department descriptions are generated on-the-fly when users visit pages. With 35 departments, 9 strategic areas, and 5 fiscal years, that is ~220 potential API calls. Each call takes 2-5 seconds and costs ~$0.003-0.015 per call (Sonnet input + output tokens). Under traffic, this creates: $3-15/day in API costs for a simple budget site, 2-5 second latency added to every department page load, rate limiting errors (429) when multiple users browse simultaneously, and inconsistent descriptions (different users see different outputs for the same department).

**Why it happens:**
Server Components make API calls feel "free" because there is no client-side code to write. The pattern `const description = await generateDescription(department)` inside a page component looks clean and works perfectly in development with one user. The cost and latency only become apparent in production.

**How to avoid:**
1. Treat AI descriptions as a DATA PIPELINE step, not a runtime operation. Generate all descriptions once, store them in the existing `budget_descriptions` table, and serve them as static data.
2. Create a standalone script (`scripts/generate-descriptions.ts`) that:
   - Queries all departments and their budget data
   - Generates descriptions via Claude API with structured output
   - Stores results in `budget_descriptions` with `model_version` and `generated_at` timestamps
   - Is idempotent (skips already-generated descriptions)
3. The `budget_descriptions` table already exists in the schema with `entity_type`, `entity_id`, `summary`, `detailed_description`, `key_changes`, and `model_version` columns. Use it.
4. Run the generation script manually or via CI after data pipeline updates. Never call Claude API from the web application.
5. Cache descriptions aggressively -- they change only when budget data changes (once per year).

**Warning signs:**
- `ANTHROPIC_API_KEY` appears in the Next.js `.env` file (should only be in the pipeline `.env`)
- Import of `@anthropic-ai/sdk` in any file under `src/` (should only be in `scripts/` or `pipeline/`)
- Department pages take >2 seconds to load
- Anthropic dashboard shows API calls correlating with page views

**Phase to address:**
Phase 2 (AI Descriptions) -- build the generation script first, run it once to populate `budget_descriptions`, then build department pages that simply query the table.

---

### Pitfall 6: Tax Calculator Millage Math Precision Errors

**What goes wrong:**
The tax calculator takes a user's property value and applies millage rates to show their tax breakdown by service. Millage rates are stored as `DECIMAL(8,4)` in PostgreSQL (e.g., 9.5778). Developers convert the Prisma `Decimal` type to JavaScript `number` and do arithmetic like `propertyValue * millageRate / 1000`. JavaScript floating-point math produces results like `$2,874.1999999999997` instead of `$2,874.20`. Users notice and lose trust in the tool's accuracy.

**Why it happens:**
Prisma returns `Decimal` fields as `Prisma.Decimal` objects (a wrapper around decimal.js). Developers call `.toNumber()` to get a JavaScript float, then do arithmetic. The millage formula `assessed_value * mills / 1000` compounds floating-point errors because the multiplication and division are both imprecise.

**How to avoid:**
1. Do ALL millage arithmetic in integer cents. Convert the user's property value to cents, multiply by millage rate scaled to avoid decimals:
```typescript
// Property value: $400,000
// Millage rate: 9.5778 mills
// Formula: (value * millage) / 1000
// In cents: (40_000_000 * 95778) / 10_000_000
const taxCents = Math.round(
  (propertyValueCents * millageRateScaled) / 10_000_000n
)
```
2. Alternatively, use the `Decimal` library directly (already available via Prisma's dependency):
```typescript
import { Decimal } from '@prisma/client/runtime/library'
const tax = new Decimal(propertyValue).mul(millageRate).div(1000)
const displayValue = tax.toFixed(2) // Exact: "$2,874.20"
```
3. Display calculated taxes with exactly 2 decimal places. Never show more than 2 decimal places for dollar amounts in the calculator.
4. Add a disclaimer: "This is an estimate. Actual taxes may vary based on exemptions, assessments, and rate changes." Miami-Dade's own Property Appraiser tool includes this disclaimer.
5. Validate against Miami-Dade's official tax estimator at `apps.miamidadepa.gov/PAOnlineTools/Taxes/TaxEstimator.aspx` for a few sample property values.

**Warning signs:**
- Displayed tax amounts have more than 2 decimal places
- Calculator results differ from Miami-Dade's official estimator by more than $1
- JavaScript `number * number / 1000` arithmetic appears in calculator code without rounding
- Tests pass with round numbers but fail with real millage rates

**Phase to address:**
Phase 2 (Tax Calculator) -- establish the Decimal arithmetic pattern before building any calculator UI.

---

### Pitfall 7: Nivo Charts Destroy Mobile Experience

**What goes wrong:**
Treemap and sunburst charts render beautifully on desktop but become unusable on mobile (375px viewport). Small rectangles in the treemap are untappable (below 44x44px WCAG minimum), sunburst arc labels overlap and become unreadable, and the drill-down interaction conflicts with scroll/swipe gestures. Nivo's `ResponsiveTreeMap` adjusts size but does not adjust the data density or interaction model for small screens. Known issue: Nivo interactive charts have documented problems on iOS specifically (Issue #445).

**Why it happens:**
Developers build and test on desktop monitors. Responsive wrappers (`ResponsiveTreeMap`, `ResponsiveSunburst`) resize the chart container but do not reduce the number of data points. A 9-segment treemap on a 1440px screen becomes a 9-segment treemap on a 375px screen, with each segment being 4x smaller. Miami-Dade's audience is primarily mobile (residents checking on phones).

**How to avoid:**
1. Design mobile-first: plan the mobile view BEFORE the desktop view.
2. On mobile (<768px), replace treemap/sunburst with a simpler visualization:
   - Sorted horizontal bar chart (one bar per strategic area)
   - Accordion list with budget amounts and colored indicators
   - Stacked bar chart with drill-down via tap-to-expand
3. Use a responsive component switch, not CSS hiding:
```typescript
'use client'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function BudgetVisualization({ data }) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  if (isMobile) return <BudgetBarChart data={data} />
  return <BudgetTreemap data={data} />
}
```
4. Test every chart interaction on a real phone (not just browser dev tools). Browser emulation misses iOS-specific touch event bugs.
5. Ensure all tappable chart areas are at least 44x44px per WCAG 2.5.5.

**Warning signs:**
- Chart looks correct on desktop but tiny segments are untappable on phone
- Users cannot drill down on mobile because tap targets are too small
- Chart labels overlap on narrow viewports
- Sunburst center hole disappears on small screens

**Phase to address:**
Phase 1 (Interactive Visualizations) -- define mobile alternative alongside desktop chart from the start, not as an afterthought.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Generating AI descriptions at runtime instead of pre-computing | Simpler architecture, no pipeline script | $3-15/day API costs, 2-5s latency per page, inconsistent descriptions | Never -- descriptions change once per year |
| Using `LIKE '%term%'` for search instead of tsvector + GIN | Works without raw SQL, no migration headaches | Full table scan on every search, O(n) performance, no ranking | Only acceptable during prototype phase, must migrate before launch |
| Keeping `force-dynamic` on all pages | Simpler mental model, always fresh data | Poor SEO, high serverless costs, slow TTFB | Only for pages with user-specific data (tax calculator results) |
| Using `Number()` for Prisma Decimal millage rates | Simpler code, no Decimal dependency in components | Floating-point precision errors in tax calculations | Never for financial calculations -- use Decimal library |
| Skipping mobile-specific chart design | Ship one visualization faster | Mobile users (majority of audience) cannot use the core feature | Never -- design mobile-first |
| Hardcoding current fiscal year in queries | Faster development | Breaks when FY 2026-27 data is added, requires code changes instead of data changes | Only in v1.1 if adding a fiscal year selector is out of scope, but isolate the hardcoded value to one constant |

## Integration Gotchas

Common mistakes when connecting v1.1 features to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Nivo + BigInt data from Prisma | Passing `string` cents to Nivo `value` props, or passing raw BigInt | Create `toChartValue()` utility that converts BigInt cents to Number dollars; use in all chart data preparation |
| Prisma 7 + PostgreSQL tsvector | Adding tsvector column to `schema.prisma` | Manage tsvector columns and GIN indexes in raw SQL migrations outside Prisma's schema management |
| Prisma Decimal + Tax Calculator | Calling `.toNumber()` on millage rates and doing float arithmetic | Use `Decimal` library for all millage arithmetic, round to 2 decimal places at display time only |
| Claude API + `budget_descriptions` table | Calling Claude API from Server Components at request time | Pre-generate descriptions in a pipeline script, store in DB, serve as static data |
| Next.js metadata + Department pages | Using static metadata that is identical across all department pages | Use `generateMetadata()` with department-specific titles, descriptions, and OG images |
| `generateStaticParams` + Prisma singleton | Prisma connection pool exhausted during static generation of 35+ pages | Ensure Prisma singleton pattern is used; pool size is sufficient for concurrent page generation; add `connection_limit` to DATABASE_URL |
| Nivo + Server Components | Importing Nivo directly in a Server Component (Nivo requires browser APIs) | Create `'use client'` wrapper components; use `next/dynamic` with `ssr: false` and loading skeletons |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching full department tree for every chart render | Slow page load, high memory usage | Fetch hierarchical data once in a Server Component, pass pre-shaped data to Client Component charts | > 200 data points across all fiscal years |
| Nivo SVG treemap with 100+ rectangles | Janky hover, slow transitions, high CPU | Use TreeMapCanvas for large datasets (>50 nodes); aggregate small departments into "Other" | > 50 visible rectangles on mobile |
| Re-rendering entire Nivo chart on drill-down | Full chart flicker, lost animation state | Use React.memo on chart wrapper; only change the `data` prop, keep `theme` and `colors` stable | Any drill-down interaction |
| Search without debouncing | Database hammered on every keystroke, laggy UI | Debounce search input by 300ms; show loading state during search | > 5 concurrent users searching |
| Loading all fiscal years for year-over-year comparison upfront | Large initial payload, slow Time to Interactive | Load current year by default; lazy-load comparison data when user selects "Compare" | > 3 fiscal years with expenditure breakdowns |
| OG image generation on every request | Slow social sharing previews, high serverless cost | Pre-generate OG images at build time or use ISR with long revalidation | Any social media sharing |

## Security Mistakes

Domain-specific security issues for v1.1 features.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Anthropic API key in Next.js environment variables | Key exposed in client bundle or server logs, unauthorized API usage | API key belongs ONLY in the data pipeline `.env`. The Next.js app should never import or reference the Anthropic SDK |
| Search input passed directly to `$queryRaw` without parameterization | SQL injection via search box | Always use Prisma's tagged template literals for raw queries: `` prisma.$queryRaw`...WHERE search_vector @@ plainto_tsquery('english', ${userInput})` `` -- Prisma auto-parameterizes |
| Tax calculator accepting and displaying arbitrary user input | XSS via property value field reflected in results | Validate input is a positive number between 0 and 100,000,000. Display only the computed result, never echo raw user input into HTML |
| Department slug used in `$queryRaw` without validation | SQL injection via crafted URL slug | Validate slug matches `/^[a-z0-9-]+$/` before using in any query. Use Prisma's type-safe `findUnique({ where: { slug } })` instead of raw SQL for slug lookups |

## UX Pitfalls

Common user experience mistakes specific to v1.1 features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tax calculator requires knowing your assessed value vs. market value | Users enter market value (Zillow estimate), get wrong tax amount | Explain the difference. Link to Miami-Dade Property Appraiser lookup. Default to "market value" and apply a standard assessment ratio, with a note |
| AI descriptions sound robotic or use budget jargon | Users skip the descriptions, defeating the purpose of plain-English explanations | Prompt Claude with explicit instructions: "Write for a Miami resident with no budget background. No jargon. Use specific examples. One paragraph max." Review all 35 descriptions manually before publishing |
| Search returns raw database matches with no context | User searches "parks" and gets a list of department names with no indication of relevance | Show search snippets with highlighted matching terms. Include budget amounts in search results. Group results by type (departments, strategic areas, descriptions) |
| Treemap shows budget amounts without context | "$2.8B for Public Safety" is meaningless to most residents | Show per-capita cost, percentage of total, and year-over-year change in chart tooltips. The existing `formatYoYChange()` in `format.ts` already supports this |
| SEO metadata is generic across all pages | Social shares show "Miami-Dade Budget Explorer" for every page, no department-specific info | Use `generateMetadata()` to create unique titles ("Fire Rescue Budget: $1.2B | Miami-Dade Budget Explorer") and descriptions per department page |
| Drill-down has no breadcrumb or back button | Users drill into a department and cannot figure out how to return to the overview | Show a breadcrumb trail (Total > Public Safety > Fire Rescue) with each level clickable. Add a "Back to Overview" button prominently |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces for v1.1 features.

- [ ] **Treemap drill-down:** Often missing zoom-out. Verify clicking a breadcrumb or back button returns to the parent level with animation, not a page reload
- [ ] **Sunburst chart:** Often missing center label. Verify the center shows the current drill level name and total value, updating on each drill action
- [ ] **Tax calculator:** Often missing homestead exemption. Miami-Dade homestead exemption ($50K off assessed value) dramatically changes results. Verify a checkbox for "Primary residence?" is included
- [ ] **Tax calculator:** Often missing disclaimer. Verify "This is an estimate" disclaimer with link to official Property Appraiser estimator
- [ ] **AI descriptions:** Often missing fiscal year context. Verify each description mentions the fiscal year it describes ("In FY 2025-26, Fire Rescue...")
- [ ] **AI descriptions:** Often missing "key changes" section. Verify `key_changes` column is populated and displayed, showing year-over-year budget narrative
- [ ] **Full-text search:** Often missing empty state. Verify search for "xyzzy123" shows a helpful message, not a blank page or error
- [ ] **Full-text search:** Often missing search result ranking. Verify results are ordered by relevance (ts_rank), not alphabetically or by ID
- [ ] **SEO sitemap:** Often missing. Verify `app/sitemap.ts` exists and returns all department and strategic area URLs with correct lastmod dates
- [ ] **SEO robots.txt:** Often missing or blocking crawlers. Verify `app/robots.ts` allows crawling of all public pages
- [ ] **OG images:** Often generic. Verify sharing `/departments/fire-rescue` on social media shows Fire Rescue-specific preview image with budget data
- [ ] **Department pages:** Often missing `generateStaticParams`. Verify `next build` pre-renders all 35 department pages (check build output for static page count)
- [ ] **Mobile charts:** Often untested on real devices. Verify treemap/sunburst alternative renders and is interactive on an actual iPhone or Android phone

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nivo drill-down state doesn't work at 4 levels | MEDIUM | Simplify to 2-level drill-down (Strategic Area -> Department). Show expenditure categories as a simple bar chart within department detail page instead of a 4th treemap level. 2-3 day rework. |
| BigInt values crash Nivo charts | LOW | Add `toChartValue()` utility, update all chart data preparation functions. 2-4 hour fix. No data loss. |
| force-dynamic on all pages tanks SEO | MEDIUM | Replace with `generateStaticParams` + ISR. Requires touching every page file but is mechanical. 1 day. Google re-crawl takes 1-2 weeks. |
| tsvector column dropped by Prisma migration | MEDIUM | Re-run the raw SQL migration to recreate column and GIN index. Add migration guard to CI. 1-2 hours for fix, but search data must be re-indexed. |
| Claude API costs spiral from runtime calls | LOW | Move API calls to pipeline script, populate `budget_descriptions` table, remove API key from Next.js env. 4-6 hours. Existing table schema supports this. |
| Tax calculator shows wrong amounts | LOW | Switch to Decimal arithmetic, add rounding. Validate against official estimator. 2-4 hour fix. |
| Charts unusable on mobile | HIGH | Requires designing and building alternative mobile visualizations. 3-5 days if done as afterthought. Much harder to retrofit than to plan upfront. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nivo drill-down not built-in | Phase 1: Interactive Visualizations | Working 4-level drill-down prototype with real data in first 2 days |
| BigInt leaking into chart data | Phase 1: Interactive Visualizations | `toChartValue()` utility exists; no `string` types in Nivo data arrays |
| Mobile chart unusability | Phase 1: Interactive Visualizations | Alternative visualization renders on 375px viewport; all tap targets >= 44x44px |
| Millage precision errors | Phase 2: Tax Calculator | Calculator results match Miami-Dade official estimator within $1 for 3 sample property values |
| Claude API at runtime | Phase 2: AI Descriptions | `ANTHROPIC_API_KEY` does not appear in `budget-explorer-web/.env`; all descriptions served from `budget_descriptions` table |
| Prisma vs tsvector conflict | Phase 3: Full-Text Search | `prisma migrate dev` does not generate a migration that drops search columns; GIN index exists in production |
| force-dynamic everywhere | Phase 4: SEO & Launch | `next build` output shows 35+ static department pages; homepage revalidates, not force-dynamic |
| Missing SEO metadata | Phase 4: SEO & Launch | Each department page has unique `<title>`, `<meta description>`, and OG image; `sitemap.xml` includes all pages |
| Generic OG images | Phase 4: SEO & Launch | Sharing 3 different department URLs on Twitter/LinkedIn shows 3 different preview images |
| Search SQL injection | Phase 3: Full-Text Search | Search query uses parameterized `$queryRaw` template literal; manual test with `'; DROP TABLE departments; --` input returns no results safely |

## Sources

- [Nivo Sunburst ComputedDatum missing parent property (Issue #1936)](https://github.com/plouc/nivo/issues/1936) -- HIGH confidence
- [Nivo sunburst drill-down demo commit](https://github.com/plouc/nivo/commit/b058f7b7a9750ce923e59b03bd6413391d6fa72f) -- HIGH confidence
- [Nivo ResponsiveLine not interactive on mobile (Issue #445)](https://github.com/plouc/nivo/issues/445) -- HIGH confidence
- [Nivo responsive issues with FlexBox/CSS Grid (Issue #411)](https://github.com/plouc/nivo/issues/411) -- MEDIUM confidence
- [Nivo Treemap documentation](https://nivo.rocks/treemap/) -- HIGH confidence
- [Nivo Sunburst documentation](https://nivo.rocks/sunburst/) -- HIGH confidence
- [Next.js Server and Client Components serialization](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- HIGH confidence
- [Next.js props serialization discussion (#46795)](https://github.com/vercel/next.js/discussions/46795) -- HIGH confidence
- [React Server Components performance pitfalls (LogRocket)](https://blog.logrocket.com/react-server-components-performance-mistakes) -- MEDIUM confidence
- [Bulletproof FTS in Prisma with PostgreSQL tsvector (Medium)](https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3) -- MEDIUM confidence
- [Prisma full-text search index not used (Issue #8950)](https://github.com/prisma/prisma/issues/8950) -- HIGH confidence
- [Prisma support tsvector columns (Issue #12343)](https://github.com/prisma/prisma/issues/12343) -- HIGH confidence
- [Prisma full-text search documentation (Preview)](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search) -- HIGH confidence
- [Prisma TypedSQL documentation](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql) -- HIGH confidence
- [Next.js generateMetadata documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- HIGH confidence
- [Next.js SEO: Metadata, Sitemaps & Canonical Tags](https://prateeksha.com/blog/nextjs-app-router-seo-metadata-sitemaps-canonicals) -- MEDIUM confidence
- [How to Configure SEO in Next.js 16](https://jsdevspace.substack.com/p/how-to-configure-seo-in-nextjs-16) -- MEDIUM confidence
- [Next.js ISR Guide](https://nextjs.org/docs/app/guides/incremental-static-regeneration) -- HIGH confidence
- [Next.js Caching and Revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) -- HIGH confidence
- [Claude API rate limits documentation](https://docs.claude.com/en/api/rate-limits) -- HIGH confidence
- [Google's guidance on AI-generated content](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content) -- HIGH confidence
- [Miami-Dade Property Appraiser Tax Estimator](https://apps.miamidadepa.gov/PAOnlineTools/Taxes/TaxEstimator.aspx) -- HIGH confidence
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling) -- HIGH confidence
- [MDN BigInt reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) -- HIGH confidence

---
*Pitfalls research for: Miami-Dade Budget Explorer v1.1 -- Adding Interactive Visualizations, Tax Calculator, AI Descriptions, Search, and SEO*
*Researched: 2026-02-28*
