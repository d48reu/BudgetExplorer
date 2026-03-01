# Project Research Summary

**Project:** Miami-Dade Budget Explorer v1.1
**Domain:** Civic budget visualization — interactive charts, tax calculator, AI descriptions, search, SEO
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

Miami-Dade Budget Explorer v1.1 extends a fully functional v1.0 foundation (homepage, design system, data pipeline, PostgreSQL schema) into a complete interactive budget transparency tool. The research confirms a critical insight: the database schema is already complete and seeded. Every v1.1 feature has its data waiting in PostgreSQL. This milestone is 90% frontend work — building the visualization, calculator, and content surfaces that expose data that already exists — plus one Python pipeline run to generate AI descriptions. The core technical decisions are resolved: Nivo (@nivo/treemap, @nivo/sunburst, @nivo/pie at 0.99.0) is the only viable charting library for this feature set, PostgreSQL native full-text search via raw SQL replaces any external search service, and all AI descriptions are pre-generated offline, never at runtime.

The recommended build approach follows a dependency-driven sequence: establish shared infrastructure first (DataTableToggle component, toChartValue() utility, chart query layer), then build the primary visualization experience (treemap drill-down + explorer page + department detail pages), then add the differentiating features (tax calculator, AI descriptions), and finally complete search and SEO as a launch-readiness phase. This ordering prevents the two highest-risk rework scenarios: building chart UI before validating the drill-down state machine works at all four hierarchy levels, and building department detail pages before AI descriptions are seeded into the database.

The single greatest technical risk is the Nivo treemap/sunburst drill-down, which has no built-in state management and requires a custom breadcrumb history pattern to be architected before any chart UI is built. The second risk is BigInt leaking into Nivo data props, causing silent rendering failures. The third risk is mobile usability: treemaps are unusable below 500px without a purpose-built accordion/list alternative. These three risks must be addressed in Phase 1. They cannot be retrofitted without significant rework.

---

## Key Findings

### Recommended Stack

The v1.0 stack (Next.js 16, React 19, Prisma 7, PostgreSQL 16, Tailwind v4) is validated and locked. Only three new npm packages are needed for v1.1: `@nivo/treemap@0.99.0`, `@nivo/sunburst@0.99.0`, and `@nivo/pie@0.99.0`. React 19 compatibility is confirmed for all three. Every other v1.1 feature — SEO, search, AI descriptions, tax calculator, penny visualization, year-over-year comparison — uses either existing dependencies or built-in Next.js/PostgreSQL capabilities.

Recharts, Victory, and D3 were evaluated and rejected: Recharts has no sunburst or treemap (GitHub issue open since 2017), Victory has no treemap, and raw D3 conflicts with React's DOM ownership. Nivo is the only library that provides treemap + sunburst + pie in one ecosystem with shared theming.

**Core technologies:**
- `@nivo/treemap@0.99.0`: Budget drill-down hierarchy (Total -> Strategic Areas -> Departments) — only library with treemap + sunburst in one ecosystem
- `@nivo/sunburst@0.99.0`: Alternate radial hierarchy view using same data format as treemap — zero additional cost to offer as a toggle
- `@nivo/pie@0.99.0`: Revenue source donut chart and expenditure breakdown — covers multiple use cases with one package
- PostgreSQL tsvector + GIN index via `$queryRaw`: Full-text search for ~350 rows — native, zero-cost, single-digit millisecond queries; Prisma's preview FTS feature does not support tsvector
- Next.js `generateMetadata()` + `opengraph-image.tsx`: SEO and OG images — built-in to Next.js 16, no external library needed; `next-seo` is deprecated for App Router
- Python `anthropic 0.83.0` (existing): AI description generation — offline batch only, never at runtime; SDK already installed in pipeline

**Critical version note:** All Nivo charts require `'use client'` directive on wrapper components. Nivo uses React Context internally. Data fetching stays in Server Components; chart rendering stays in Client Components.

### Expected Features

