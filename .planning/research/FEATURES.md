# Feature Research: v1.2 FY 2026-27 Proposed Budget Section

**Domain:** Proposed-vs-adopted budget presentation for a civic transparency site (Miami-Dade Budget Explorer)
**Researched:** 2026-07-18
**Confidence:** MEDIUM-HIGH (patterns verified across multiple live government portals and vendor products; some user-expectation claims from journalism/domain inference)
**Scope:** NEW features only. v1.0/v1.1 shipped treemap explorer, department pages with AI descriptions and YoY charts, tax calculator, search, glossary, penny viz, revenue donut.

## How the Ecosystem Handles Proposed vs Adopted (Evidence Base)

Patterns observed across civic budget sites, verified 2026-07-18:

| Source | Pattern |
|--------|---------|
| **Seattle Open Budget / Council Budget Dashboard** | Every figure carries a stage label: "2025 Adopted," "2026 Endorsed," "Mayor's Proposed Adjustments to 2026." Stage is part of the dataset selector, never implied by year alone. |
| **Bakersfield Open Budget** | Each fiscal year exposes three explicit stages: Adopted / Amended / Actual. Stage is a first-class data dimension, matching this project's planned proposed/adopted/actual schema. |
| **NYC Council Budget Dashboards (launched Mar 2026)** | Lets users "compare changes at each stage of the budget cycle" (Preliminary → Executive → Adopted); dashboards updated with each Financial Plan release. Change-across-stages IS the product, not a footnote. |
| **OpenGov budget books (Killeen TX, Birmingham MI, etc.)** | Adopted budget books contain a dedicated "Changes from Proposed to Adopted Budget" / "Budget Adjustments" section — the diff between stages is a standard document section, and books are titled "PROPOSED" or "ADOPTED" in the document name itself. |
| **ClearGov** | Versions the budget as it moves baseline → proposed → adopted → amendments; each stage is a saved snapshot, not an overwrite. |
| **GFOA Distinguished Budget Presentation Award** | Governments may submit either the proposed or the adopted document — the two are treated as distinct artifacts. 2026 criteria expand the award to websites and dashboards as budget communications, judged as a "communication tool." |
| **Shelby County TN** | Publishes an explicit Proposed Budget Disclaimer: figures are "subject to change without notice" and represent a position "as of" a stated date. |
| **Florida TRIM process (statutory context)** | August TRIM notices show residents: proposed millage per taxing authority, the rolled-back rate, taxes owed *if adopted*, and hearing date/time. Proposed millage set in July is the legal *maximum* — hearings can lower it but not raise it. Residents arrive at the site already primed by TRIM framing. |
| **Newsroom convention (Axios, WaPo, Bridge Michigan)** | Proposed-budget coverage centers on "winners and losers": ranked departmental increases/cuts in dollars and percent, with a narrative sentence per big mover. |

**The consensus separation pattern — three reinforcing layers:**
1. **Label every number** with stage + year ("FY 2026-27 Proposed"), never a bare fiscal year during hearing season.
2. **Separate the surface** — distinct route/section/document for proposed, with its own visual identity; adopted views stay intact and link across, they don't swap numbers in place.
3. **Disclaim with a date** — a persistent "not yet adopted, subject to change at the Sept 3 and 17 hearings, as of [release date]" notice.

