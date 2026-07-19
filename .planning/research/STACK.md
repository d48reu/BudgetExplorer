# Stack Research

**Domain:** Budget diff visualizations (Sankey, waterfall, diverging bars) + proposed-budget pipeline — v1.2 milestone additions only
**Researched:** 2026-07-18
**Confidence:** HIGH (versions verified against npm registry; existing patterns verified by reading repo source)

## Scope

This is a SUBSEQUENT-milestone stack check. The validated v1.0/v1.1 stack (Next.js 16.1.6, TypeScript 5, Tailwind v4, Prisma 7.4.2 + PrismaPg, Neon PostgreSQL, d3-hierarchy/d3-shape/d3-scale, ChartContainer/DataTableToggle chart pattern, pdfplumber 0.11.9 pipeline, Vitest 4, pnpm) is NOT re-litigated. Only additions for v1.2 features are covered. (Note: the previous version of this file recommended Nivo for v1.1; that was overturned during implementation in favor of hand-rolled D3-module charts — see PROJECT.md Key Decisions. This research follows the D3-modules pattern that actually shipped.)

**Bottom line: exactly one new npm dependency (`d3-sankey` + its types). Everything else in this milestone is code, not stack.**

## Recommended Stack

### Core Technologies (additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| d3-sankey | 0.12.3 | Sankey layout algorithm (node positioning, link widths) for the 9-areas → 7-priorities crosswalk | Canonical d3-org layout module; same "layout math in, you render SVG" contract as the already-installed d3-hierarchy treemap. Slots directly into the existing ChartContainer render-prop pattern — d3-sankey computes `{x0,y0,x1,y1}` node rects and link geometry, custom React renders them, exactly like `Treemap.tsx` does with `d3-hierarchy`. Verified latest on npm (0.12.3 is the current release; the library is a finished, stable layout algorithm, not abandonware — d3 layout modules rarely rev). |
| @types/d3-sankey | 0.12.5 | TypeScript types for d3-sankey | Matches the existing convention (`@types/d3-hierarchy`, `@types/d3-scale`, `@types/d3-shape` are all in devDependencies). Generic over custom node/link types, so sankey data can carry `slug`, `color`, and BigInt-cents-as-string fields. |

### Existing capabilities that cover the rest (verify, don't add)