**Must have (table stakes) — v1.1 P1:**
- Interactive treemap drill-down with breadcrumb navigation — the primary product experience; every major civic budget tool has hierarchical drill-down; without it the product is a homepage with no depth
- Revenue source donut chart — "where money comes from" completes the story; every major competitor shows revenue alongside expenditures
- Department detail pages (35 pages, statically generated) — drill-down must land somewhere; dead-end navigation destroys the product
- Year-over-year comparison (sparklines on detail pages, 5 fiscal years) — static budget snapshot misleads; context of growth or decline is required
- Full-text search — users expect to type "fire" and find Fire Rescue; without search, the hierarchy is the only discovery mechanism
- SEO + Open Graph metadata per page — journalists share budget links; generic OG tags kill shareability on social media
- Mobile fallbacks for all charts — Miami-Dade's audience is primarily mobile; treemap is untappable below 500px without a purpose-built alternative
- Data table toggle for all charts — WCAG AA requires chart data available programmatically; screen readers cannot interpret SVG treemaps

**Should have (differentiators) — v1.1 P1:**
- "What does my tax dollar buy?" calculator — no civic budget tool combines property value input with strategic area allocation breakdown; this is the viral hook
- AI-generated plain-English department descriptions — no competitor uses AI to explain what departments do; transforms opaque acronyms into resident understanding
- Penny visualization (dollar broken into colored strategic area segments) — memorable, shareable graphic using `cents_per_dollar` column already seeded; Political Math's penny videos drove 1.7M views on this concept
- Contextual change annotations — AI-generated `key_changes` displayed as callout cards when YoY budget change exceeds 5%

**Defer to v1.2:**
- Sunburst as standalone view (offer only as treemap toggle for v1.1)
- Embeddable widgets
- CSV data export
- Side-by-side department comparison mode
- Spanish language support (build i18n-ready architecture now, ship content later)

**Defer to v2+:**
- Online checkbook / disbursements (different data source, requires county systems integration)
- Capital project map (requires geocoding, out of scope)
- Participatory "build your own budget" tool (tripling of scope, different product type)
- Runtime AI chatbot (unpredictable cost, hallucination risk at runtime)

### Architecture Approach

