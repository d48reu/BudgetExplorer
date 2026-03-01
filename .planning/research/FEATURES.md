# Feature Research: v1.1 Full Feature Set

**Domain:** Interactive budget visualizations, tax calculator, AI descriptions, search, and SEO for Miami-Dade Budget Explorer
**Researched:** 2026-02-28
**Confidence:** HIGH (verified against existing data model, competitor analysis, and library documentation)
**Scope:** NEW features only. v1.0 shipped homepage, navigation, glossary, data pipeline, and design system.

## What Already Exists (v1.0 Foundation)

Before defining new features, here is what the codebase already provides:

| Asset | What It Provides for v1.1 |
|-------|---------------------------|
| `strategic_areas` table (9 rows) with `color`, `slug`, `display_order` | Treemap segments, penny visualization colors, URL routes |
| `departments` table (35 rows) with `slug`, `strategic_area_id` | Drill-down targets, detail page routes |
| `department_budgets` table (5 fiscal years) with `operating_budget`, `capital_budget`, `employee_count` | YoY comparison data, treemap sizing |
| `department_expenditures` table with `expenditure_category_id` | Department detail breakdown bars |
| `expenditure_categories` table with `display_order` | Category labels for expenditure charts |
| `revenue_by_source` table with `amount`, `percentage` | Revenue donut chart data |
| `revenue_sources` table with `name`, `slug` | Revenue category labels |
| `millage_rates` table with `authority`, `millage_rate`, `is_county` | Tax calculator calculations |
| `strategic_area_budgets` with `cents_per_dollar` | Penny visualization segments |
| `budget_descriptions` table with `summary`, `detailed_description`, `key_changes` | AI description storage (table exists, rows need generating) |
| `formatDollarsAbbreviated()`, `formatDollarsFull()`, `formatYoYChange()` | Dollar formatting utilities |
| `getStrategicAreas()` query (unused) | Returns strategic areas with budgets |
| `getCurrentFiscalYear()` query | Returns FY 2025-26 totals |
| Homepage placeholders for treemap, penny viz, revenue donut | Integration points in `page.tsx` |
| BudgetTerm tooltip system | Jargon explanation for any new page |
| Miami-Dade design tokens (blue, orange, green, red) | Consistent color palette for charts |

**Key implication:** The data model is complete. Every v1.1 feature has its data already seeded in PostgreSQL. No new tables are needed except possibly a `search_index` tsvector column. The work is 90% frontend, 10% query/API, and one Python pipeline run for AI descriptions.

---

## Table Stakes

Features users of civic budget tools expect. Missing any of these makes the product feel incomplete.

### VIZ: Interactive Treemap Drill-Down

| Attribute | Detail |
|-----------|--------|
| **Why expected** | Every major civic budget tool (USASpending, OpenGov, Open Budget Oakland) provides hierarchical drill-down. This IS the product -- the primary way users explore where $13.2B goes. |
| **Complexity** | HIGH |
| **Requirements** | VIZ-01, VIZ-02, VIZ-07, PAGE-02, PAGE-03 |
| **Data dependency** | `strategic_areas` + `strategic_area_budgets` + `departments` + `department_budgets` (all seeded) |
| **Implementation** | Use `@nivo/treemap` (ResponsiveTreeMap) with nested data structure: root -> 9 strategic areas -> 35 departments. Nivo treemap accepts `{ id, value, children }` hierarchy. Implement drill-down via React state: clicking a strategic area node filters data to show only its departments. Use `onClick` handler to update state, not Nivo's built-in drill-down (which is limited). Canvas renderer for 35+ nodes. |
| **Mobile strategy** | Treemaps are unusable below ~500px width. Provide a sorted list/accordion fallback for mobile (`md:` breakpoint switch). Each accordion item shows department name, budget amount, and percentage bar. This is not optional -- it is an accessibility and usability requirement. |
| **Data table fallback** | Every treemap view must have a "View as table" toggle showing a sortable HTML table with columns: Name, Operating Budget, Capital Budget, Total, % of Parent. Required for screen readers (WCAG AA). Use `<table>` with `<th>` headers, not a CSS grid pretending to be a table. |
| **Notes** | The existing `getStrategicAreas()` query already returns the right data shape. Add a `getDepartmentsByStrategicArea(areaId)` query. Consider also offering sunburst as a toggle view (`@nivo/sunburst` uses same data shape) since some users prefer radial hierarchy. |

