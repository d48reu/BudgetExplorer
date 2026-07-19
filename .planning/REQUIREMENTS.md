# Requirements: Miami-Dade Budget Explorer — v1.2 FY 2026-27 Proposed Budget

**Defined:** 2026-07-18
**Core Value:** Residents can instantly see how their specific tax dollars fund county services — from the total budget down to individual departments — without reading a single PDF.
**Milestone Goal:** Ship a clearly-separated, diff-centric view of the Mayor's FY 2026-27 proposed budget before the September 3 and 17 budget hearings.

## v1.2 Requirements

### Stage-Aware Data Model

- [x] **DATA-01**: Budget stage (proposed/adopted/actual) is a first-class dimension replacing the `is_actual` boolean across `department_budgets`, `strategic_area_budgets`, `millage_rates`, `revenue_by_source`, `department_expenditures`, and `budget_descriptions` — with every existing page rendering byte-identical after the migration
- [ ] **DATA-02**: The seven FY 2026-27 Strategic Priorities exist in `strategic_areas` (5 new rows + reuse of Policy Formulation and Constitutional Offices), and area navigation is scoped by (fiscal year, stage) so old areas and new priorities never mix
- [ ] **DATA-03**: FY 2026-27 exists as a fiscal year with stage-scoped countywide totals (proposed totals retained when adopted totals land)
- [ ] **DATA-04**: Loading the adopted FY 2026-27 budget in September coexists with the proposed rows (stage-scoped deletes, verified by a dress-rehearsal load before the hearings)

### Extraction Pipeline

- [ ] **PIPE-01**: Pipeline extracts department operating budgets and positions from proposed Appendix A (paired FY 25-26/26-27 columns, "Strategic Priority:" headers, 16-number Department Total lines)
- [ ] **PIPE-02**: Pipeline extracts department capital budgets from proposed Appendix H (single-line rows, proposed year = column 2, wrapped department names)
- [ ] **PIPE-03**: Extracted FY 2026-27 totals are verified against the published proposed figures (~$14.26B total / ~$9.02B operating / ~$5.24B capital — exact values from the Budget in Brief) before any seeding
- [ ] **PIPE-04**: Department identity gate resolves renames/new/eliminated departments via `department_aliases`, warning loudly on any unrecognized header (never silently misattributing)
- [ ] **PIPE-05**: A department → old strategic area → new strategic priority crosswalk table is produced during extraction (handling the "Constitutional Office" typo)
- [ ] **PIPE-06**: Re-extraction is idempotent by (fiscal year, stage) and every proposed figure carries a visible "as of" date, so July→September proposal revisions are a re-run, not a rebuild
- [ ] **PIPE-07**: A reconciliation report compares Appendix A's restated FY 25-26 column against the adopted database, so baseline discrepancies are known before any diff renders

### Diff Computation

- [ ] **DIFF-01**: A single pure, Vitest-covered diff module computes all proposed-vs-adopted changes — BigInt-exact, summing multi-row department budgets per stage, with typed `new` / `eliminated` / `changed` cases (no division-by-zero on new departments)

### /proposed Section

- [ ] **PROP-01**: Every proposed figure site-wide carries a stage badge ("FY 2026-27 PROPOSED"), including page titles and OG images
- [ ] **PROP-02**: The /proposed section carries a persistent layout-level banner: not yet adopted, Commission votes Sept 3 & 17, figures as of the release date
- [ ] **PROP-03**: /proposed landing page presents the countywide topline comparison (adopted FY 25-26 vs proposed FY 26-27, operating/capital split)
- [ ] **PROP-04**: User can sort a "biggest increases / biggest cuts" movers table by dollar and percent change
- [ ] **PROP-05**: User can scan a diverging bar chart of department changes (cuts left, increases right) with data-table fallback
- [ ] **PROP-06**: User can view a per-department diff page showing proposed vs adopted ($ and % change) with stage-labeled context
- [ ] **PROP-07**: Adopted department pages cross-link to their proposed diff via a labeled callout — proposed numbers are never substituted inline on adopted pages
- [ ] **PROP-08**: Every proposed page links to its specific source PDFs (Appendix A/H, proposed Budget in Brief)