The architecture extends the Server Component / Client Component island pattern established in v1.0. Server Component pages fetch data via Prisma and pass serialized (string, not BigInt) props to Client Component chart wrappers. All Nivo charts are Client Components (Nivo's internal React Context use requires this). The data pipeline remains a separate Python process that generates and seeds data offline; the web app only reads from PostgreSQL, never calls external APIs at runtime. Full-text search is implemented via a new `/api/search` Route Handler using PostgreSQL tsvector and GIN indexes managed entirely outside Prisma's schema system.

**Major components:**
1. Query layer (`lib/db/explorer-queries.ts`, `department-queries.ts`, `calculator-queries.ts`, `search-queries.ts`) — Server-only Prisma queries returning Nivo-ready data shapes with `number` values (never BigInt or strings for chart data)
2. Chart components (`components/charts/`) — Client Component islands: BudgetTreemap, BudgetSunburst, RevenueDonut, PennyViz, YoYBarChart, ExpenditureBreakdown — each wraps a Nivo component with drill-down state or tooltip logic
3. ChartContainer (`components/charts/ChartContainer.tsx`) — shared wrapper providing loading skeleton, error boundary, and DataTableToggle for every chart; built once in Phase 1, reused everywhere
4. Feature pages (`app/explorer/`, `app/department/[slug]/`, `app/calculator/`, `app/search/`) — Server Component pages that orchestrate data fetching and pass pre-shaped data to chart islands
5. Python pipeline extension (`pipeline/describe.py`) — offline Claude API batch script generating and seeding `budget_descriptions` table (44 entities: 35 departments + 9 strategic areas) before department pages are built
6. SEO layer — `generateMetadata()` per page, `app/sitemap.ts`, `app/robots.ts`, `opengraph-image.tsx` per dynamic route

**Key architectural constraint:** Department pages use `generateStaticParams()` for static generation at build time (35 department + 9 area pages). The homepage transitions from `force-dynamic` to ISR with `revalidate = 86400`. The tax calculator page is the only page that remains dynamic (user input). This caching strategy must be established in Phase 2 when department pages are first created, not retrofitted in a later SEO phase.

### Critical Pitfalls

1. **Nivo drill-down has no built-in state management** — Build a `DrillState` machine (`path: string[]`, `currentData: TreemapNode`, zoom-in/zoom-out handlers) before touching any Nivo UI. Prototype all 4 hierarchy levels with real budget data in the first 2 days of Phase 1. If the interaction feels wrong at prototype stage, fall back to a simpler accordion pattern rather than forcing Nivo. Recovery cost if deferred: 2-3 day rewrite mid-phase.

2. **BigInt cents leak into Nivo chart data causing silent rendering failures** — Create `toChartValue(cents: bigint | string | null): number` utility that converts cents to dollars as `number` before any chart data preparation. Never pass Prisma results directly to Nivo data arrays. Warning signs: treemap renders as a single block, all segments appear equal size. Recovery cost: 2-4 hours, but finding the silent failure wastes more time than the fix.

3. **Treemap is unusable on mobile without an explicit alternative** — Design the mobile accordion/list fallback before building desktop chart UI. Use `useMediaQuery('(max-width: 767px)')` to swap between chart and list components (not CSS hiding). Ensure all tappable chart areas are 44x44px minimum (WCAG 2.5.5). Nivo has documented iOS touch event bugs (Issue #445). Recovery cost if retrofitted as afterthought: 3-5 days.

4. **Prisma drops tsvector columns during `migrate dev`** — Manage `search_vector` tsvector columns and GIN indexes entirely in raw SQL files outside Prisma's schema management. Never add tsvector to `schema.prisma`. Use Prisma `$queryRaw` with tagged template literals for all search queries (Prisma auto-parameterizes, preventing SQL injection). Add a `prisma migrate diff` check in CI to prevent accidental drops.

5. **Millage math floating-point errors destroy trust in the tax calculator** — Use `Prisma.Decimal` arithmetic or integer cents throughout all tax calculations. Never call `.toNumber()` on millage `Decimal` fields and multiply. Round to exactly 2 decimal places at display time only. Validate against Miami-Dade's official tax estimator for at least 3 sample property values before launch.

6. **Claude API called at runtime instead of from the pipeline** — `ANTHROPIC_API_KEY` must never appear in `budget-explorer-web/.env`. All descriptions are pre-generated via `pipeline/describe.py` and stored in `budget_descriptions` table before department pages go live. Runtime AI calls create $3-15/day costs, 2-5 second latency per page load, and inconsistent outputs between users.

7. **`force-dynamic` copied to every new page kills SEO and performance** — Use `generateStaticParams` for all department and area pages. Use `revalidate = 86400` for homepage (not `force-dynamic`). Only the tax calculator page should be dynamic (user input). Establish this pattern in Phase 2, not Phase 4. Google's crawler deprioritizes slow TTFB pages.

---

## Implications for Roadmap

Based on the combined research, the feature dependency graph drives a clear 4-phase structure. The critical path runs through shared infrastructure -> primary visualization -> differentiating features -> launch readiness. The tax calculator and revenue donut are independent of the visualization critical path and can be built in parallel with Phase 2 on a second track.

### Phase 1: Visualization Foundation

**Rationale:** The treemap drill-down is the product's core value and its highest-risk feature. It must come first because department detail pages are the drill-down destination and cannot be built without knowing the drill-down works. The DataTableToggle component and toChartValue() utility must exist before any chart is built — retrofitting accessibility and type safety across multiple chart components is significantly harder than establishing them upfront.

**Delivers:** Interactive explorer page (`/explorer`) with treemap drill-down (Total -> Strategic Areas -> Departments), breadcrumb navigation, desktop and mobile views (accordion fallback on <768px), DataTableToggle on all charts, ChartContainer wrapper, revenue donut chart.

**Addresses:** VIZ-01, VIZ-02, VIZ-03, VIZ-07, PAGE-02, PAGE-03, mobile fallbacks (WCAG AA)

**Avoids:** Nivo drill-down state trap (Pitfall 1), BigInt chart crash (Pitfall 2), mobile unusability (Pitfall 3)

**Research flag:** Prototype the drill-down state machine with real budget data before committing to 4-level hierarchy. Confirm `ComputedDatum.path` is available in Nivo 0.99.0 or use manual breadcrumb stack in React state (the architecture file shows this fallback pattern already).

### Phase 2: Department Detail Pages + AI Descriptions

**Rationale:** Department detail pages are the destination of every treemap drill-down and the primary surface for AI descriptions, YoY comparisons, and expenditure breakdowns. These features are tightly coupled with the page structure and must ship together. The Python AI description pipeline must run and pass human review before department pages go live — empty description columns produce hollow pages. The static generation pattern (`generateStaticParams` + ISR) must be established here, in Phase 2, not deferred to the SEO phase.

**Delivers:** 35 static department detail pages with AI descriptions, expenditure category bar chart, YoY sparklines, change annotations; 9 strategic area listing pages; homepage transitions from `force-dynamic` to ISR.

**Addresses:** PAGE-04, VIZ-05, VIZ-06, AI-01 through AI-04, PAGE-06, SEO foundation

**Avoids:** Runtime Claude API calls (Pitfall 6), force-dynamic on static pages (Pitfall 7)

**Research flag:** AI description prompt design needs validation against 3-5 sample departments before running the full 44-entity batch. Human review is mandatory before seeding — budget figures are politically sensitive for the commissioner's office. Test on one large department, one small department, and one with significant YoY budget change.

### Phase 3: Tax Calculator + Penny Visualization

**Rationale:** The tax calculator is independent of the visualization critical path. It uses the `millage_rates` table and `cents_per_dollar` from `strategic_area_budgets`, both already seeded. Building it after department pages ensures the full navigation structure exists so calculator results can link to department pages. The penny visualization is a dependency of the calculator (displayed in calculator output) and trivially cheap to build alongside it. The penny viz also belongs on the homepage as a shareable graphic.

**Delivers:** Tax calculator page at `/calculator` (property value input, homestead exemption checkbox, personalized county/authority tax breakdown, strategic area allocation breakdown, drill-down links to department pages), penny visualization embedded in calculator and homepage, URL state persistence (`?value=350000&homestead=true`).

**Addresses:** CALC-01 through CALC-05, VIZ-04, PAGE-05

**Avoids:** Millage floating-point precision errors (Pitfall 5)

**Research flag:** No additional research needed. Pattern is well-documented. Required validation: test calculator output against Miami-Dade's official tax estimator at `apps.miamidadepa.gov` for 3 sample property values before launch.

### Phase 4: Search, SEO, and Launch Readiness

**Rationale:** Full-text search requires department pages to exist (search results link to them). SEO metadata is partially established during Phase 2 (generateStaticParams handles static generation), but the complete sitemap, robots.txt, per-page OG images, and JSON-LD structured data are launch-readiness concerns that make sense to complete together. This phase also audits and eliminates any remaining force-dynamic instances and validates Core Web Vitals.

**Delivers:** Full-text search (`/search` page + `/api/search` Route Handler, PostgreSQL tsvector + GIN index via raw SQL migration, ranked results), `app/sitemap.ts` covering all 35 department + 9 area + core pages, `app/robots.ts`, per-page `opengraph-image.tsx` dynamic OG images, JSON-LD structured data for department pages, Core Web Vitals audit.

**Addresses:** SRCH-01 through SRCH-03, SEO-01, SEO-02

**Avoids:** Prisma dropping tsvector columns (Pitfall 4), force-dynamic remaining on static pages (Pitfall 7), generic or missing OG images

**Research flag:** tsvector column management outside Prisma is non-standard. Establish the raw SQL migration file and add a CI check (`prisma migrate diff` guard) before this phase closes to prevent future Prisma migrations from silently dropping the search index.

### Phase Ordering Rationale

- Phase 1 before Phase 2: The treemap must work before department pages exist as drill-down targets. Shared infrastructure (toChartValue, DataTableToggle, ChartContainer, chart query layer) serves all subsequent phases. Building these once and reusing them saves more time than the upfront investment costs.
- Phase 2 before Phase 3: Department pages must exist before the calculator can link into them. AI descriptions must be seeded before department pages go live or they launch with empty content holes.
- Phase 3 after Phase 2 (not parallel): Building these together risks scope creep, but Phase 3 could begin as soon as the `/explorer` page and one sample department page are solid from Phase 2. The tax calculator itself is independent.
- Phase 4 last: Search requires department pages (to link results). The complete sitemap cannot be generated until all routes are created. SEO audit is meaningless before all pages exist.

### Research Flags

Phases needing validation during execution:

- **Phase 1:** Nivo drill-down state machine — prototype with real budget data before committing to UI polish. If 4-level drill-down is flaky, simplify to 2-level (Strategic Area -> Department) and show expenditure categories as a simple bar chart on the department detail page rather than a 4th treemap level.
- **Phase 2:** AI description prompt design — validate output on 3-5 sample departments and get commissioner's office sign-off before running the full 44-entity batch and seeding to production.

Phases with standard, well-documented patterns (no additional research needed):

- **Phase 3:** Tax calculator — pure TypeScript arithmetic with Decimal library, millage rate math is well-documented, data is already seeded.
- **Phase 4:** SEO — Next.js built-in Metadata API is fully documented. PostgreSQL tsvector GIN index pattern is stable. Both use verified approaches from research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All three Nivo packages verified via `npm view` for React 19 peer dependency compatibility. Rejection of alternatives (Recharts, Victory, D3, Algolia, next-seo) documented with specific GitHub issues and official docs. Zero new packages added for SEO, search, tax calculator, or AI pipeline. |
| Features | HIGH | Competitor analysis covers USASpending, Open Budget Oakland, USAFacts, VisGov. Feature set verified against existing data model — every P1 feature has seeded data in PostgreSQL. Anti-features documented with specific reasons, not vague concerns. |
| Architecture | HIGH | Extends proven v1.0 patterns (Server/Client boundary, BigInt serialization, Prisma singleton). New query file structure is concrete with code examples. Static generation and ISR patterns verified against Next.js 16 official docs updated 2026-02-27. |
| Pitfalls | HIGH | All 7 critical pitfalls have GitHub issue citations or official documentation. Recovery strategies include time estimates and recovery steps. Phase-to-pitfall mapping is explicit. |

**Overall confidence: HIGH**

### Gaps to Address

- **Nivo `ComputedDatum.path` availability in 0.99.0:** PITFALLS.md warns the `parent` property was missing in older versions (Issue #1936). The ARCHITECTURE.md drill-down implementation uses `node.data` for the click handler, which avoids this dependency. Verify during Phase 1 prototype whether `path` is available in the installed 0.99.0 version before building breadcrumb logic that might depend on it. The manual breadcrumb stack approach in the architecture file is the safe fallback.

- **Homestead exemption amount as configuration:** FEATURES.md cites $50,722 (Amendment 5, 2024). This amount changes annually. The exemption value should be stored as a database constant or application config, not hardcoded in the calculator component, so it can be updated when the exemption amount changes each tax year without a code deployment.

- **AI description prompt quality before batch run:** The prompt design is described (structured JSON output, three fields: summary, detailed_description, key_changes) but the actual prompt text needs validation against 3-5 representative departments before the full 44-entity batch. Test on a large department (MDPD ~$1B), a small department (<$10M), and one with significant YoY change to verify output quality across department profiles.

- **Prisma connection pool under concurrent static generation:** ARCHITECTURE.md flags that `generateStaticParams` generating 35+ pages concurrently can exhaust the Prisma connection pool. Add `connection_limit=5` to `DATABASE_URL` during CI builds, or verify the existing Prisma singleton pattern handles concurrent connections appropriately. Test with `next build` in staging before deploying to production.

---

## Sources

### Primary (HIGH confidence)
- [@nivo/treemap npm](https://www.npmjs.com/package/@nivo/treemap) — v0.99.0 peer dependencies (React ^19.0 confirmed via `npm view`)
- [@nivo/sunburst npm](https://www.npmjs.com/package/@nivo/sunburst) — v0.99.0 peer dependencies confirmed
- [@nivo/pie npm](https://www.npmjs.com/package/@nivo/pie) — v0.99.0 peer dependencies confirmed
- [Nivo GitHub Issue #2618](https://github.com/plouc/nivo/issues/2618) — React 19 support confirmed resolved
- [Nivo GitHub Issue #2626](https://github.com/plouc/nivo/issues/2626) — `use client` required for all Nivo components (createContext error)
- [Nivo GitHub Issue #1936](https://github.com/plouc/nivo/issues/1936) — ComputedDatum missing parent property (drill-down pitfall)
- [Nivo GitHub Issue #445](https://github.com/plouc/nivo/issues/445) — mobile touch event bugs on iOS
- [Recharts GitHub Issue #576](https://github.com/recharts/recharts/issues/576) — no sunburst/treemap; open since 2017
- [Next.js generateMetadata docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — updated 2026-02-27
- [Next.js OG images docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) — opengraph-image.tsx convention
- [Next.js ISR Guide](https://nextjs.org/docs/app/guides/incremental-static-regeneration) — revalidate patterns
- [Next.js Sitemap docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) — sitemap.ts convention
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld) — structured data pattern
- [Prisma Full-Text Search docs](https://www.prisma.io/docs/orm/prisma-client/queries/full-text-search) — PostgreSQL FTS confirmed as Preview (not GA)
- [Prisma Issue #12343](https://github.com/prisma/prisma/issues/12343) — tsvector columns not supported in Prisma schema
- [Prisma Issue #8950](https://github.com/prisma/prisma/issues/8950) — full-text search index not used by Prisma
- [Prisma TypedSQL docs](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql) — type-safe raw query alternative
- [PostgreSQL FTS documentation](https://www.postgresql.org/docs/current/textsearch-intro.html) — tsvector/GIN index official reference
- [Miami-Dade Property Appraiser Tax Estimator](https://apps.miamidadepa.gov/PAOnlineTools/Taxes/TaxEstimator.aspx) — official validation target for calculator accuracy
- [TPGi: Making Data Visualizations Accessible](https://www.tpgi.com/making-data-visualizations-accessible/) — WCAG AA chart requirements, data table fallback

### Secondary (MEDIUM confidence)
- [Open Budget Oakland](https://openbudgetoakland.org/) — competitor feature analysis (direct review)
- [USAFacts Government Spending](https://usafacts.org/articles/this-chart-tells-you-everything-you-want-to-know-about-government-spending/) — competitor feature analysis
- [VisGov Visual Budget](https://visgov.com/visual-budget/) — competitor feature analysis; basic tax calculator reference
- [Bulletproof FTS in Prisma with PostgreSQL tsvector](https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3) — tsvector outside Prisma schema migration pattern
- [Pedro Alonso: PostgreSQL FTS with Prisma raw SQL](https://www.pedroalonso.net/blog/postgres-full-text-search/) — $queryRaw search query pattern
- [Deque: How to Make Interactive Charts Accessible](https://www.deque.com/blog/how-to-make-interactive-charts-accessible/) — data table fallback WCAG requirement
- [Miami-Dade Property Tax Guide](https://www.propertyexemption.com/property-tax/miami-property-tax/) — homestead exemption amounts and Amendment 5 details
- [Political Math 10,000 Pennies](https://dataphys.org/list/federal-budget-explained-with-10000-pennies/) — penny visualization concept validation (1.7M views)

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
