# Project Research Summary

**Project:** Miami-Dade Budget Explorer v1.2 (FY 2026-27 Proposed Budget)
**Domain:** Civic budget transparency site adding a proposed-vs-adopted budget cycle, cross-taxonomy (9-area → 7-priority) reorg diffs, and stage-aware data modeling to a live Next.js/Prisma/Neon application
**Researched:** 2026-07-18
**Confidence:** HIGH

## Executive Summary

This milestone adds Miami-Dade's FY 2026-27 **proposed** budget ($14.26B, up from $13.23B adopted) to a site that has, until now, only ever modeled one budget stage per year. That single fact — stage was previously implicit in an `is_actual` boolean — is the crux of the entire milestone. Every other decision (schema, routing, diff math, Sankey, calculator, AI narratives) cascades from making "proposed / adopted / actual" an explicit, first-class dimension *before* any FY 2026-27 data is loaded. Civic-budget precedent (Seattle, Bakersfield, NYC Council, OpenGov, ClearGov) is unanimous that proposed and adopted must be visually and structurally separated, never toggled in place — a pattern this project should implement as a dedicated `/proposed` route namespace with its own layout-level banner, never a query parameter on existing pages.

The recommended approach requires exactly one new npm dependency (`d3-sankey`, for the reorg crosswalk visualization) — everything else is code against the existing stack (Next.js, Prisma 7, Neon, D3-module charts, pdfplumber, Vitest). Architecturally, `is_actual` should be replaced (not supplemented) by a Postgres `budget_stage` enum across all tables that carry it, a new `fiscal_year_stages` table should hold stage-scoped countywide totals so proposed totals survive September's adopted load, and the 7 new Strategic Priorities should be added as new rows in the existing `strategic_areas` table (reusing two rows that carry over by name) rather than a parallel taxonomy table — this avoids a costly schema fork while keeping every existing FK and view intact.

The dominant risk is not technical difficulty but credibility and correctness under a hard, public deadline (Sept 3 and 17 hearings). Research surfaced twelve concrete pitfalls, several severe: proposed rows silently leaking into "current fiscal year" queries and appearing on adopted pages; two legitimately-different-but-same-named "FY 2025-26" baselines getting diffed against each other; multi-row department budgets being double-counted in cross-year diffs (the same bug class as the 2026-07 audit, now doubled in exposure); division-by-zero/BigInt crashes on new departments; and AI narratives hallucinating political causality for a document published by a commissioner's-office employee. Each has a documented, low-cost prevention (explicit stage filters, a single tested diff module, human-reviewed narratives with banned-word lint, a September "dress rehearsal" load) — the risk is real but fully mitigated if the schema and diff-computation phases are done first and rigorously, before any UI or visualization work begins.

## Key Findings

### Recommended Stack

The validated v1.0/v1.1 stack (Next.js 16, TypeScript 5, Tailwind v4, Prisma 7.4.2, Neon Postgres, hand-rolled D3-module charts via `ChartContainer`/`DataTableToggle`, pdfplumber 0.11.9, Vitest 4, pnpm) is unchanged and not re-litigated. The only stack addition for v1.2 is `d3-sankey` for the reorg crosswalk visualization.

**Core technologies (additions):**
- `d3-sankey` 0.12.3 + `@types/d3-sankey` 0.12.5 — Sankey layout algorithm for the 9-area → 7-priority crosswalk; fits the existing "layout math in, custom SVG render out" pattern already used by the treemap's `d3-hierarchy` usage.
- Everything else (waterfall, diverging bars, millage comparison, PDF extraction, stage schema) is covered by existing dependencies (`d3-scale`, pdfplumber, Prisma, the existing tax-math module) — no new libraries needed.
- Explicitly rejected: Recharts for new charts (project already migrated off it), Nivo (rejected in v1.1), plotly/ECharts (bundle-weight overkill for one diagram).

### Expected Features

Verified against Seattle, Bakersfield, NYC Council, OpenGov/ClearGov, and Florida TRIM statutory process. The consensus pattern is three reinforcing layers: label every number's stage, physically separate proposed/adopted surfaces, and disclaim with an as-of date.