### VIZ: Revenue Source Donut Chart

| Attribute | Detail |
|-----------|--------|
| **Why expected** | Open Budget Oakland, USAFacts, and VisGov all show "where money comes from" alongside "where money goes." Without revenue context, expenditure data tells half the story. |
| **Complexity** | LOW |
| **Requirements** | VIZ-03, VIZ-07 |
| **Data dependency** | `revenue_by_source` + `revenue_sources` (seeded, includes amount and percentage) |
| **Implementation** | Use Recharts `<PieChart>` with `<Pie innerRadius={60} outerRadius={80}>` for donut effect. 7 revenue categories max, so colors are easy to distinguish. Use Miami-Dade palette + extended neutral tones. Show labels with percentage + dollar amount. |
| **Mobile strategy** | Donut charts work fine on mobile. Reduce label font size, use a legend below rather than inline labels below 640px. |
| **Data table fallback** | Toggle to a two-column table: Source Name, Amount ($), Percentage. Sort by amount descending. |
| **Notes** | `revenue_by_source` already has a `percentage` column, so no calculation needed. Place on homepage (placeholder exists) and on a dedicated revenue page. |

### PAGE: Department Detail Pages

| Attribute | Detail |
|-----------|--------|
| **Why expected** | The natural endpoint of drill-down. Every budget tool lets you click into a department and see its full breakdown. Without detail pages, drill-down is a dead end. |
| **Complexity** | MEDIUM |
| **Requirements** | PAGE-04, VIZ-06, VIZ-07 |
| **Data dependency** | `departments` (slug for URL), `department_budgets` (5 FYs), `department_expenditures` + `expenditure_categories` (breakdown), `budget_descriptions` (AI text) |
| **Implementation** | Next.js dynamic route: `app/departments/[slug]/page.tsx` (Server Component). Fetch department + budgets + expenditures + descriptions in one Prisma query with `include`. Render: (1) header with department name and strategic area breadcrumb, (2) budget overview card with current FY totals, (3) expenditure breakdown horizontal bar chart (Recharts `<BarChart layout="vertical">`), (4) AI description section, (5) YoY comparison sparklines. |
| **URL structure** | `/departments/miami-dade-police` -- department slugs already exist in the database. |
| **SEO** | Each of 35 department pages is statically generatable with `generateStaticParams()`. Unique title: "Miami-Dade Police Department Budget | Budget Explorer". Unique OG description from AI summary. |
| **Data table fallback** | Expenditure breakdown shown as both bar chart AND table (not toggle -- show both, chart first). |
| **Notes** | Also need strategic area detail pages (`app/areas/[slug]/page.tsx`) listing all departments in that area with their budgets. These are simpler -- just a filtered department list with budget summaries. |

### VIZ: Year-over-Year Comparison

| Attribute | Detail |
|-----------|--------|
| **Why expected** | Open Budget Oakland, USAFacts, and LA Controller all show multi-year trends. Static budget snapshots mislead -- a $500M police budget means different things if it grew 20% vs stayed flat. |
| **Complexity** | MEDIUM |
| **Requirements** | VIZ-05, VIZ-07, PAGE-06 |
| **Data dependency** | `department_budgets` has 5 fiscal years per department. `fiscal_years` table has labels (FY 2021-22 through FY 2025-26). |
| **Implementation** | Two views: (1) Sparklines on department detail pages (Recharts `<LineChart>` in compact mode, 5 data points per department). (2) Dedicated comparison page (`app/compare/page.tsx`) with Recharts `<BarChart>` showing grouped bars for selected departments across fiscal years. Use `formatYoYChange()` utility (already built) for delta labels. |
| **Mobile strategy** | Sparklines work at any width. Comparison page: stack bars vertically on mobile rather than grouping horizontally. |
| **Data table fallback** | Table with columns: Fiscal Year, Operating, Capital, Total, Change %. Color-code change column (blue for increase, orange for decrease -- per existing convention in `format.ts`). |
| **Notes** | The `formatYoYChange()` function already handles percentage calculation and direction. Use blue/orange color convention (neutral, not good/bad) established in v1.0. |

### SRCH: Full-Text Search