### Signature Visuals

- [ ] **VIZ-08**: User can explore a dollar-weighted Sankey explainer page showing the 9 Strategic Areas → 7 Strategic Priorities reorganization — flows balanced on a single year's dollars, annotated "same dollars, new categories", with data-table fallback

### Calculator

- [ ] **CALC-06**: User can compare their property tax bill under current vs proposed millage side-by-side in the existing calculator, matching the TRIM-notice framing they receive in August
- [ ] **CALC-07**: Calculator comparison copy is TRIM-safe: shows per-authority proposed rates and rolled-back context, and never claims "your taxes won't change" from flat millage alone

### AI Narratives

- [ ] **AI-05**: Every department diff page includes an AI-generated plain-English "what's changing" narrative, generated from the computed diff through the existing pre-generation + human review pipeline
- [ ] **AI-06**: Change narratives are regenerable per stage, so September's adopted figures produce refreshed narratives without pipeline changes

## v1.2.x Requirements (add during hearing season if time allows)

### Deferred

- **VIZ-09**: Countywide waterfall chart (adopted total → per-priority changes → proposed total) — movers table and diverging bars carry the same information; add before Sept 3 if schedule allows
- **PROP-09**: Hearing-season context module (what a hearing is, how to comment, TRIM notice explainer) + TRIM glossary entries — timed to the August TRIM mailing
- **PROP-10**: Position-count diffs alongside dollar diffs — pending confirmation that headcount extracts cleanly from Appendix A

## v1.3+ Requirements (after Sept 17 adoption)

- **DIFF-02**: "What changed at the hearings" proposed-vs-adopted diff once the adopted budget loads
- **PROP-11**: Archive strategy for /proposed after adoption (historical stage view, not deletion)
- Full FY 2026-27 site rollover (treemap, penny viz, revenue donut on adopted data)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Swapping proposed numbers into adopted pages (toggle or default) | The core confusion failure mode; 24h ISR caching makes it worse — separation is the requirement |
| Live amendment tracking during the Sept 3/17 hearings | Messy floor-action paper trails; high-stakes-wrong for a two-evening event; post-adoption diff covers it properly |
| Predicting what the Commission will adopt | Politically exposed for a commissioner's-office tool; forecasting already out of scope in PROJECT.md |
| Full proposed-mode clone of the v1.1 site | Doubles surface area before a hard deadline; the diff is the product |
| Line-item / sub-department proposed detail | Appendix A pairs are department-level; deeper extraction multiplies risk (the July audit's misattribution bug lived exactly here) |
| Public comment / testimony collection | Different product; county runs official channels; already out of scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 7 | Complete |
| DATA-02 | Phase 8 | Pending |
| DATA-03 | Phase 8 | Pending |
| DATA-04 | Phase 13 | Pending |
| PIPE-01 | Phase 8 | Pending |
| PIPE-02 | Phase 8 | Pending |
| PIPE-03 | Phase 8 | Pending |
| PIPE-04 | Phase 8 | Pending |
| PIPE-05 | Phase 8 | Pending |
| PIPE-06 | Phase 8 | Pending |
| PIPE-07 | Phase 8 | Pending |
| DIFF-01 | Phase 9 | Pending |
| PROP-01 | Phase 10 | Pending |
| PROP-02 | Phase 10 | Pending |
| PROP-03 | Phase 10 | Pending |
| PROP-04 | Phase 10 | Pending |
| PROP-05 | Phase 10 | Pending |
| PROP-06 | Phase 10 | Pending |
| PROP-07 | Phase 10 | Pending |
| PROP-08 | Phase 10 | Pending |
| VIZ-08 | Phase 11 | Pending |
| CALC-06 | Phase 12 | Pending |
| CALC-07 | Phase 12 | Pending |
| AI-05 | Phase 13 | Pending |
| AI-06 | Phase 13 | Pending |

**Coverage:**
- v1.2 requirements: 25 total (count corrected 2026-07-18 during roadmap creation; previous "24" was a miscount)
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-18*
*Last updated: 2026-07-18 after roadmap creation (traceability populated, count corrected to 25)*