**Must have (table stakes):**
- Stage badge + persistent status banner on every proposed figure, with hearing dates and an "as of" date stamp
- Dedicated `/proposed` route/section with distinct visual identity — never a toggle on existing pages
- Stage-aware data model (proposed/adopted/actual as a first-class dimension)
- Department-level diffs ($ and %) vs FY 2025-26 adopted, computed via `sumBudgetRows()` semantics
- Countywide topline comparison ($13.23B → $14.26B), verified against Budget in Brief
- Sortable biggest-increases/biggest-cuts table
- Calculator: current-vs-proposed millage comparison, matching the TRIM notice mental model
- Source PDF links to the proposed release appendices
- Cross-links from existing adopted pages to proposed diffs (never inline number substitution)

**Should have (differentiators):**
- Dollar-weighted Sankey (9 areas → 7 priorities) — no competitor portal does this; the milestone's signature asset
- AI "what's changing" narratives per department, extending the site's existing plain-English description pipeline
- Countywide waterfall chart (adopted → per-priority deltas → proposed)
- Diverging bar chart of department changes
- Hearing-season context module (Sept 3 & 17 dates, TRIM explainer)

**Defer (v2+ / post-adoption):**
- Live amendment tracking during hearings (too error-prone for a two-evening event; do the diff after adoption instead)
- Public comment/testimony collection (out of scope, county runs official channels)
- Predicting what the Commission will adopt (politically exposed, explicitly out of scope)
- Full parallel v1.1 site clone for proposed data (treemap/penny-viz/revenue-donut parity) — diff-centric section only, full parity happens after adoption
- Line-item/appendix-level proposed detail beyond department level

### Architecture Approach

The stage dimension must replace, not supplement, the existing `is_actual` boolean — adding `stage` alongside `is_actual` was explicitly rejected because proposed rows would satisfy `is_actual = false` and silently contaminate every existing "adopted" query. A new `budget_stage` Postgres enum (`proposed`/`adopted`/`actual`) goes on `department_budgets`, `department_expenditures`, `revenue_by_source`, `millage_rates`, `strategic_area_budgets`, and `budget_descriptions`, replacing `is_actual` in each table's unique key. A new `fiscal_year_stages` table holds stage-scoped countywide totals so FY 2026-27 proposed totals persist after September's adopted load overwrites nothing. The 7 new Strategic Priorities are new rows in the existing `strategic_areas` table (two rows reused by name for carry-over priorities); which areas "exist" for a given (FY, stage) is derived from `strategic_area_budgets` rows, requiring no new taxonomy table.

**Major components:**
1. **Migration 006 (stage) + 007 (priorities)** — schema foundation; must ship alone first, verified byte-identical against existing pages before any new feature code lands.
2. **Extraction pipeline (Appendix A/H extractors + verification + identity gate)** — new state-machine extractors for the proposed release's format, with loud-warning-on-unrecognized-header discipline and a department-name reconciliation gate.
3. **Diff computation module** — one shared, unit-tested `computeDiff()` function (department-total level only, BigInt-safe, handles new/eliminated cases) used by every page, chart, and narrative.
4. **`/proposed` route namespace** — layout-level banner/identity, landing page, priority pages, department diff pages, all following existing static-generation + ISR conventions.
5. **AI narrative generation** — same offline, human-reviewed batch pattern as v1.1, extended with numbers-only-grounding prompts and banned-word lint.

### Critical Pitfalls

1. **"Latest fiscal year" queries silently absorb proposed rows** — every existing page (homepage hero, treemap, YoY charts) starts showing unlabeled proposed numbers the moment FY 2026-27 loads, unless stage is an explicit filter everywhere. Prevention: stage-model first, snapshot-diff all v1.1 pages before/after load, zero changes allowed.
2. **Two versions of "FY 2025-26" get diffed against each other** — the proposed release's restated prior-year column (new taxonomy, sometimes different scope) doesn't match the DB's adopted FY 2025-26 (old taxonomy, includes capital). Prevention: store both, diff within one release's paired columns, add a reconciliation report.
3. **Multi-row double-counting in cross-year diffs** — the same bug family as the 2026-07 audit, now doubled by touching two years/taxonomies at once. Prevention: one shared `sumBudgetRows()`-based diff function, cent-exact roll-up test.
4. **Proposed numbers escape context and get cited as fact** — OG images, search snippets, `<title>`, chart alt-text can all drop the PROPOSED label even when the page itself has a banner. Prevention: an explicit escape-surfaces checklist, stage-explicit formatting with no defaults.
5. **AI narratives hallucinate causality for a live political document** — highest reputational risk item in the whole milestone. Prevention: keep the mandatory human-review gate, numbers-only-grounding prompts, banned-word lint; never relax for schedule pressure.

