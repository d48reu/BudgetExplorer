# Roadmap: Miami-Dade Budget Explorer

## Milestones

- ✅ **v1.0 MVP Foundation** -- Phases 1-2 (shipped 2026-02-28)
- ✅ **v1.1 Full Feature Set** -- Phases 3-6 (shipped 2026-03-01)
- 🚧 **v1.2 FY 2026-27 Proposed Budget** -- Phases 7-13 (in progress)

## Phases

<details>
<summary>v1.0 MVP Foundation (Phases 1-2) -- SHIPPED 2026-02-28</summary>

- [x] Phase 1: Data Pipeline (4/4 plans) -- completed 2026-02-28
- [x] Phase 2: App Foundation + Design System (4/4 plans) -- completed 2026-02-28

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.1 Full Feature Set (Phases 3-6) -- SHIPPED 2026-03-01</summary>

- [x] Phase 3: Budget Visualizations + Explorer (3/3 plans) -- completed 2026-03-01
- [x] Phase 4: Department Pages + AI + Year-over-Year (3/3 plans) -- completed 2026-03-01
- [x] Phase 5: Tax Calculator (2/2 plans) -- completed 2026-03-01
- [x] Phase 6: Search + SEO + Launch (2/2 plans) -- completed 2026-03-01

Full details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

### v1.2 FY 2026-27 Proposed Budget (In Progress)

**Milestone goal:** Ship a clearly-separated, diff-centric view of the Mayor's FY 2026-27 proposed budget before the September 3 and 17 budget hearings.

**Hard external dates:**
- ~Aug 4, 2026: TRIM millage certification (recheck Phase 12 rates after this lands)
- Sept 3 & 17, 2026: Budget hearings (milestone deadline; Phase 13 dress rehearsal must complete before Sept 3)

- [ ] **Phase 7: Stage-Aware Schema Foundation** - Replace `is_actual` with a first-class budget stage dimension, zero user-visible change
- [ ] **Phase 8: Proposed Budget Pipeline & Reference Data** - Extract, verify, and seed FY 2026-27 proposed data with the 7 Strategic Priorities
- [ ] **Phase 9: Diff Computation Engine** - One pure, tested, BigInt-exact proposed-vs-adopted diff module
- [ ] **Phase 10: /proposed Section** - Clearly-separated proposed section with banner, movers table, diverging bars, and department diff pages
- [ ] **Phase 11: Sankey Reorganization Explainer** - Dollar-weighted 9 areas → 7 priorities crosswalk visualization
- [ ] **Phase 12: Calculator Millage Comparison** - Current-vs-proposed tax bill comparison, TRIM-safe copy
- [ ] **Phase 13: AI Change Narratives & September Readiness** - Human-reviewed "what's changing" narratives plus the adopted-load dress rehearsal

## Phase Details

### Phase 7: Stage-Aware Schema Foundation
**Goal**: Budget stage (proposed/adopted/actual) is an explicit, first-class dimension across the entire data model, and nothing a user sees changes at all
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: DATA-01
**Success Criteria** (what must be TRUE):
  1. Every existing page (homepage, explorer, area, department, calculator, search) renders byte-identical after the migration, verified by before/after snapshot comparison
  2. The `budget_stage` enum replaces `is_actual` in the schema and unique keys of all six affected tables (`department_budgets`, `strategic_area_budgets`, `millage_rates`, `revenue_by_source`, `department_expenditures`, `budget_descriptions`), with zero remaining `is_actual` references in queries, views, or the materialized search index
  3. Inserting a test FY 2026-27 proposed row into a scratch database changes nothing on any existing page — proving stage filters are explicit everywhere before real data loads
**Plans**: 6 plans

Plans:
- [x] 07-01-PLAN.md — Snapshot regression gate + pre-migration baseline + pre-flight audits (wave 1)
- [x] 07-02-PLAN.md — Migration A (expand): budget_stage enum + backfilled stage columns, proven invisible (wave 2)
- [x] 07-03-PLAN.md — Deploy 1 web code: final-state schema.prisma + 10 stage-filtered reader queries (wave 3)
- [x] 07-04-PLAN.md — Stage-native pipeline: seeders, checker, descriptions generator (wave 3)
- [x] 07-05-PLAN.md — Migration B (contract) + convergence gates + proposed-row probe (wave 4)
- [ ] 07-06-PLAN.md — Production rollout: A -> Deploy 1 -> B same day, byte-identity proven (wave 5)

### Phase 8: Proposed Budget Pipeline & Reference Data
**Goal**: Verified FY 2026-27 proposed budget data — operating, capital, millage, priorities, crosswalk — exists in the database and is trusted to the cent
**Depends on**: Phase 7
**Requirements**: DATA-02, DATA-03, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07
**Success Criteria** (what must be TRUE):
  1. FY 2026-27 proposed operating (Appendix A) and capital (Appendix H) figures are extracted and the verification block passes against the published Budget in Brief totals (countywide, operating/capital split, per-priority) before any seeding
  2. The seven Strategic Priorities exist as `strategic_areas` rows scoped to (FY 2026-27, proposed) — priority navigation never shows old areas and FY 2025-26 navigation never shows new priorities
  3. Any unrecognized department header halts extraction with a loud warning; renamed/new/eliminated departments resolve through `department_aliases`, and the department → old area → new priority crosswalk (including the "Constitutional Office" typo fix) is produced
  4. Re-running extraction for (FY 2026-27, proposed) is idempotent, and every proposed figure carries a visible "as of" date
  5. The reconciliation report comparing Appendix A's restated FY 25-26 column against the adopted database exists, so every baseline discrepancy is documented before any diff renders
**Plans**: TBD