| Attribute | Detail |
|-----------|--------|
| **Why expected** | USAFacts, USASpending, OpenGov, and Questica all offer search. Users expect to type "fire" and find Fire Rescue department. Without search, users must navigate the hierarchy to find anything specific. |
| **Complexity** | LOW |
| **Requirements** | SRCH-01, SRCH-02, SRCH-03 |
| **Data dependency** | `departments.name`, `departments.description`, `budget_descriptions.summary`, `expenditure_categories.name` |
| **Implementation** | Use PostgreSQL built-in full-text search. No Elasticsearch, no Algolia, no external service. The dataset is tiny (35 departments, ~100 expenditure categories, ~35 AI descriptions). Two approaches, recommend Option A: |
| | **Option A (Recommended): Raw SQL via Prisma `$queryRaw`**. Create a `search_vector` tsvector column on `departments` with a GIN index. Populate via SQL trigger on insert/update. Query with `plainto_tsquery()` and `ts_rank()`. Prisma's native fullTextSearch preview feature does NOT support tsvector -- use `$queryRaw` instead. |
| | **Option B: Simple ILIKE.** For 35 departments, `WHERE name ILIKE '%fire%' OR description ILIKE '%fire%'` is fast enough. Less sophisticated but simpler. No index needed at this scale. |
| **UI** | Search bar in top navigation or as a dedicated `/search` page. Results show: department name, strategic area, budget amount, and a snippet of the matching description. Link each result to its department detail page. |
| **Empty state** | "No results for [query]. Try searching for a department name like 'Police' or a service like 'parks.'" Include links to browse by strategic area as fallback navigation. |
| **Notes** | At 35 departments, even the simplest approach works. Use Option A (tsvector) only if you plan to add line-item search later. For MVP, Option B (ILIKE) ships faster with zero schema changes. |

### SEO: Open Graph Metadata and Static Generation

| Attribute | Detail |
|-----------|--------|
| **Why expected** | Journalists and activists share budget links on social media. Without OG tags, shared links show generic titles and no preview image. This kills shareability, which is the primary distribution channel for a civic tool. |
| **Complexity** | LOW |
| **Requirements** | SEO-01, SEO-02 |
| **Data dependency** | Department names, strategic area names, budget totals (all in DB) |
| **Implementation** | Use Next.js `generateMetadata()` in each page's Server Component. For department pages: `export async function generateMetadata({ params })` returns unique title, description, and OG image. Use `opengraph-image.tsx` file convention with `ImageResponse` from `next/og` to generate dynamic OG images showing department name + budget amount on a Miami-Dade branded background. |
| **Static generation** | Use `generateStaticParams()` on department and strategic area pages. Pre-render all 35 department pages + 9 area pages at build time. This gives instant load times and makes pages crawlable by search engines. |
| **Notes** | Next.js 16 `generateMetadata` docs were updated 2026-02-27. The ImageResponse API generates SVG-to-PNG at build time. Keep OG images simple: department name, budget amount, Miami-Dade blue background, Budget Explorer logo. |

### UX: Responsive Mobile Design for Visualizations

| Attribute | Detail |
|-----------|--------|
| **Why expected** | WCAG and civic design best practices mandate mobile-first. Most Miami-Dade residents will access on phones. The homepage and navigation are already responsive (v1.0), but the new visualization pages need responsive treatment from day one. |
| **Complexity** | MEDIUM (integrated into each feature, not standalone) |
| **Requirements** | Cross-cutting for all VIZ features |
| **Implementation** | Design mobile-first, not mobile-after. Each visualization component must define its mobile fallback: treemap -> sorted list/accordion, sunburst -> sorted list, donut -> donut (works fine), bar charts -> stack vertically, sparklines -> sparklines (work fine). Use Tailwind v4 responsive breakpoints (`sm:`, `md:`, `lg:`). Use `useMediaQuery` hook or CSS-only approaches to switch between chart and list views. |
| **Notes** | The treemap mobile fallback is the hardest part. Every other chart type scales down naturally. Budget the treemap mobile fallback as its own sub-task. |

### UX: Data Table Fallbacks for All Charts

| Attribute | Detail |
|-----------|--------|
| **Why expected** | WCAG AA requires that all information conveyed visually in charts is also available programmatically. Screen readers cannot interpret SVG treemaps. Journalists want raw numbers. Power users prefer tables. |
| **Complexity** | LOW (per chart, but multiplied across all charts) |
| **Requirements** | VIZ-07 |
| **Implementation** | Build a reusable `<DataTableToggle>` component that wraps any chart. It shows a "View as table" button that renders a `<table>` with the same data. Use semantic HTML: `<table>`, `<thead>`, `<th scope="col">`, `<tbody>`, `<td>`. Add `aria-label` to the toggle button. Make tables sortable by clicking column headers (simple state toggle, no library needed). |
| **Notes** | Build this component ONCE, early, and use it for every chart. Do not retrofit it later. The component takes `columns` and `data` props and renders a styled, sortable table that matches the design system. |