## Implications for Roadmap

Based on combined research, the build order is largely dictated by dependency chains documented in ARCHITECTURE.md and confirmed by PITFALLS.md's "implied phase ordering." Suggested phase structure:

### Phase 1: Stage-Aware Schema Foundation
**Rationale:** Every other phase depends on stage being explicit; this is also the pitfall-1 gate (proposed rows leaking into adopted queries) and must ship alone, changing zero user-visible behavior, before any new data loads.
**Delivers:** `budget_stage` enum, `fiscal_year_stages` table, mechanical `is_actual` → `stage` rename across queries/views/MV, regenerated Prisma client.
**Addresses:** Stage-aware data model (table stakes feature).
**Avoids:** Pitfall 1 (latest-FY absorption) and the "add stage alongside is_actual" anti-pattern.

### Phase 2: Reference Data — Strategic Priorities
**Rationale:** Priority rows and FY 2026-27's `fiscal_years` row must exist before any pipeline load can reference them; low-risk, mechanical DDL.
**Delivers:** 5 new `strategic_areas` rows, 2 reused rows for carry-over priorities, FY 2026-27 fiscal_years row.
**Uses:** Existing migration-runner pattern (precedent: migration 003).
**Implements:** Architecture Decision 2 (priorities as data-driven-scoped rows, not a parallel table).

### Phase 3: Extraction Pipeline (Appendix A/H)
**Rationale:** Nothing renders without trusted, verified data; this phase also carries the identity-resolution gate (renamed/merged departments) that the Sept hearing season will re-exercise repeatedly.
**Delivers:** New Appendix A/H extractor state machines, verification block (countywide + per-priority + sampled department lines to the cent), department-name reconciliation gate, re-extraction/idempotency support.
**Addresses:** Proposed-release pipeline (P1 table stakes).
**Avoids:** Pitfall 2 (mixed FY 25-26 baselines), Pitfall 5 (fake new/eliminated from renames), Pitfall 12 (unit slips), Pitfall 10 (treating July proposal as static).

### Phase 4: Diff Computation Module
**Rationale:** Diffs feed the movers table, diverging bars, department pages, and AI narratives — one tested module must exist before any of those are built, or math diverges across call sites.
**Delivers:** `computeDiff()` pure module (BigInt-safe, new/eliminated discriminated union), department-total-level diffs only, cent-exact roll-up test vs countywide.
**Addresses:** Department-level diffs, sortable movers table (table stakes).
**Avoids:** Pitfall 3 (multi-row double-counting), Pitfall 4 (zero-baseline/BigInt division traps).

### Phase 5: /proposed Routes and Core UI
**Rationale:** Query layer (proposed-queries.ts, diff-queries.ts) and route namespace depend on Phases 1-4 being real; this is where the "cannot be mistaken for adopted" requirement becomes a layout-level guarantee.
**Delivers:** `/proposed` layout + banner, landing page (topline, movers table, diverging bars), department diff pages, cross-link callouts from adopted pages.
**Addresses:** Stage badge/banner, dedicated section, department diffs, movers table, cross-links (all table stakes).
**Avoids:** Pitfall 6 (escape surfaces), Pitfall 8 (moralizing diff colors).

### Phase 6: Sankey Crosswalk Explainer
**Rationale:** Depends on the diff/crosswalk data decision from Phase 4 and is explicitly the milestone's signature differentiator, but is also the highest-complexity single visualization — sequenced after core diff UI ships so it doesn't block simpler, higher-certainty features.
**Delivers:** `SankeyCrosswalk.tsx` with `d3-sankey`, balanced one-year-dollars-both-sides weighting, data-table accessibility fallback.
**Addresses:** Dollar-weighted Sankey differentiator.
**Avoids:** Pitfall 7 (Sankey misread as money moving; unbalanced totals).

### Phase 7: Calculator Millage Comparison
**Rationale:** Has a hard external checkpoint (~Aug 4 TRIM certification) independent of the rest of the build; depends only on the stage model, so it can be built any time after Phase 1 but should be verified/re-checked after certification lands.
**Delivers:** Stage-aware millage rows, current-vs-proposed comparison UI matching the TRIM notice mental model, rolled-back-rate glossary entries.
**Addresses:** Calculator differentiator/table-stake.
**Avoids:** Pitfall 11 (TRIM ceiling/rolled-back-rate/"no tax increase" conflation).