| Feature | Covered By | How |
|---------|-----------|-----|
| Waterfall chart (countywide adopted → proposed) | `d3-scale` 4.0.2 (already installed) + plain TS | A waterfall is a bar chart with a running cumulative offset: `scaleBand` for categories, `scaleLinear` for dollars, floating rects at `y = scale(cumulative)` with height `|scale(delta) - scale(0)|`. `YearOverYearChart.tsx` is the direct template — same `useMemo` scale setup, same margin convention, same SVG structure. No library would beat ~60 lines of TS here. |
| Diverging bar chart (department deltas, negative left / positive right) | `d3-scale` 4.0.2 (already installed) | `scaleLinear` with symmetric domain `[-maxAbs, +maxAbs]`, bars anchored at `x = scale(0)`, extending left for cuts and right for increases. Color by sign using existing brand tokens (#0057B8 increase / #EF4444 decrease, consistent with the established badge-color convention). ~50 lines following the YoY chart pattern. |
| Sankey link paths | `d3-sankey` itself | `sankeyLinkHorizontal()` is exported from d3-sankey — do NOT add or upgrade anything in d3-shape for this. |
| Millage current-vs-proposed comparison | Existing pure client-side tax-math module + Vitest 4 | Calculator is already client-side with millage rates fetched once; comparison = running the existing computation twice against two `millage_rates` fiscal-year sets and diffing. Zero new dependencies; extend the existing 16-test Vitest suite. |
| Proposed-budget PDF extraction (Appendix A/H) | pdfplumber 0.11.9 (already pinned in requirements.txt) | New extractors are new ALL-CAPS-header state machines in the existing extractor framework (per the audit invariant: unrecognized headers warn and close the block). Format analysis is already done (PROJECT.md Context: paired FY columns, 8 revenue-source groups, 16 numbers per Department Total line in Appendix A; 9-number lines with wrapping names in Appendix H). pdfplumber 0.11.9 is current — no upgrade needed. |
| Stage-aware data modeling (proposed/adopted/actual) | Prisma 7.4.2 + existing pipeline SQL migration runner | This is a schema change, not a stack change. Add a `budget_stage` column (Postgres enum `'proposed' \| 'adopted' \| 'actual'`, or varchar + CHECK) via a new file in `pipeline/migrations/`, then `prisma db pull` + `prisma generate` to refresh the client — the same introspection flow already in use. Prisma 7 maps Postgres enums to TS union types natively. Note for the schema designer: the current `department_budgets` unique key includes `is_actual`; the stage column must join (or replace) it in that constraint, and the two existing booleans (`department_budgets.is_actual`, `fiscal_years.is_adopted`) are the semantics being generalized. |
| Sankey crosswalk data (which old-area dollars flow to which new priority) | New DB table via existing migration runner | The 9→7 dollar-weighted mapping is data (a crosswalk table with `from_area_id`, `to_priority_id`, `amount_cents`), loaded by the pipeline like every other table. No stack implication beyond the migration file. |
| Seven Strategic Priority rows | Existing `strategic_areas` table pattern | Whether priorities live in `strategic_areas` with a stage/generation discriminator or in a sibling table is an ARCHITECTURE decision; either way it's DDL through the existing migration runner, not new stack. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Install the one new dep | `pnpm add d3-sankey` / `pnpm add -D @types/d3-sankey` from `budget-explorer-web/`. pnpm's isolated node_modules cleanly handles d3-sankey's nested older deps (see Version Compatibility). |

## Installation

```bash
# From budget-explorer-web/
pnpm add d3-sankey            # → 0.12.3
pnpm add -D @types/d3-sankey  # → 0.12.5

# Pipeline: nothing. requirements.txt is unchanged.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| d3-sankey + custom SVG | Recharts `<Sankey>` (recharts 3.7.0 is already installed) | Only if you wanted a zero-effort default look. Rejected because: (a) the project already migrated YoY charts OFF Recharts to hand-rolled D3 "for consistency" (Key Decisions log); (b) Recharts Sankey gives weak control over node labels, per-source link coloring, and the dollar-weighted flow labels this chart needs; (c) it doesn't fit the ChartContainer render-prop + DataTableToggle accessibility pattern — you'd fight the abstraction. Expanding a second charting paradigm for one chart is the wrong trade. |
| d3-sankey | @nivo/sankey | Never for this project — Nivo was evaluated and rejected in v1.1 (treemap lacked customization) and it drags a large dependency tree for one chart. |
| d3-sankey | Hand-rolling the sankey layout | Don't. Node ordering and iterative relaxation to minimize link crossings is the actually-hard part of a sankey; d3-sankey (~10KB) is the reference implementation. Rendering stays custom either way. |
| Custom waterfall/diverging bars on d3-scale | Any charting library (visx, Observable Plot, ECharts) | Only if the project were starting fresh with 20+ chart types. For two simple bar variants in a codebase that already has five bespoke d3-scale charts, a library adds bundle weight and a second styling system for negative value. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Full `d3` metapackage | Project deliberately uses per-module d3 imports (smaller bundles, tree-shakeable); the metapackage pulls ~30 unused modules | `d3-sankey` module only |
| Recharts for any NEW chart | Direction of travel is away from Recharts (YoY charts were migrated off it); expanding its use reverses a settled decision | ChartContainer + d3-scale pattern |
| plotly.js / ECharts for the Sankey | 1MB+ bundle cost for one diagram on a mobile-first, statically-generated civic site | d3-sankey (~10KB) |
| A second migration tool (Prisma Migrate) for the stage column | `pipeline/migrations/` is the canonical schema (CLAUDE.md); Prisma Migrate would create two sources of truth | New SQL file in `pipeline/migrations/` + `prisma db pull` |
| camelot / tabula / pymupdf for Appendix A/H | Format analysis was already done against pdfplumber's model; the extractor framework, verification blocks, and state-machine conventions are all pdfplumber-based | pdfplumber 0.11.9 with new extractor modules |
| BigInt directly in sankey/chart math | d3 layouts and scales operate on JS numbers; BigInt throws on mixed arithmetic | Existing `toChartValue()` in `lib/chart-utils` (BigInt-cents string → number) at the chart boundary, exactly as YearOverYearChart does |

## Integration Notes (for roadmap/architecture)

1. **Sankey component shape:** `SankeyCrosswalk.tsx` in `src/components/charts/`, `'use client'`, receives serialized crosswalk rows (cents as strings), converts via `toChartValue()`, builds `{nodes, links}` in a `useMemo`, calls `sankey().nodeWidth(…).nodePadding(…).extent([[0,0],[width,height]])` inside the ChartContainer render prop, renders `<rect>` per node and `<path d={sankeyLinkHorizontal()(link)}>` per link. Wrap in DataTableToggle with a from-area / to-priority / dollars table — the sr-only table is the accessibility story for a chart this visually complex, and the pattern already mandates it (VIZ-07).
2. **d3-sankey mutates its input** (assigns layout fields onto the node/link objects you pass in). Build the nodes/links arrays fresh inside `useMemo` from props; never pass cached or shared objects.
3. **Mobile:** a 9-left / 7-right sankey needs ~400px height minimum for legible labels at 375px width; use `ChartContainer minHeight={400}` and consider abbreviated node labels below the `sm` breakpoint — same responsive tactics as the treemap.
4. **Waterfall and diverging bars share a delta computation** (proposed minus adopted, per department and countywide). Put it in a pure lib module (like `tax-math`) so Vitest covers sign/rounding edge cases on BigInt cents *before* conversion to chart numbers — BigInt diffs stay exact; only the display layer converts.
5. **Diff math caveat from the audit:** department totals MUST use `sumBudgetRows()` semantics (multi-row per department/FY). Proposed-vs-adopted diffs are diffs of *summed slices per stage*, never row-to-row.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| d3-sankey@0.12.3 | d3-shape@3.2.0 (app-level) | d3-sankey internally depends on `d3-shape@^1.2.0` and `d3-array@1 - 2`. These install as **nested** deps under pnpm — no conflict with the app's d3-shape 3.x. Do not dedupe/override them to v3; the pinned older versions are what d3-sankey was tested against. |
| d3-sankey@0.12.3 | Next.js 16 / React 19 | Ships an ESM `module` entry (`src/index.js`) — bundles fine in client components. Pure layout functions, no DOM/d3-selection usage, so no SSR hazards beyond the `'use client'` boundary the charts already use. |
| @types/d3-sankey@0.12.5 | d3-sankey@0.12.3 | Version-matched. Generics: `sankey<NodeDatum, LinkDatum>()` lets nodes/links carry app fields (slug, color, cents string). |
| Postgres enum for budget_stage | Prisma 7.4.2 introspection | `prisma db pull` picks up Postgres enums as Prisma `enum` blocks; the generated client exposes a TS union. Fits the introspection-driven workflow already in use in this repo. |

## Sources

- npm registry (`npm view d3-sankey`) — version 0.12.3 latest, dependencies `d3-array@1 - 2` / `d3-shape@^1.2.0`, ESM `module` entry — HIGH confidence, verified 2026-07-18
- npm registry (`npm view @types/d3-sankey`) — 0.12.5 latest — HIGH confidence, verified 2026-07-18
- Repo source read directly: `budget-explorer-web/package.json` (current versions), `src/components/charts/ChartContainer.tsx` + `YearOverYearChart.tsx` (chart pattern: hand-rolled SVG + d3-scale + DataTableToggle), `prisma/schema.prisma` (is_actual/is_adopted booleans, unique constraints), `requirements.txt` (pdfplumber 0.11.9) — HIGH confidence
- PROJECT.md Key Decisions log — Recharts→D3 migration precedent, Nivo rejection, ChartContainer render-prop pattern — HIGH confidence

---
*Stack research for: BudgetExplorer v1.2 FY 2026-27 proposed budget milestone*
*Researched: 2026-07-18*