### Phase 9: Diff Computation Engine
**Goal**: All proposed-vs-adopted math flows through one pure, exhaustively tested module — no page, chart, or narrative computes its own diff
**Depends on**: Phase 8
**Requirements**: DIFF-01
**Success Criteria** (what must be TRUE):
  1. `computeDiff()` returns BigInt-exact dollar and percent changes for every department, summing multi-row department budgets per stage via `sumBudgetRows()` semantics
  2. New and eliminated departments produce typed discriminated-union cases with no division-by-zero or BigInt crashes
  3. A Vitest cent-exact roll-up test proves the sum of all department diffs reconciles to the countywide topline change
**Plans**: TBD

### Phase 10: /proposed Section
**Goal**: Residents can explore the proposed budget and every department's change in a section that cannot be mistaken for adopted figures
**Depends on**: Phase 9
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06, PROP-07, PROP-08
**Success Criteria** (what must be TRUE):
  1. Every page under /proposed carries the persistent layout-level banner (not yet adopted, Commission votes Sept 3 & 17, figures as of the release date), and the landing page shows the countywide topline comparison with operating/capital split
  2. Every proposed figure site-wide carries the "FY 2026-27 PROPOSED" stage badge — including page titles, OG images, search snippets, and chart alt text (escape-surfaces checklist verified)
  3. User can sort the biggest-increases/biggest-cuts movers table by dollar and percent change, and scan the diverging bar chart (cuts left, increases right) with a data-table fallback
  4. User can open a per-department diff page showing proposed vs adopted with $ and % change and stage-labeled context, with links to the specific source PDFs (Appendix A/H, proposed Budget in Brief)
  5. Adopted department pages cross-link to their proposed diff via a labeled callout — no proposed number ever appears inline on an adopted page
**Plans**: TBD

### Phase 11: Sankey Reorganization Explainer
**Goal**: Residents can understand the 9-area → 7-priority reorganization as a relabeling of the same dollars, not money moving
**Depends on**: Phase 9 (verified diff/crosswalk data; blocks nothing else — can run parallel with Phases 10/12)
**Requirements**: VIZ-08
**Success Criteria** (what must be TRUE):
  1. User can explore a dollar-weighted Sankey diagram flowing 9 Strategic Areas to 7 Strategic Priorities, with left and right totals balanced on a single year's dollars
  2. The page is annotated "same dollars, new categories" so the diagram cannot be misread as budget movement between programs
  3. The diagram has a data-table fallback and remains legible on mobile (375px+)
**Plans**: TBD

### Phase 12: Calculator Millage Comparison
**Goal**: Residents can see what the proposed budget means for their own tax bill, framed exactly like the TRIM notice they receive in August
**Depends on**: Phase 7 (stage-aware millage rows), Phase 8 (proposed millage rates loaded). External checkpoint: recheck rates after ~Aug 4 TRIM certification
**Requirements**: CALC-06, CALC-07
**Success Criteria** (what must be TRUE):
  1. User can enter their property value in the existing calculator and see a side-by-side current-vs-proposed bill comparison matching the TRIM-notice framing
  2. The comparison shows per-authority proposed rates and rolled-back-rate context
  3. Comparison copy never claims "your taxes won't change" from flat millage alone — every claim is TRIM-safe per Fla. Stat. 200.065 semantics
  4. Displayed proposed rates are verified against the certified TRIM millage after the ~Aug 4 certification
**Plans**: TBD

### Phase 13: AI Change Narratives & September Readiness
**Goal**: Every department diff has a trustworthy plain-English explanation, and September's adopted budget is proven to be a data load, not a rebuild
**Depends on**: Phase 9 (frozen diffs), Phase 10 (diff pages to render narratives on)
**Requirements**: AI-05, AI-06, DATA-04
**Success Criteria** (what must be TRUE):
  1. Every department diff page shows an AI-generated "what's changing" narrative grounded only in the computed diff numbers, passed through the existing pre-generation + human review gate
  2. All narratives pass the banned-word lint — no hallucinated causality or political editorializing for this live political document
  3. Narratives regenerate per stage with a single pipeline run, requiring no pipeline changes when September's adopted figures land
  4. The dress rehearsal passes: loading adopted-stage FY 2026-27 data into a scratch database coexists with the proposed rows (stage-scoped deletes), leaves all proposed pages unchanged, and completes before the Sept 3 hearing
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Pipeline | v1.0 | 4/4 | Complete | 2026-02-28 |
| 2. App Foundation + Design System | v1.0 | 4/4 | Complete | 2026-02-28 |
| 3. Budget Visualizations + Explorer | v1.1 | 3/3 | Complete | 2026-03-01 |
| 4. Department Pages + AI + YoY | v1.1 | 3/3 | Complete | 2026-03-01 |
| 5. Tax Calculator | v1.1 | 2/2 | Complete | 2026-03-01 |
| 6. Search + SEO + Launch | v1.1 | 2/2 | Complete | 2026-03-01 |
| 7. Stage-Aware Schema Foundation | v1.2 | 2/6 | In Progress | - |
| 8. Proposed Budget Pipeline & Reference Data | v1.2 | 0/? | Not started | - |
| 9. Diff Computation Engine | v1.2 | 0/? | Not started | - |
| 10. /proposed Section | v1.2 | 0/? | Not started | - |
| 11. Sankey Reorganization Explainer | v1.2 | 0/? | Not started | - |
| 12. Calculator Millage Comparison | v1.2 | 0/? | Not started | - |
| 13. AI Change Narratives & September Readiness | v1.2 | 0/? | Not started | - |

---
*Roadmap updated: 2026-07-18 -- v1.2 phases 7-13 defined*