### Phase 8: AI Change Narratives (last content phase)
**Rationale:** Consumes frozen diffs from Phase 4 — cannot be generated meaningfully until extraction and diff computation are verified green; also the single highest-reputational-risk artifact, so it should not compete for attention with earlier, faster-moving phases.
**Delivers:** Pre-generated, human-reviewed "what's changing" narratives per department, banned-word lint, regeneration wired to future data reloads.
**Addresses:** AI narrative differentiator.
**Avoids:** Pitfall 9 (hallucinated/editorialized causality).

### Phase Ordering Rationale

- Schema-first ordering is non-negotiable: ARCHITECTURE.md and PITFALLS.md independently converge on the same conclusion — stage modeling gates everything, and it is also what makes the September adopted load "a data load, not a rebuild" (the milestone's own stated success criterion).
- Diff computation is deliberately isolated as its own phase before any UI, because FEATURES.md shows nearly every differentiator (movers table, bars, waterfall, Sankey, narratives) consumes the same diff data — building it once avoids the "divergent math per page" anti-pattern PITFALLS.md flags explicitly.
- The Sankey is sequenced after core diff UI (not before) despite being the "signature" feature, because it is the highest implementation cost (HIGH in STACK.md and FEATURES.md) and the most failure-prone visualization (Pitfall 7) — de-risk it with real, verified diff data already in hand rather than racing it to be first.
- AI narratives are last by design in both ARCHITECTURE.md's build order and PITFALLS.md's phase mapping: they need frozen diffs to describe, and rushing them undermines the one artifact where review quality matters most.
- The calculator has an external, uncontrollable checkpoint (Aug 4 certification) that doesn't block the rest of the roadmap but does require a scheduled recheck — flag this as a standing to-do independent of phase sequencing.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Extraction Pipeline):** Appendix A/H format specifics are MEDIUM confidence (verified against one sample PDF session, not yet validated against extractor implementation) — needs a research-phase or spike pass against the actual sample PDFs before committing to column-position logic.
- **Phase 6 (Sankey Crosswalk):** Node-ordering/crossing-minimization and mobile-responsive tactics for a 9-left/7-right diagram are MEDIUM confidence (viz-community sources, not project-verified) — worth a focused look at d3-sankey's ordering options before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Stage Schema):** HIGH confidence, grounded in direct reads of the actual schema/queries/migrations; the migration SQL is essentially drafted already in ARCHITECTURE.md.
- **Phase 4 (Diff Computation):** HIGH confidence; mirrors the existing tax-math pure-module pattern already proven in this codebase.
- **Phase 5 (/proposed Routes):** HIGH confidence; direct extension of verified v1.1 routing/ISR/query-module conventions.
- **Phase 7 (Calculator):** HIGH confidence architecturally (extends existing pure client-side module); the TRIM statutory content itself is well-documented (Fla. Stat. 200.065).
- **Phase 8 (AI Narratives):** HIGH confidence; reuses the proven v1.1 pre-generation + human-review pipeline unchanged in structure.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Single new dependency verified against npm registry directly; all other coverage confirmed by reading actual repo source (package.json, chart components) |
| Features | MEDIUM-HIGH | Civic-portal patterns verified across multiple live sites and the GFOA award criteria; some figures (e.g., $14.26B breakdown) sourced from news coverage pending pipeline verification against the official Budget in Brief |
| Architecture | HIGH | Grounded in direct reads of schema.prisma, queries.ts, seed.py, and existing migrations — not inference |
| Pitfalls | HIGH (system/process) / MEDIUM (viz/AI) | System-specific and Florida TRIM statutory pitfalls verified against actual code and Fla. Stat. 200.065; visualization and AI-narrative pitfalls drawn from viz-community sources and domain judgment |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact Appendix A/H column layout:** Format facts are based on one 2026-07-18 verification session against sample PDFs, not a completed extractor. Validate column positions and wrap-handling against the actual sample PDFs during Phase 3, with fixture tests, before trusting any extracted number.
- **$14.26B / $9.02B / $5.24B figures:** Currently sourced from news coverage (MEDIUM confidence per FEATURES.md and PITFALLS.md). Must be verified against the county's own Budget in Brief in the pipeline's verification block before any figure is displayed — treat as unverified until Phase 3's verify step passes.
- **`fiscal_year_stages` vs. summing `strategic_area_budgets`:** ARCHITECTURE.md rates this MEDIUM-HIGH, not HIGH — the dedicated table is recommended but summing area rows per stage is a viable lighter alternative if schema surface area needs to shrink. Revisit if migration review flags simplicity concerns.
- **Position/employee-count diffs:** FEATURES.md flags this as pending confirmation that headcount extracts cleanly from the proposed release — treat as a P2 (post-MVP) item contingent on Phase 3 findings, not a committed deliverable.
- **September adopted-load rehearsal:** Both ARCHITECTURE.md and PITFALLS.md stress a "dress rehearsal" (loading proposed data as stage=adopted into a scratch DB) as the real verification for "September is a data load." This should be an explicit roadmap checkpoint, not just a code review item — schedule it before Sept 3, not after.

## Sources

### Primary (HIGH confidence)
- Repo source directly read: `budget-explorer-web/prisma/schema.prisma`, `src/lib/db/queries.ts`, `pipeline/load/seed.py`, `pipeline/migrations/003_appendix_integration.sql`, `pipeline/migrations/004_search_index.sql`, `budget-explorer-web/package.json`, `src/components/charts/ChartContainer.tsx` + `YearOverYearChart.tsx`, `requirements.txt`
- npm registry (`npm view d3-sankey`, `npm view @types/d3-sankey`) — versions verified 2026-07-18
- `.planning/PROJECT.md` and `CLAUDE.md` (project) — 2026-07 audit invariants, FY 2026-27 release format verification, priority names
- [Fla. Stat. § 200.065](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299%2F0200%2FSections%2F0200.065.html) — statutory TRIM timeline and ceiling semantics
- [Seattle Open Budget](https://openbudget.seattle.gov/) / [Council Budget Dashboard](https://www.seattle.gov/council/topics/budget-dashboard), [Bakersfield Open Budget](https://budget.bakersfieldcity.us/), [NYC Council Budget Dashboards press release](https://council.nyc.gov/press/2026/03/25/3092/), [Shelby County TN Proposed Budget Disclaimer](https://www.shelbycountytn.gov/3337/Proposed-Budget-Disclaimer), [GFOA Budget Award](https://www.gfoa.org/budget-award)

### Secondary (MEDIUM confidence)
- [OpenGov Budget Book](https://opengov.com/products/budgeting-and-planning/budget-book/) examples, [ClearGov operational budgeting](https://cleargov.com/products/operational-budgeting)
- [Caribbean National Weekly: Miami-Dade FY2026-27 proposed budget figures](https://www.caribbeannationalweekly.com/posts/miami-dade-mayor-proposes-142-billion-fy2026-27-budget-keeps-county-tax-rate-unchanged), cross-checked against [miamidade.gov budget page](https://www.miamidade.gov/global/management/budget/home.page)
- [Florida DOR TRIM Compliance Workbook](https://floridarevenue.com/property/Documents/trimregwb.pdf), [Manatee PAO](https://www.manateepao.gov/trim-notices/), [Collier Clerk on proposed millage as maximum](https://www.collierclerk.com/board-of-county-commissioners-adopts-proposed-millage-rates-as-maximum-property-tax-rates/)
- Winners-and-losers journalism convention: [Axios](https://www.axios.com/2025/05/02/trumps-budget-winners-losers), [Washington Post DC 2026 budget](https://www.washingtonpost.com/dc-md-va/2025/07/30/dc-budget-winners-and-losers/)

### Tertiary (LOW-MEDIUM confidence, needs validation)
- Sankey design-mistake sources: [Datasketch](https://datasketch.blog/en/post/the-5-most-common-mistakes-in-designing-a-sankey-diagram-and-how-to-avoid-them/), [PolicyViz](https://policyviz.com/2021/02/02/the-sankey-diagram/), [Plotly Sankey deep dive](https://plotly.com/blog/sankey-diagrams/) — community best-practice, not project-verified
- [USAFacts government spending Sankey](https://usafacts.org/articles/this-chart-tells-you-everything-you-want-to-know-about-government-spending/) — precedent reference only

---
*Research completed: 2026-07-18*
*Ready for roadmap: yes*