---

## Differentiators

Features that set Miami-Dade Budget Explorer apart from every existing civic budget tool.

### CALC: "What Does My Tax Dollar Buy?" Calculator

| Attribute | Detail |
|-----------|--------|
| **Value proposition** | No civic budget tool combines property-value input with a visual breakdown showing "your $3,200 in taxes buys $X of police, $Y of parks." VisGov has a basic "My Tax Bill" shortcode, but it does not break down by strategic area or department. This is the viral hook -- shareable, personal, novel. |
| **Complexity** | MEDIUM |
| **Requirements** | CALC-01 through CALC-05, PAGE-05 |
| **Data dependency** | `millage_rates` table (seeded with authority, millage_rate, is_county). `strategic_area_budgets` with `cents_per_dollar` for proportional allocation. |
| **Implementation** | |
| | **Input:** Single number field for property assessed value. Homestead exemption checkbox (subtracts $50,722 from assessed value per Amendment 5, 2024). Optional: dropdown for municipality (affects non-county millage). |
| | **Calculation:** `taxable_value = assessed_value - exemption`. `tax_bill = taxable_value * total_millage / 1000`. County portion = `taxable_value * county_millage / 1000`. Then allocate county portion across strategic areas using `cents_per_dollar` ratios. |
| | **Output:** (1) Total estimated tax bill with authority breakdown (County, School Board, other). (2) County portion broken into strategic areas with dollar amounts. (3) "Penny visualization" showing the dollar coin divided by strategic area. (4) Drill-down: click a strategic area to see department-level allocation. |
| | **All client-side.** No API calls. Millage rates and `cents_per_dollar` are fetched once via Server Component and passed as props. Calculation runs in the browser on input change. Use `@number-flow/react` for animated transitions when values update. |
| **URL state** | Store property value in URL search params (`/calculator?value=350000&homestead=true`) so users can share their personal result. This replaces the need for user accounts. |
| **Mobile strategy** | Stack input above results. Penny visualization works at any width. Authority breakdown as vertical list, not horizontal table. |
| **Notes** | The Miami-Dade Property Appraiser has a tax estimator at `miamidade.gov/paportal/taxes/taxestimator.aspx`. Link to it for users who want official estimates. The Budget Explorer calculator is for understanding budget allocation, not for precise tax bill estimation. Make this distinction clear in the UI. |

### AI: AI-Generated Plain-English Descriptions

| Attribute | Detail |
|-----------|--------|
| **Value proposition** | No existing civic budget tool uses AI to explain what departments do in plain language. Budget data without context is just numbers. A resident seeing "$1.2B - WASD" has no idea what WASD does. A two-sentence description transforms opaque acronyms into understanding. This is a genuine innovation. |
| **Complexity** | MEDIUM (pipeline work, not frontend complexity) |
| **Requirements** | AI-01 through AI-04 |
| **Data dependency** | `budget_descriptions` table exists in schema with `summary`, `detailed_description`, `key_changes`, `generated_at`, `model_version` columns. Rows need to be generated and seeded. |
| **Implementation** | |
| | **Pipeline (Python):** New script in the data pipeline. For each of 35 departments + 9 strategic areas: (1) Gather department name, current FY budget, prior FY budget, expenditure categories, strategic area. (2) Call Claude API (`claude-sonnet-4-5-20250929` per PROJECT.md) with structured prompt. (3) Store response in `budget_descriptions` table with `entity_type='department'` or `entity_type='strategic_area'`, `entity_id`, `fiscal_year_id`. |
| | **Prompt design:** Request three outputs per entity: `summary` (2-3 sentences, what it does and how much it costs), `detailed_description` (1 paragraph, deeper context), `key_changes` (what changed vs prior year, why it matters). Use structured output (JSON mode) for consistent parsing. |
| | **Frontend:** Display on department detail pages. `summary` appears as the lead paragraph. `key_changes` appears as a callout card if the budget changed >5% YoY. Show `generated_at` and `model_version` as small footer text for transparency. |
| | **Human review:** AI descriptions MUST be reviewed before publishing. Budget figures are politically sensitive. A hallucinated number could embarrass the commissioner's office. Build a review step into the pipeline: generate -> human reviews CSV/JSON -> approve -> seed to DB. |
| **Cost estimate** | 44 entities x ~500 input tokens + ~300 output tokens = ~35K tokens total. At Claude Sonnet pricing, this costs less than $0.50 per generation run. Negligible. |
| **Notes** | Do NOT use a chatbot or runtime AI. Pre-generate everything during the data pipeline and serve from the database. This eliminates latency, cost-per-request, and hallucination risk at runtime. |