No major portal relies on a single layer alone. Sites that fail here (bare numbers in a generic dashboard) are exactly what generates "the county already passed this" confusion during hearing season.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stage badge on every proposed figure ("FY 2026-27 PROPOSED") | Universal pattern (Seattle, Bakersfield, OpenGov titles); prevents proposed being read as adopted | LOW | Reusable `<StageBadge>` component; render wherever a proposed number appears, including OG images and page `<title>` |
| Persistent proposed-status banner with hearing dates | Shelby County disclaimer pattern + Florida TRIM context; residents need "this is the Mayor's proposal — Commission votes Sept 3 & 17" | LOW | One layout-level banner in the `/proposed` section; include "as of July 2026 release" date stamp |
| Dedicated `/proposed` section (route separation, distinct accent identity) | OpenGov/ClearGov treat proposed as a separate artifact; mixing into adopted pages is the confusion failure mode | MEDIUM | Distinct accent color/treatment layered on existing design system — different enough to signal, same enough to feel like one site |
| Department-level diff: dollar change + percent change vs FY 2025-26 adopted | The first question every persona asks: "what changed for X?" NYC Council dashboards make stage-diff the core interaction | MEDIUM | Depends on stage-aware schema; must use `sumBudgetRows()` multi-row invariant — naive row diffs will be wrong. Show both $ and % (a $2M cut means different things to Police vs a small office) |
| Countywide topline comparison ($13.23B adopted → $14.26B proposed; operating vs capital split) | Every news story leads with the total; anchors the whole section | LOW | Verify $14.26B ($9.02B operating + $5.24B capital) against Budget in Brief in pipeline verification block before display |
| Sortable "biggest increases / biggest cuts" table | Newsroom winners-and-losers convention; journalists and staff scan for movers first | MEDIUM | Sort by $ and by %; this is also the natural index page for department diff pages |
| Calculator: current vs proposed millage side-by-side | Florida TRIM notices already show residents "taxes if proposed rates adopted" — the calculator must match that mental model | MEDIUM | Millage flat 4th year, so headline is "no rate change," but non-countywide authorities and rolled-back framing still matter; extends existing pure client-side tax-math module + Vitest tests |
| Source PDF links to the proposed release (Appendix A/H, Budget in Brief) | Existing site convention (footer PDF links); trust anchor is stronger for unadopted figures | LOW | Link the specific appendices, not just the landing page |
| Proposed data reachable from existing pages (cross-link, not replacement) | Users land on adopted department pages via search/SEO; they need a clearly-labeled path to "see what's proposed for this department" | LOW-MEDIUM | A labeled callout card on adopted department pages linking to the proposed diff — never inline substitution of numbers |
| Stage-aware data model (proposed/adopted/actual as first-class dimension) | Bakersfield/ClearGov pattern; makes September's adopted budget a data load, not a rebuild | MEDIUM | Extends `is_actual` boolean to a stage enum or new column; the single most important schema decision of the milestone |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dollar-weighted Sankey: 9 Strategic Areas → 7 Strategic Priorities | No off-the-shelf portal explains a mid-cycle reorganization; the crosswalk is the hardest thing for even staff to hold in their heads, and flow-width Sankeys are the proven idiom for money mapping (USAFacts) | HIGH | Needs a department→priority crosswalk table derived from Appendix A "Strategic Priority:" headers; d3-sankey fits existing D3 stack. Best as a one-time explainer page, with a data-table fallback per accessibility convention |
| AI "what's changing" narratives per department | Extends the site's signature plain-English AI descriptions to the diff itself; no government portal does this | MEDIUM | Reuses existing pre-generation pipeline + human review gate; prompt gets adopted and proposed rows plus computed diff. Must be regenerable when adopted figures land |
| Countywide waterfall chart (adopted total → per-priority changes → proposed total) | Explains *where* the ~$1B growth comes from in one graphic; the visual journalists screenshot | MEDIUM | D3; needs the crosswalk to express changes in consistent categories (compare at department level, roll up to new priorities) |
| Diverging bar chart of department changes (cuts left, increases right) | Fastest-scanning visual of the whole diff; standard news-graphic form | LOW-MEDIUM | Same data as the sortable table; D3 or Recharts horizontal bars |
| Hearing-season context module (Sept 3 & 17 dates, what a hearing is, how to comment, TRIM notice explainer) | Residents arrive via TRIM notices in August; connecting "your notice" to "this site" to "the hearing" is high civic value and nearly free | LOW | Static content + glossary entries (TRIM, rolled-back rate, millage cap). No calendar integration needed |
| Employee/position count diffs alongside dollars | Staff and journalists track headcount as closely as dollars; `employee_count` already exists in schema | LOW | Only if reliably extractable from the proposed release; degrade gracefully if not |
| "What happens next" stage timeline (Proposed → Hearings → Adopted) | Orients casual users in the process; sets up the September adopted-data moment | LOW | Static component; becomes "Adopted ✓" after September load |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Swapping proposed numbers into existing adopted pages (toggle or default) | "Just show the latest numbers" | The core confusion failure mode — cached pages, screenshots, and SEO snippets lose the stage context; ISR (24h) makes accidental staleness worse | Separate `/proposed` routes + labeled cross-link callouts on adopted pages |
| Live amendment tracking during the Sept 3/17 hearings | "Real-time transparency" | Amendments land as floor actions with messy paper trails; manual, error-prone, high-stakes-wrong for a two-evening event | Post-adoption: load the adopted budget as a new stage, then show a proposed-vs-adopted diff ("what changed at the hearings") — the OpenGov "Changes from Proposed to Adopted" section, done with data |
| Public comment / testimony collection or budget simulator | Engagement platforms (Balancing Act/Polco) do this | Different product: moderation, records, and the county already runs official channels; already out of scope in PROJECT.md | Hearing-season module links to official comment channels and hearing logistics |
| Predicting what the Commission will adopt | "What will actually pass?" | Politically exposed for a tool built by a commissioner's staffer; forecasting explicitly out of scope | Neutral framing: proposed figures, rolled-back rate, historical context; let numbers speak |
| Sankey as the primary navigation for the proposed section | The reorg diagram is the flashiest asset | Sankeys are poor exploration UIs (small flows unreadable, mobile-hostile); novelty chart ≠ daily driver | Sankey as a dedicated one-time explainer page; treemap/tables remain the navigation surface |
| Full proposed-budget clone of the entire v1.1 site (treemap, penny viz, revenue donut, search, all pages re-done for proposed) | "Parity between sections" | Doubles surface area weeks before a hard deadline; diff is the value, not a parallel universe | Diff-centric section: topline, movers table/charts, department diff pages, Sankey, calculator comparison. Full parity only after adoption, when proposed becomes history |
| Line-item / appendix-level proposed detail | Power users want everything | Appendix A pairs are department-level; deeper detail multiplies extraction risk under deadline (the audit's misattribution bug lived exactly here) | Department-level diffs verified against published totals; link the PDF appendices for line-item detail |

## Feature Dependencies

```
Stage-aware schema (proposed/adopted/actual)
    └──requires──> Appendix A/H extractors + FY 2026-27 verification block
                       └──requires──> Proposed-release PDFs (in hand, verified 2026-07-18)

Department diffs ──requires──> Stage-aware schema
    ├──feeds──> Sortable movers table ──feeds──> Diverging bar chart
    ├──feeds──> Department diff pages
    └──feeds──> AI "what's changing" narratives (also requires existing description pipeline)

9→7 crosswalk table (from Appendix A "Strategic Priority:" headers)
    ├──feeds──> Sankey explainer
    └──feeds──> Countywide waterfall (consistent categories)

Calculator comparison ──requires──> FY 2026-27 millage rows ──requires──> Stage-aware millage storage
Calculator comparison ──extends──> Existing pure client-side tax-math module + Vitest tests

StageBadge + status banner ──enhances──> every proposed surface (build first, apply everywhere)
Cross-link callouts ──requires──> Department diff pages to exist as link targets

September adopted load ──requires──> Stage-aware schema (the whole point: data load, not rebuild)
```

### Dependency Notes

- **Everything downstream of the schema:** the stage dimension must be designed before any UI work; it determines query shapes for all diffs and makes September a non-event.
- **Diffs must respect the multi-row invariant:** `department_budgets` is multi-row per (department, fiscal year); diffs computed per-row instead of per-summed-department will silently be wrong (2026-07 audit lesson).
- **Crosswalk blocks two features:** Sankey and waterfall both need the department→priority mapping; extract it during pipeline work, not as a viz-time afterthought. Note Appendix A's "Constitutional Office" typo when matching header strings.
- **AI narratives come last in the data chain:** they consume computed diffs, so they can't be generated until extraction + verification are green.
- **Labeling components conflict with nothing and unblock everything:** StageBadge/banner are trivial but must exist before the first proposed number renders anywhere.

## MVP Definition

### Launch With (v1.2 — before Sept 3 hearing)

- [ ] Proposed-release pipeline: Appendix A/H extractors, verification vs $14.26B/$9.02B/$5.24B published totals, 7 Strategic Priority rows, crosswalk table — nothing renders without trusted data
- [ ] Stage-aware schema — September depends on it; retrofitting later is a rebuild
- [ ] StageBadge + persistent status banner with hearing dates and "as of" stamp — the anti-confusion layer
- [ ] `/proposed` landing: topline comparison, sortable movers table, diverging bar chart
- [ ] Department diff pages ($ and % vs adopted, expenditure context) + labeled cross-link callouts from adopted department pages
- [ ] Calculator current-vs-proposed millage comparison — matches the TRIM notice residents receive in August
- [ ] Sankey 9→7 explainer page with data-table fallback — the milestone's signature differentiator and the reorg is *this* year's story
- [ ] AI "what's changing" narratives — signature site capability, pipeline already exists

### Add After Validation (v1.2.x — during hearing season)

- [ ] Countywide waterfall — high value but the movers table/bars carry the same information; add if time remains before Sept 3
- [ ] Hearing-season context module + TRIM glossary entries — cheap, timed to August TRIM mailing
- [ ] Position-count diffs — pending confirmation that headcount extracts cleanly from the proposed release

### Future Consideration (v1.3+ — after Sept 17 adoption)

- [ ] Adopted FY 2026-27 load + "proposed vs adopted: what changed at the hearings" diff — the OpenGov pattern; the stage schema makes this a data exercise
- [ ] Archive/redirect strategy for `/proposed` once adopted (proposed becomes a historical stage, not deleted)
- [ ] Full FY 2026-27 site rollover (treemap, penny viz, revenue donut on adopted 2026-27 data)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Pipeline + verification + stage schema | HIGH (everything) | HIGH | P1 |
| StageBadge + status banner | HIGH | LOW | P1 |
| /proposed landing + movers table + diverging bars | HIGH | MEDIUM | P1 |
| Department diff pages + cross-links | HIGH | MEDIUM | P1 |
| Calculator millage comparison | HIGH | MEDIUM | P1 |
| Sankey 9→7 explainer | HIGH | HIGH | P1 |
| AI change narratives | HIGH | MEDIUM | P1 |
| Countywide waterfall | MEDIUM | MEDIUM | P2 |
| Hearing context module + TRIM glossary | MEDIUM | LOW | P2 |
| Position-count diffs | MEDIUM | LOW-MEDIUM | P2 |
| Proposed-vs-adopted hearing diff (post-Sept) | HIGH (later) | LOW (given schema) | P3 |

## Competitor Feature Analysis

| Feature | Seattle Open Budget / Council | NYC Council Dashboards | OpenGov/ClearGov books | Our Approach |
|---------|------------------------------|------------------------|------------------------|--------------|
| Stage labeling | Stage in every dataset name (Adopted/Endorsed/Proposed) | Stage as compare dimension | Stage in document title + saved versions | StageBadge component on every figure + route separation + banner |
| Proposed-vs-adopted diff | Side-by-side dashboards | "Compare changes at each stage" | Static "Changes from Proposed to Adopted" section | Interactive per-department diffs, movers table, diverging bars — diff as the section's core |
| Reorg explanation | N/A | N/A | Narrative text only | Dollar-weighted Sankey crosswalk (unique) |
| Taxpayer impact | None | None | None | Calculator current-vs-proposed millage, aligned to Florida TRIM notices (unique) |
| Plain-English change narratives | None | None | Manager's message (manual) | AI-generated, human-reviewed, per department (unique) |
| Disclaimer/status | Implicit in labels | Implicit | Title page | Explicit banner: not adopted, hearing dates, as-of date |

## Sources

- [Seattle Open Budget portal](https://openbudget.seattle.gov/) and [Seattle Council Budget Dashboard](https://www.seattle.gov/council/topics/budget-dashboard) — stage-labeled datasets (adopted/endorsed/proposed adjustments) — HIGH confidence
- [Bakersfield Open Budget](https://budget.bakersfieldcity.us/) — adopted/amended/actual stage model per fiscal year — HIGH confidence
- [NYC Council Budget Dashboards press release, Mar 2026](https://council.nyc.gov/press/2026/03/25/3092/) — compare-across-stages as core feature (fetched directly) — HIGH confidence
- [OpenGov Budget Book](https://opengov.com/products/budgeting-and-planning/budget-book/) + live examples ([Killeen TX FY26 Adopted](https://stories.opengov.com/killeentx/2a9215df-4f46-42d3-ac37-8c382b8de11d/published/E8BoXfiBz), [Birmingham MI](https://stories.opengov.com/birminghammi/30265211-51e6-4116-b30d-8ba1b620b5f3/published/9HuuQTzGb)) — "Changes from Proposed to Adopted" sections — MEDIUM-HIGH confidence
- [ClearGov operational budgeting](https://cleargov.com/products/operational-budgeting) — stage versioning baseline→adoption→amendments — MEDIUM confidence
- [GFOA Distinguished Budget Presentation Award](https://www.gfoa.org/budget-award) and [2026 program changes](https://www.gfoa.org/budget-award-2026) — proposed vs adopted as distinct submittable artifacts; 2026 criteria include websites/dashboards — HIGH confidence
- [Shelby County TN Proposed Budget Disclaimer](https://www.shelbycountytn.gov/3337/Proposed-Budget-Disclaimer) — "subject to change without notice," as-of dating (fetched directly) — HIGH confidence
- Florida TRIM: [FL DOR millage guide](https://floridarevenue.com/property/Documents/homeowner_guide_millage.pdf), [Manatee PAO TRIM notices](https://www.manateepao.gov/trim-notices/), [Collier Clerk on proposed millage as maximum](https://www.collierclerk.com/board-of-county-commissioners-adopts-proposed-millage-rates-as-maximum-property-tax-rates/), [Florida TaxWatch rolled-back analysis](https://floridataxwatch.org/ftw-document/2423/) — HIGH confidence
- Miami-Dade FY 2026-27 proposed: [$14.26B, flat millage, Sept hearings, Aug town halls](https://www.caribbeannationalweekly.com/posts/miami-dade-mayor-proposes-142-billion-fy2026-27-budget-keeps-county-tax-rate-unchanged); [Axios recap of FY 2025-26 adoption cycle](https://www.axios.com/local/miami/2025/09/22/miami-dade-2026-budget-what-was-approved) — MEDIUM confidence (news figures; verify against county Budget in Brief in pipeline)
- Winners-and-losers journalism convention: [Axios](https://www.axios.com/2025/05/02/trumps-budget-winners-losers), [Washington Post DC 2026 budget](https://www.washingtonpost.com/dc-md-va/2025/07/30/dc-budget-winners-and-losers/), [Bridge Michigan](https://bridgemi.com/michigan-government/here-are-winners-and-losers-michigans-new-budget/), [Texas Tribune budget topic hub](https://www.texastribune.org/topics/budget/) — MEDIUM confidence
- Sankey-for-budget precedent: [USAFacts government spending Sankey](https://usafacts.org/articles/this-chart-tells-you-everything-you-want-to-know-about-government-spending/) — MEDIUM confidence
- Internal: `.planning/PROJECT.md` (FY 2026-27 release format verified 2026-07-18; audit invariants), `CLAUDE.md` data model invariants — HIGH confidence

---
*Feature research for: proposed-vs-adopted budget presentation, Miami-Dade Budget Explorer v1.2*
*Researched: 2026-07-18*