### VIZ: Penny Visualization

| Attribute | Detail |
|-----------|--------|
| **Value proposition** | "Where does your dollar go?" is a common civic framing, but rendering it as a visual coin or dollar bar divided into colored proportional segments by strategic area is a memorable, shareable graphic. The `strategic_area_budgets.cents_per_dollar` column was designed specifically for this. |
| **Complexity** | LOW |
| **Requirements** | VIZ-04 |
| **Data dependency** | `strategic_area_budgets.cents_per_dollar` + `strategic_areas.color` (both seeded) |
| **Implementation** | A horizontal stacked bar (or circular coin graphic) where each segment is a strategic area. Width/arc proportional to `cents_per_dollar`. Labeled with area name + cents value (e.g., "Public Safety: 28 cents"). Use the strategic area colors from the database. Pure CSS/SVG -- no charting library needed. |
| **Shareability** | Generate this as a static OG image for the homepage and calculator page. When someone shares the URL, the preview shows the penny visualization. This is the primary social media hook alongside the tax calculator. |
| **Mobile strategy** | The horizontal bar works at any width. Labels may need to wrap or be replaced with a legend below on narrow screens. |
| **Notes** | Political Math's "10,000 Pennies" videos went viral (1.7M views) with physical coin visualizations. The concept resonates. Keep it simple -- a clean, color-coded bar is more shareable than a complex interactive widget. |

### VIZ: Contextual Change Annotations

| Attribute | Detail |
|-----------|--------|
| **Value proposition** | Most budget tools show numbers without context. Annotating notable changes ("Fire Department budget increased 12% due to new station construction") transforms data into a story. This is part of the AI description pipeline. |
| **Complexity** | LOW (if AI descriptions are already built) |
| **Requirements** | Enhances AI-02, displayed on PAGE-04 |
| **Data dependency** | `budget_descriptions.key_changes` (generated during AI pipeline) |
| **Implementation** | On department detail pages, if `key_changes` is non-null AND the YoY change exceeds 5%, show a callout card with an icon and the AI-generated explanation. Style as a bordered card with the directional color (blue for increase, orange for decrease). |
| **Notes** | This is essentially "display the `key_changes` field from the AI pipeline." The complexity is in generating good change descriptions, not in displaying them. Bundle this with the AI description work, not as a separate feature. |

---

## Anti-Features

Features to explicitly NOT build for v1.1.

| Anti-Feature | Why Requested | Why Avoid | What to Do Instead |
|--------------|---------------|-----------|-------------------|
| **Participatory budgeting / "Build Your Own Budget"** | LA Controller has it. Seems engaging and democratic. | Fundamentally different product (engagement vs. transparency). Requires user accounts, session management, data submission, moderation. Creates expectations the county cannot meet -- Miami-Dade's budget is adopted by commission, not popular vote. Triples scope. | Link to the county's actual public comment process. Focus on showing what WAS adopted, clearly. |
| **Runtime chatbot / conversational Q&A** | OECD highlights AI chatbots for civic engagement. Feels modern. | Runtime AI adds latency ($0.01-0.05/query), unpredictable cost scaling, and hallucination risk. A chatbot could state incorrect budget figures. Maintaining accuracy requires ongoing fine-tuning. | Pre-generated AI descriptions answer "what does this mean?" without runtime risk. Store in DB, serve as static text. |
| **Real-time spending / checkbook data** | Users want to know if money was actually spent, not just budgeted. | Requires integration with county financial systems (disbursement feeds), ongoing reconciliation, and potential privacy concerns with vendor payments. Entirely different data source from the adopted budget. | Show adopted budget amounts clearly and label them as "adopted." Defer checkbook to v2 per PROJECT.md. The `disbursements` table exists in the schema for future use. |
| **User accounts and saved views** | Enterprise tools (OpenGov, Questica) have them. Seems useful for repeat visitors. | Authentication adds complexity, privacy obligations (GDPR/CCPA), data storage costs, and maintenance burden. The target audience (residents, journalists) visits occasionally, not daily. Zero-friction access matters more than personalization. | Use URL parameters for calculator state (`?value=350000`). Use browser localStorage for "last viewed department" if needed. No accounts. |
| **Multi-language support (v1.1)** | Miami-Dade is majority Spanish-speaking. Accessibility advocates will request it. | Requires translating all AI descriptions, UI copy, budget terms, and tooltips. Doubles content maintenance. Descriptions get stale if not re-translated when updated. | Build with i18n-ready architecture (externalized strings via `next-intl` or simple JSON) so Spanish can be added in v1.2. Ship English-only for v1.1. |
| **Capital project map visualization** | Questica OpenBook and Boston.gov have GIS-mapped capital projects. Seems natural for a county tool built by someone who uses Leaflet. | Requires geocoding all capital projects, maintaining GIS data, and building a map interface. Capital programs are out of scope per PROJECT.md. The `capital_programs` table exists but has no geographic coordinates. | Defer to v2. Strategic area and department views cover the "where does money go?" question without geographic complexity. |
| **CSV/PDF export** | Power users (journalists, analysts) want downloadable data. | Adds file generation logic, download handlers, and PDF rendering (heavy library like `@react-pdf/renderer`). Low-priority for launch -- most users want to browse, not download. | Defer to v1.2. Link to the source PDF in the footer (already done). If demand emerges from journalists, add CSV export first (simpler than PDF). |
| **Comparison mode (side-by-side departments)** | Open Budget Oakland has it. Policy analysts want to compare Fire vs Police budgets. | Requires a two-panel UI with synchronized axes, department selection dropdowns, and careful responsive design. Nice-to-have but not essential for the "understand your budget" core value. | Defer to v1.2. YoY comparison within a single department covers the most common comparison need. |
| **Animated chart transitions between pages** | Motion/Framer Motion can animate between views. Feels polished. | View Transitions are still experimental in React 19.2 and have browser compatibility issues. Custom route transitions with Motion require wrapping every page in AnimatePresence, adding complexity. Budget data does not need cinematic transitions. | Use subtle CSS transitions (Tailwind `transition-all`) for hover/focus states. Use `@number-flow/react` for budget amount animations. Skip page-level transitions. |
| **Sunburst as primary visualization** | Sunburst looks impressive and shows hierarchy in a compact radial form. | Sunburst charts are harder to read than treemaps for users unfamiliar with radial layouts. Label placement is challenging in inner rings. Mobile experience is worse than treemap. | Use treemap as primary, offer sunburst as a toggle option for users who prefer it. Both use the same Nivo data format, so the toggle is cheap to build. |

---

## Feature Dependencies

```
[Already Complete: Data pipeline, DB seeding, homepage, nav, design system]
    |
    +--enables--> [Treemap Drill-Down]         (VIZ-01, VIZ-02, PAGE-02, PAGE-03)
    |                 |
    |                 +--requires--> [Data Table Fallback Component]  (VIZ-07)
    |                 |                  (build this FIRST, reuse everywhere)
    |                 |
    |                 +--links-to--> [Department Detail Pages]  (PAGE-04)
    |                 |                  |
    |                 |                  +--displays--> [AI Descriptions]  (AI-01..04)
    |                 |                  |                  |
    |                 |                  |                  +--enhances--> [Change Annotations]
    |                 |                  |
    |                 |                  +--displays--> [Expenditure Breakdown]  (VIZ-06)
    |                 |                  |
    |                 |                  +--displays--> [YoY Sparklines]  (VIZ-05)
    |                 |
    |                 +--mobile-requires--> [Mobile List/Accordion Fallback]
    |
    +--enables--> [Revenue Donut Chart]        (VIZ-03)
    |                 (independent, can build in parallel)
    |
    +--enables--> [Tax Calculator]             (CALC-01..05, PAGE-05)
    |                 |
    |                 +--displays--> [Penny Visualization]  (VIZ-04)
    |                 |
    |                 +--uses--> [Millage rate data]  (already seeded)
    |                 |
    |                 +--uses--> [cents_per_dollar]   (already seeded)
    |
    +--enables--> [Full-Text Search]           (SRCH-01..03)
    |                 (independent, can build anytime after dept pages exist)
    |
    +--enables--> [SEO / Open Graph]           (SEO-01, SEO-02)
                      (should be built WITH each page, not as a separate phase)

[AI Description Pipeline] -- independent Python work, can run in parallel with frontend
    |
    +--generates--> [budget_descriptions rows]
    +--consumed-by--> [Department Detail Pages]
    +--consumed-by--> [Change Annotations]
```

### Critical Path

The longest dependency chain is:
1. Data Table Fallback Component (build first, reuse everywhere)
2. Treemap Drill-Down + Explorer Page (the core product)
3. Department Detail Pages (drill-down destination)
4. AI Descriptions displayed on detail pages
5. SEO metadata for all pages

The Tax Calculator and Revenue Donut are independent of this chain and can be built in parallel.

### Parallelization Opportunities

| Track A (Frontend - Visualizations) | Track B (Frontend - Calculator) | Track C (Pipeline - AI) |
|------|------|------|
| Data table fallback component | Tax calculator page | AI description generation script |
| Treemap + explorer page | Penny visualization | Human review of descriptions |
| Department detail pages | Calculator URL state | Seed to database |
| YoY comparison | | |
| Revenue donut | | |
| Search | | |
| SEO metadata | | |

---

## MVP Recommendation for v1.1

### Must Ship (P1)

These features must all ship together. Shipping the treemap without department pages creates dead-end drill-downs. Shipping department pages without AI descriptions creates empty content holes.

1. **Data Table Fallback Component** -- Build first. Every chart needs it. Reuse reduces total work.
2. **Interactive Treemap Drill-Down** (VIZ-01, VIZ-02, PAGE-02, PAGE-03) -- The core product. Two views: (a) full-screen explorer page, (b) compact treemap on homepage.
3. **Department Detail Pages** (PAGE-04) -- Drill-down destination. 35 pages generated from database.
4. **AI-Generated Descriptions** (AI-01..04) -- Populate the detail pages with plain-English content. Run pipeline, review, seed.
5. **Expenditure Category Breakdown** (VIZ-06) -- Horizontal bar chart on department detail pages showing salary, fringes, etc.
6. **Year-over-Year Comparison** (VIZ-05, PAGE-06) -- Sparklines on detail pages. Dedicated comparison page.
7. **Revenue Donut Chart** (VIZ-03) -- Completes the "full picture" on the homepage.
8. **Tax Calculator** (CALC-01..05, PAGE-05) -- The viral differentiator. Enter property value, get personal breakdown.
9. **Penny Visualization** (VIZ-04) -- Embedded in calculator output and homepage. Simple to build, high shareability.
10. **Full-Text Search** (SRCH-01..03) -- Basic search across departments and descriptions.
11. **SEO + Open Graph** (SEO-01, SEO-02) -- Build with each page, not as a separate phase.
12. **Mobile Fallbacks** -- Treemap accordion, responsive charts. Build with each component.

### Defer to v1.2 (P2)

| Feature | Trigger to Build |
|---------|-----------------|
| Sunburst toggle view | If user analytics show demand for alternative hierarchy views |
| Embeddable widgets | If journalists/commissioners request embedding on their sites |
| CSV data export | If journalists request downloadable data |
| Side-by-side comparison mode | If users try to compare departments and bounce |
| Spanish language support | After i18n architecture is validated |

### Defer to v2+ (P3)

| Feature | Reason |
|---------|--------|
| Online Checkbook / disbursements | Different data source, county integration required |
| Capital project map | Requires geocoding, out of scope |
| Budget forecasting | Politically sensitive, county produces own forecasts |
| Mobile native app | Web-first, reassess based on traffic patterns |

---

## Feature Complexity Summary

| Feature | Frontend | Backend/Query | Pipeline | Total Effort |
|---------|----------|--------------|----------|-------------|
| Data Table Fallback Component | MEDIUM | None | None | MEDIUM |
| Treemap Drill-Down | HIGH | LOW | None | HIGH |
| Mobile Treemap Fallback | MEDIUM | None | None | MEDIUM |
| Revenue Donut | LOW | LOW | None | LOW |
| Department Detail Pages | MEDIUM | MEDIUM | None | MEDIUM |
| Expenditure Breakdown Bars | LOW | LOW | None | LOW |
| YoY Comparison | MEDIUM | LOW | None | MEDIUM |
| Tax Calculator | MEDIUM | LOW | None | MEDIUM |
| Penny Visualization | LOW | None | None | LOW |
| AI Description Pipeline | None | LOW | MEDIUM | MEDIUM |
| Full-Text Search | LOW | LOW | None | LOW |
| SEO / Open Graph | LOW | None | None | LOW |

**Total estimated effort:** ~6-8 focused phases (2-4 tasks each)

---

## Competitor Feature Gap Analysis (v1.1 specific)

| Feature | USASpending | Open Budget Oakland | USAFacts | VisGov | BudgetExplorer v1.1 |
|---------|-------------|---------------------|----------|--------|---------------------|
| Treemap drill-down | No (bar charts) | No (flow charts) | No (Sankey) | No (tree list) | **Yes -- primary viz** |
| Revenue donut | Partial | Yes | Yes | Yes | **Yes** |
| Department detail pages | Yes (agency) | Yes | Partial | Yes | **Yes with AI descriptions** |
| YoY comparison | Yes (10 FYs) | Yes (tool) | Yes (sparklines) | No | **Yes (5 FYs)** |
| Tax calculator | No | No | No | Basic | **Yes -- personalized** |
| AI descriptions | No | No | No | No | **Yes -- unique** |
| Penny visualization | No | No | Partial | No | **Yes** |
| Search | Yes | No | Yes | No | **Yes** |
| Mobile responsive | Yes | Partial | Yes | Partial | **Yes (mobile-first)** |
| Data table fallbacks | Partial | No | No | No | **Yes (WCAG AA)** |

**v1.1 will match or exceed every competitor on every feature except data export (deferred) and multi-year depth (USASpending has 10 years vs our 5).**

---

## Sources

- [Nivo Treemap Documentation](https://nivo.rocks/treemap/) -- HIGH confidence, official docs
- [Nivo Sunburst Documentation](https://nivo.rocks/sunburst/) -- HIGH confidence, official docs
- [Nivo Sunburst Drill-Down Demo](https://github.com/plouc/nivo/commit/b058f7b7a9750ce923e59b03bd6413391d6fa72f) -- HIGH confidence, official repository
- [Recharts Donut/Pie Chart](https://www.geeksforgeeks.org/reactjs/create-a-donut-chart-using-recharts-in-reactjs/) -- MEDIUM confidence
- [Next.js Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) -- HIGH confidence, official docs (updated 2026-02-27)
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- HIGH confidence, official docs
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch-intro.html) -- HIGH confidence, official docs
- [Prisma Raw Query for FTS](https://www.pedroalonso.net/blog/postgres-full-text-search/) -- MEDIUM confidence
- [Prisma tsvector with PostgreSQL](https://medium.com/@chauhananubhav16/bulletproof-full-text-search-fts-in-prisma-with-postgresql-tsvector-without-migration-drift-c421f63aaab3) -- MEDIUM confidence
- [Miami-Dade Property Tax Guide](https://www.propertyexemption.com/property-tax/miami-property-tax/) -- MEDIUM confidence
- [Miami-Dade Property Appraiser Tax Estimator](https://apps.miamidadepa.gov/PAOnlineTools/Taxes/TaxEstimator.aspx) -- HIGH confidence, official tool
- [Amendment 5 Homestead Exemption](https://www.propertyexemption.com/property-tax/miami-property-tax/) -- MEDIUM confidence
- [WCAG Chart Accessibility](https://www.tpgi.com/making-data-visualizations-accessible/) -- HIGH confidence, TPGi (accessibility authority)
- [Deque Interactive Chart Accessibility](https://www.deque.com/blog/how-to-make-interactive-charts-accessible/) -- HIGH confidence
- [Smashing Magazine Chart Accessibility](https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/) -- MEDIUM confidence
- [USASpending.gov Spending Explorer](https://www.usaspending.gov/explorer/budget_function) -- HIGH confidence, direct analysis
- [Open Budget Oakland](https://openbudgetoakland.org/) -- HIGH confidence, direct analysis
- [USAFacts Government Spending](https://usafacts.org/articles/this-chart-tells-you-everything-you-want-to-know-about-government-spending/) -- HIGH confidence
- [VisGov Visual Budget](https://visgov.com/visual-budget/) -- MEDIUM confidence
- [Political Math 10,000 Pennies](https://dataphys.org/list/federal-budget-explained-with-10000-pennies/) -- MEDIUM confidence
- [GovTech: Low-Cost Budget Visualization Tool](https://www.govtech.com/civic/low-cost-budget-visualization-tool-gains-momentum.html) -- MEDIUM confidence

---
*Feature research for: Miami-Dade Budget Explorer v1.1*
*Researched: 2026-02-28*
