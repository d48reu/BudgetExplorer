# Pitfalls Research

**Domain:** Adding a proposed budget year (FY 2026-27) with cross-taxonomy diffs to a live civic budget transparency site (Miami-Dade Budget Explorer v1.2)
**Researched:** 2026-07-18
**Confidence:** HIGH for system-specific and Florida-process pitfalls (verified against PROJECT.md 2026-07 audit invariants, Fla. Stat. 200.065, and the published FY 2026-27 proposal); MEDIUM for visualization and AI-narrative pitfalls (viz community sources + domain judgment)

**Context anchors (verified 2026-07-18):**
- FY 2026-27 proposed: **$14.26B total = $9.02B operating + $5.24B capital**, presented July 15, 2026, operating millage flat for a fourth year. FY 2025-26 adopted in the DB: $13.23B = $8.58B + $4.66B.
- TRIM sequence (Fla. Stat. 200.065): taxable value certified July 1 → taxing authority certifies proposed millage within 35 days (~Aug 4) → that rate becomes a **ceiling** → TRIM notices mailed late August → September hearings (Sept 3 and 17 for Miami-Dade) can **lower but not raise** the rate without re-noticing.
- Existing invariants that must survive this milestone: `department_budgets` is multi-row per (department, year) — always `sumBudgetRows()`; area membership = `COALESCE(db.strategic_area_id, d.strategic_area_id)`; formatters take **cents**; extractors are state machines that must warn loudly on unrecognized headers.

## Critical Pitfalls

### Pitfall 1: "Latest fiscal year" queries silently absorb proposed rows

**What goes wrong:**
The moment FY 2026-27 rows are loaded, every existing query that selects "the current/max fiscal year" (homepage $13.2B hero, treemap, YoY charts, department stat cards, search index budgets) starts returning proposed numbers — unlabeled — on pages that present themselves as the adopted budget. The live site's headline number changes overnight from a data load.

**Why it happens:**
The schema currently encodes stage implicitly (`is_actual` boolean: actuals true for FY21-24, adopted false for FY24-26). Adding proposed data as just "another fiscal year with is_actual = false" makes it indistinguishable from adopted. `is_actual` is already documented as a tricky two-state hack; a third state cannot ride on a boolean.

**How to avoid:**
- Add an explicit `stage` dimension (enum or table: `proposed` / `adopted` / `actual`) **before** any FY 2026-27 data is loaded — this is also what makes September's adopted budget "a data load, not a rebuild" (an Active requirement).
- Audit every query in `queries.ts` and every raw SQL view (migration 003) and make stage an explicit filter, not a default. Grep for every `fiscal_year` ordering/max.
- Load FY 2026-27 into a non-production database first; snapshot the rendered numbers on all existing pages before/after and diff them. Zero adopted-page numbers may change.

**Warning signs:**
Homepage hero shows $14.26B; any existing page's number changes after the proposed load; a query filters `is_actual = false` and returns two rows per department per year.

**Phase to address:**
Schema/stage-modeling phase — must be the first phase, gating all data loading. Verification: post-load snapshot diff of all v1.1 pages shows zero changes.

---

### Pitfall 2: Two versions of FY 2025-26 exist, and diffs mix them

**What goes wrong:**
Appendix A of the proposed release prints paired FY 25-26 / FY 26-27 columns. That FY 25-26 column is the county's restated prior year under the **new** 7-priority organization (and sometimes reflects mid-year reorganizations), and it will not match, department by department, the adopted FY 25-26 numbers already in the DB (which include Appendix J capital rows and 9-area slicing). A diff computed as "proposed-PDF FY26-27 column minus DB adopted total" mixes operating-only against operating+capital and restated against original — producing changes that are artifacts of accounting, not policy. On a credibility-first site run from a commissioner's office, one provably-wrong diff discredits every diff.

**Why it happens:**
Both baselines are legitimately "FY 2025-26." The PDF's paired columns are seductive — extracting both from one table is easy and self-consistent, so the extractor's numbers reconcile internally while contradicting the live site's adopted pages.

**How to avoid:**
- Extract **both** columns from Appendix A and store the restated prior-year column as its own dataset (e.g., stage = adopted, source = proposed-release-restatement) rather than discarding or overwriting.
- Decide and document a single diff baseline. Recommended: diff **within the proposed release's own paired columns** (operating, Appendix A) so both sides share taxonomy and scope, and separately diff capital within Appendix H. Never diff Appendix A operating against a DB total that includes capital.
- Add a reconciliation report to the pipeline: restated FY 25-26 column vs. DB adopted FY 25-26, per department, with every discrepancy explained (reorg, capital scope, rename) or flagged.
- Label every diff on-site with its scope: "operating budget change" vs "total budget change."

**Warning signs:**
A department's "no change" in the PDF shows a change on the site; countywide diff total doesn't equal $14.26B − $13.23B decomposed by scope; the same department shows different FY 25-26 numbers on its adopted page and its diff page with no explanation.

**Phase to address:**
Extraction-pipeline phase (store both columns, reconciliation report) + diff-computation phase (baseline decision codified in one module). Verification: reconciliation report has zero unexplained discrepancies.

---

### Pitfall 3: Double-counting multi-area departments in cross-year diffs

**What goes wrong:**
`department_budgets` is multi-row per (department, fiscal year) — one row per strategic area plus capital-only rows. A naive year-over-year join produces a cartesian product (N rows × M rows), inflating diffs; or code diffs row-by-row across years where the slicing no longer corresponds because the taxonomy changed (a department split across 2 of the 9 areas may sit in 1 of the 7 priorities). This was the root cause family of the worst 2026-07 audit bugs; the diff feature multiplies the exposure by touching two years at once.

**Why it happens:**
Row-level joins are the natural Prisma/SQL instinct; the multi-row invariant is documented but easy to forget in new code, and the 9→7 reorg guarantees row slices don't line up across years.

**How to avoid:**
- All dollar/percent diffs computed at **department-total level only**: `sumBudgetRows(FY26-27 proposed) − sumBudgetRows(FY25-26 baseline)`. One shared diff function, unit-tested, used everywhere (pages, search index, narratives).
- Ban area-level cross-year diffs outright — a 9-area number vs a 7-priority number is category-invalid. The Sankey crosswalk is the only cross-taxonomy view; enforce this in code review.
- Countywide invariant test: sum of department diffs (per scope) must equal the countywide diff (per scope) to the cent.

**Warning signs:**
Sum of department changes ≠ countywide change; any new query joining `department_budgets` to itself across years without pre-aggregation; a diff appearing for an area rather than a department.

**Phase to address:**
Diff-computation phase. Verification: cent-exact roll-up test in Vitest + pipeline `verify` block.

---

### Pitfall 4: Percent change on zero/absent baselines (and BigInt division traps)

**What goes wrong:**
New departments, programs zeroed out last year, or capital lines appearing for the first time yield division by zero. In JS BigInt, `x / 0n` **throws RangeError** — one unhandled new department crashes the diff page at build time (static generation means the whole build fails). Conversely, tiny baselines produce absurd percentages (+38,000%) that dominate any "biggest changes" sort. BigInt integer division also silently truncates percents toward zero unless scaled (`(delta * 10000n) / base` then format).

**Why it happens:**
FY 25-26 data is complete, so zero-baseline cases don't exist until the new year introduces them; percent math gets written against the happy path.

**How to avoid:**
- One `computeDiff(base, proposed)` pure module (mirroring the tax-math module pattern) returning a discriminated union: `{kind: 'new'} | {kind: 'eliminated'} | {kind: 'change', deltaCents, pctBasisPoints}`. Unit-test zero, negative, and BigInt-truncation cases before any UI work.
- Display "New" / "Eliminated" badges, never a percent, for those cases; cap or bucket extreme percents in sorted views ("biggest movers" ranked by dollars, not percent).
- Keep everything cents-in/cents-out per the formatter invariant; never convert to Number for the division (truncation and NaN are the risks here).

**Warning signs:**
`RangeError: Division by zero` in build logs; Infinity/NaN anywhere; a sub-$100K department topping the change chart at +4,000%.

**Phase to address:**
Diff-computation phase, first task. Verification: Vitest suite covering zero-baseline, eliminated, sign, and rounding cases.

---

### Pitfall 5: Renamed/merged departments read as fake "new" and "eliminated" entries

**What goes wrong:**
The county renames departments and reshuffles them between releases (already observed; the audit note says they "WILL rename departments and appendix letters again"). Without identity resolution, a renamed department appears as −100% (eliminated) next to a +100% (new) twin — a factually wrong and politically explosive pair of claims ("the Mayor eliminated X!"). Merges/splits are worse: dollars appear to vanish or materialize.

**Why it happens:**
Extractors match on header text; the `department_aliases` table exists but only helps if the pipeline actually routes new names through it, and nobody re-checks the alias table when a new PDF lands.

**How to avoid:**
- Pipeline step: after extraction, diff the department name set against known names + aliases. **Every** unmatched name is a hard warning requiring a human decision (alias, genuinely new, merge, split) before load — extending the existing loud-warning state-machine invariant from headers to identities.
- Model merges/splits explicitly (e.g., a crosswalk note on the department), and render them as "Reorganized — see X" rather than new/eliminated.
- Keep the "Constitutional Office" (county typo for "Constitutional Offices") mapping in the alias/normalization layer, not as an inline string patch.

**Warning signs:**
Matched-department count ≠ expected; any auto-created department during load; a new/eliminated pair with similar dollar magnitudes.

**Phase to address:**
Extraction-pipeline phase (identity gate) + diff-computation phase (merge/split rendering). Verification: load aborts on unresolved names; manual review artifact committed with each extraction.

---

### Pitfall 6: Proposed numbers escape their context and get cited as fact

**What goes wrong:**
A `/proposed` page ranks in Google for "Miami-Dade [department] budget," gets screenshotted, quoted in an email blast, or read aloud at a commission meeting — presented as the county's actual budget. Full-text search returns proposed and adopted results interleaved with identical styling. OG images shared on social omit the PROPOSED label entirely. For a site run by a commissioner's office employee, being the source of a misquoted number is the worst-case outcome; the Active requirement explicitly demands a section "that cannot be mistaken for adopted figures."

**Why it happens:**
Labeling gets applied to page headers but not to every surface a number can escape through: OG images, search snippets/`<title>`, search-index rows, chart alt-text/data tables, AI narratives, JSON responses.

**How to avoid:**
- Distinct visual identity for `/proposed` (different accent treatment, persistent banner) — already planned; extend it to a checklist of escape surfaces: page `<title>` prefix ("PROPOSED —"), meta description, OG image template with a baked-in PROPOSED badge, search-index rows carrying and rendering a stage label, data-table captions, chart alt text.
- Stage watermark rule: any component that formats a proposed figure receives stage explicitly; no component defaults to unlabeled.
- Add "as of [date]; subject to change through the Sept 17 final hearing" to every proposed page footer, alongside the existing source-PDF link (to the proposed release, not the adopted one).
- After September, `/proposed` pages should persist as a labeled historical artifact ("superseded by adopted") rather than 404 or silently morphing.

**Warning signs:**
An OG image preview with no PROPOSED marking; a search result for a department showing two look-alike entries; any page mixing proposed and adopted figures in one chart without a legend distinguishing them.

**Phase to address:**
`/proposed` UI phase, with an explicit "escape surfaces" checklist in the phase's success criteria. Verification: manual audit of share previews, search results, and screenshots of every proposed template.

---

### Pitfall 7: The 9→7 Sankey reads as money moving instead of labels changing

**What goes wrong:**
Viewers read Sankey flows as transfers over time — "they took money from Public Safety and gave it to Resilience" — when the crosswalk is a **reclassification of the same dollars**. Compounding it: if the left side is FY 25-26 dollars ($13.2B) and the right side is FY 26-27 dollars ($14.3B), the sides don't balance, and the diagram reads as $1B appearing from nowhere (or worse, disappearing, prompting "where did the money go?"). Standard Sankey failure modes stack on top: non-proportional widths, default node ordering causing chaotic crossings, dozens of hairline flows (35+ departments × splits), and color reuse implying false groupings.

**Why it happens:**
Sankeys inherently encode flow/causality; a taxonomy crosswalk is the one thing they're most misread on. And "dollar-weighted" forces a choice of *which* dollars that's easy to fumble.

**How to avoid:**
- Weight the Sankey with **one year's dollars on both sides** — recommended: FY 26-27 proposed dollars, shown as "where FY 26-27 proposed dollars would have sat under the old 9 areas → where they sit under the new 7 priorities." Both sides then sum to the same total; a reconciliation test enforces it to the cent.
- Title and annotate as reorganization, not movement: "Same dollars, new categories." No arrowheads; consider labeling flows only above a threshold and bundling the rest as "other."
- Handle multi-area departments correctly in crosswalk weights: a department's 9-area slices (COALESCE membership) map individually, not the department's home area — otherwise the left side won't match the existing area pages.
- Order nodes to minimize crossings (largest-flow alignment, not alphabetical); provide the accessibility data-table fallback (existing VIZ-07 pattern) as a crosswalk matrix.
- Do not put diff/growth information in the Sankey — that's the diverging bar chart and waterfall's job. One idea per chart.

**Warning signs:**
Left total ≠ right total; user-testing feedback using verbs like "moved/cut/took"; more than ~40 visible links; a flow whose width was eyeballed rather than scaled.

**Phase to address:**
Sankey/visualization phase, preceded by the crosswalk data decision in the diff-computation phase. Verification: balance test (both sides sum equal), plus a caption review pass.

---

### Pitfall 8: Diff colors moralize the numbers (green = good, red = bad)

**What goes wrong:**
Green increases / red decreases tells residents that funding growth is inherently good and cuts inherently bad — an editorial stance a commissioner-office-adjacent site cannot take (is a smaller administration budget "bad"? is a bigger one "good"?). The brand palette (green #00A651, red #EF4444) makes this the path of least resistance. Red/green is also the most common colorblind-hostile pairing.

**Why it happens:**
Financial-dashboard convention (stock tickers) leaks into civic context; Recharts/D3 examples default to it.

**How to avoid:**
- Direction-neutral diverging encoding: brand blue #0057B8 for increases vs orange #F7941D for decreases (both already brand colors, colorblind-distinguishable), with explicit +/− signs and both $ and % always shown. Legend says "increase/decrease," never styled as success/error.
- Reserve red for errors/warnings site-wide, consistent with UI convention.
- Same rule in AI narratives: "increased/decreased," never "improved/slashed/gutted/boosted."

**Warning signs:**
Any diff component importing the semantic success/danger color tokens; a screenshot where the change chart looks like a stock portfolio.

**Phase to address:**
`/proposed` UI phase (design tokens decided before the first chart). Verification: visual review + narrative style-lint pass.

---

### Pitfall 9: AI change narratives editorialize or hallucinate causes for political numbers

**What goes wrong:**
Claude, asked to explain a department's change, invents causality ("due to the Mayor's public-safety commitment," "reflecting cuts to social programs"), adopts loaded verbs, or states proposed figures as decided fact. Narratives about a live political document — published under the name of a commissioner's office employee, during hearing season — get quoted. One hallucinated rationale is a credibility and workplace incident, not a bug.

**Why it happens:**
LLMs pattern-match budget-news prose, which is causal and editorial by nature. The existing description pipeline mitigated this for static descriptions, but *change* narratives invite explanation, which invites invention.

**How to avoid:**
- Keep the proven v1.1 pattern: pre-generated by the pipeline, batch with a **mandatory human review gate**, never runtime. Do not relax the review gate for schedule pressure — this is the one artifact where review is the feature.
- Constrain the prompt to numbers-only grounding: input is the structured diff (dollars, percent, scope, new/eliminated flags, revenue-source group changes from Appendix A's 8 groups) plus verbatim PDF highlight text if used; instruct "describe what changed; do not explain why unless the source document states a reason, and then attribute it: 'the proposal states…'."
- Style contract enforced by a lint pass over generated text: banned-word list (slash, gut, boost, generous, bloated, finally, etc.), required "proposed" qualifier, no future-tense certainty ("will fund" → "would fund").
- Treat PDF-extracted text fed into prompts as untrusted input (prompt-injection hygiene), even though the source is a county PDF.

**Warning signs:**
Any narrative containing a causal clause not present in the source PDF; reviewer approving batches without edits (suggests rubber-stamping); narratives generated after a data revision without regeneration.

**Phase to address:**
AI-narratives phase (last content phase, after diffs are frozen-ish). Verification: 100% of narratives human-reviewed and diffed against banned-word lint; spot-check against source PDF pages.

---

### Pitfall 10: Treating the July proposal as static — it revises through September 17

**What goes wrong:**
The Mayor's July 15 proposal is amended via change memos before the first (Sept 3) and final (Sept 17) hearings; departments' numbers, and occasionally the millage, shift. A site extracted once in July drifts wrong for two months at exactly the moment (hearing season) traffic and scrutiny peak. Then the adopted budget lands and, without the stage model, requires a schema scramble in the busiest week.

**Why it happens:**
The pipeline was built for annual adopted budgets — one extraction per year. "Proposed" is a moving target, which is a new operational mode, not just a new dataset.

**How to avoid:**
- Design the pipeline for **re-extraction**: idempotent delete+insert by (fiscal year, stage) within a transaction (existing seeder pattern already supports this), a `data_as_of` date stored and displayed on every proposed page, and the verification block re-run against the *revised* published totals each time.
- Calendar the known checkpoints now: post-Aug 4 millage certification, pre-Sept 3 change memo, post-Sept 3, post-Sept 17 adoption. Each is a re-run, not a code change.
- The adopted load in September must be exercised in advance: dress-rehearse by loading the proposed data as stage=adopted into a scratch DB and confirming the adopted pages render — proving "September is a data load."
- Remember the post-load runbook from CLAUDE.md: refresh `search_index` materialized view + trigger Vercel redeploy (24h ISR means stale proposed numbers otherwise — deadly during hearing week).

**Warning signs:**
Site totals disagree with the latest change memo; no `data_as_of` on a proposed page; anyone proposing schema edits in September.

**Phase to address:**
Extraction-pipeline phase (re-runnable design) + a process checklist owned outside any code phase. Verification: two consecutive re-extractions produce a clean verify pass and correct `data_as_of`.

---

### Pitfall 11: Conflating proposed millage, TRIM ceiling, rolled-back rate, and "no tax increase"

**What goes wrong:**
The calculator's "current vs proposed" comparison implies the proposed rate is (a) final and (b) the whole story. Neither is true: the rate certified ~Aug 4 for TRIM notices is a **ceiling** — the September hearings can lower it but cannot raise it without costly re-noticing (Fla. Stat. 200.065). And a *flat* millage rate still raises most homeowners' bills because assessed values grow (Save Our Homes caps assessment growth at 3%/CPI, but growth is growth); the statutory "no tax increase" benchmark is the **rolled-back rate**, not last year's rate. A calculator that shows "your bill: unchanged" under a flat rate, or that presents the July rate as the tax bill, will be contradicted by residents' actual TRIM notices in late August — instant credibility damage.

**Why it happens:**
"Millage rate unchanged for the fourth year" is the county's own headline; it's natural to mirror it. The TRIM machinery (rolled-back rate, ceiling semantics, per-authority rates) is genuinely obscure.

**How to avoid:**
- Model millage with the same stage dimension as budgets: current adopted (9.5778 total county), proposed (July), TRIM-certified ceiling (after ~Aug 4), adopted (after Sept 17). Show the comparison as "current vs proposed," clearly dated, with a plain-English note: "The proposed rate is a maximum — commissioners can lower it at the September hearings but not raise it."
- Calculator disclaimer that the user-entered property value is theirs, but actual bills depend on the assessed value on their TRIM notice (mailed late August) and include other authorities (school board, cities) with their own TRIM rates.
- Add a glossary entry (existing BudgetTerm pattern) for rolled-back rate and TRIM; avoid the phrase "no tax increase" anywhere unless comparing to the rolled-back rate.
- Only county-controlled rates in the county comparison; don't imply the county proposal changes school/municipal lines.

**Warning signs:**
Copy saying "your taxes won't change"; a single undated "proposed millage" field in the schema; user reports that the calculator disagrees with their TRIM notice.

**Phase to address:**
Calculator phase, after the stage model exists. Verification: tax-math Vitest cases for each rate stage; copy review against Fla. Stat. 200.065 semantics; re-check after Aug 4 certification.

---

### Pitfall 12: Thousands-to-cents unit slips in the new extractors

**What goes wrong:**
Budget PDFs publish figures in thousands of dollars; the DB stores BigInt cents (×100,000 from published units). Two brand-new extractors (proposed Appendix A with 16 numbers per Department Total line and 8 revenue-source groups; Appendix H with 9 numbers per line and mid-line name wraps) are two fresh chances to be off by 10x/100x/1000x on some column — and diffs *amplify* unit errors into spectacular fake changes. Appendix letters not matching the adopted release (adopted C/J ≠ proposed C/J) invites copy-pasting the wrong extractor as a starting point.

**Why it happens:**
Column-position parsing against wrapped lines and paired-year columns is fiddly; the verification block only catches unit errors if it checks at the right granularity.

**How to avoid:**
- Extend the pipeline `verify` step to the proposed release before any UI work: countywide total ($14.26B), operating ($9.02B), capital ($5.24B), per-priority subtotals (7 rows), and a sample of hand-checked department lines from both appendices, all to the cent.
- Property-style sanity checks in the extractor: every Department Total's 16 numbers internally consistent (revenue groups sum to total); FY 25-26 paired column within tolerance of known adopted values (also feeds Pitfall 2's reconciliation).
- Build Appendix H's wrap-handling with test fixtures from the preserved 2026-07-18 sample PDFs; keep the loud-warning state machine (unrecognized ALL-CAPS header ⇒ warn + close block, never inherit) — the silent-inheritance bug was the audit's worst finding.

**Warning signs:**
A department diff of ±99.9% or ±1000x; verify passing at countywide but never run per-priority; extractor logs with zero warnings on a first-ever run against a new format (suspicious, not reassuring).

**Phase to address:**
Extraction-pipeline phase. Verification: verify block green at all three granularities + fixture tests for wraps/headers.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Encode "proposed" by reusing `is_actual` or a magic fiscal-year flag | No migration | Three-state boolean hell; September adopted load becomes a rebuild; every query grows special cases | Never |
| Reuse `/department/[slug]` pages with a `?stage=proposed` param instead of a distinct `/proposed` section | Less UI work | Proposed/adopted visually identical ⇒ violates the "cannot be mistaken" requirement; SEO/OG ambiguity | Never for this project |
| Copy-paste the adopted Appendix extractor and tweak | Fast start | Appendix letters/format differ between releases; silent misparse (the audit's worst bug class) | Only as a scratch spike, never merged |
| Hardcode the 7 priority names/colors in frontend components | Ship the Sankey faster | County typo ("Constitutional Office") and future renames require code deploys, not data loads | Acceptable for launch **only** if names come from one constants module fed by DB seed |
| Skip re-extraction support ("we'll just re-run manually in September") | Less pipeline work | Change memos in Aug/Sept require repeated loads under time pressure; manual = error-prone during hearing week | Never — re-runnability is a milestone requirement |
| Diff at render time in each page component | No shared module | Divergent math (one page sums rows, another doesn't); untestable | Never — one tested diff module |
| Generate AI narratives once and never regenerate after data revisions | Saves API cost/review time | Narratives describing stale numbers — worse than no narrative | Never; regeneration is triggered by any proposed reload |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Proposed-release PDFs (Appendix A) | Trusting appendix letters from the adopted release; missing the "Constitutional Office" (sic) header | Extractors keyed to the *proposed* release layout; typo handled in the alias/normalization layer; unrecognized headers warn + close block |
| Proposed-release PDFs (Appendix H) | Assuming one line = one record; long department names wrap mid-line | Wrap-aware line assembly with fixtures from the preserved sample PDFs; proposed year = column 2 |
| Neon + search_index | Loading proposed data, forgetting `REFRESH MATERIALIZED VIEW search_index` | Post-load runbook: refresh MV, then Vercel redeploy (24h ISR otherwise serves stale HTML) |
| Vercel static generation | Assuming a DB load updates the site | Every proposed data revision ends with a redeploy trigger; verify a page's `data_as_of` after deploy |
| Claude API (narratives) | Runtime generation, or prompts letting the model infer motive | Pre-generated batch + human review gate; numbers-grounded prompts; banned-word lint |
| Prisma/BigInt | Serializing BigInt diffs to client components without `.toString()`; dividing by `0n` | Serialize at the query boundary (existing pattern); diff module handles zero baselines as typed cases |
| Millage data | One flat `millage_rates` row per year | Stage-aware millage (adopted / proposed / TRIM-certified / final) with effective dates |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sankey with per-department links (35+ depts × area splits × 7 priorities) | Hairline unreadable flows; slow D3 layout; mobile chaos | Aggregate links at area→priority level (≤ 9×7 = 63 max, realistically ~15-20); departments in tooltip/table only | >~40 visible links |
| Computing diffs per-request in server components | Slow TTFB on diff pages | Static generation with daily ISR (existing pattern); diffs are annual data | Not a scale issue — a consistency issue |
| Rebuilding all static pages on every data revision | Long builds during hearing week | Fine at 53 depts × 2 stages; keep build under control by not adding per-line-item pages | >~500 static pages |
| Search MV growth with stage-duplicated rows | Duplicate-looking results | Stage column in MV + label in result UI; GIN index already in place | Not a perf risk at this size — a UX risk |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Feeding raw PDF-extracted text into Claude prompts unsanitized | Prompt injection shaping political narratives (low likelihood, catastrophic optics) | Treat extracted text as data, structured-diff grounding, human review gate catches anomalies |
| Running pipeline against prod (`DATABASE_URL_PROD`) casually during frequent proposed reloads | Accidental prod overwrite mid-hearing-season; leaked connection string | Existing rule: explicit export, direct (non-pooler) endpoint for migrations, never committed; add a confirmation prompt for stage=proposed prod loads |
| Publishing draft/unreviewed narratives via a stray seed | Unvetted AI text live on a political site | Reviewed-descriptions JSON gate (existing `seed_descriptions` pattern) is the only path to prod |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Percent-only "biggest changes" ranking | Tiny departments with huge % dominate; residents miss the real money | Rank by absolute dollars; show % as secondary; "New"/"Eliminated" badges instead of ∞% |
| Proposed/adopted toggle on one page | Users lose track of which mode they're in; screenshots ambiguous | Separate `/proposed` section with persistent banner; cross-links, not toggles |
| Sankey as the primary diff view | Users read reclassification as cuts/transfers | Sankey answers only "how do the categories map"; diverging bars + waterfall answer "what changed" |
| Red/green diff colors | Value judgment + colorblind failure | Blue/orange diverging (brand colors), signs and labels carry the meaning |
| "Your taxes won't change" framing from flat millage | Contradicted by residents' actual TRIM notices in late August | Rate vs bill distinction; rolled-back-rate glossary term; dated disclaimers |
| Mobile Sankey | Unreadable on 375px | Vertical/simplified mobile variant or table-first on small screens (data-table fallback already required) |
| Diff pages with no "as of" date | Users cite stale pre-revision numbers | `data_as_of` visible on every proposed surface |

## "Looks Done But Isn't" Checklist

- [ ] **Stage model:** Often missing stage filters on *pre-existing* queries — verify every v1.1 page renders identical numbers after the proposed load (snapshot diff).
- [ ] **Verification block:** Often only countywide — verify per-priority (7 rows) and sampled department lines against the published PDF, both appendices, to the cent.
- [ ] **Diff module:** Often missing zero-baseline/eliminated/merged cases — verify Vitest covers `0n` baselines, sign, truncation, and that dept diffs roll up to the countywide diff exactly.
- [ ] **Department identity:** Often missing alias routing for renamed departments — verify the load aborts (not warns-and-continues) on unresolved names, and "Constitutional Office" maps correctly.
- [ ] **Sankey:** Often missing the balance invariant — verify left total = right total to the cent, node order is deliberate, data-table crosswalk fallback exists.
- [ ] **PROPOSED labeling:** Often missing on escape surfaces — verify OG images, `<title>`, meta descriptions, search results, chart alt text, and data-table captions all carry the label.
- [ ] **Search:** Often missing MV refresh + stage labels — verify a search for a department shows distinguishable proposed vs adopted entries post-deploy.
- [ ] **Calculator:** Often missing the ceiling/rolled-back nuance — verify copy states the proposed rate can drop but not rise, and never claims "no tax increase."
- [ ] **Re-extraction:** Often untested until the first change memo — verify two consecutive full pipeline runs are idempotent and update `data_as_of`.
- [ ] **September readiness:** Often asserted, never rehearsed — verify a dress-rehearsal adopted-stage load renders correctly in a scratch environment.
- [ ] **AI narratives:** Often reviewed once then stale — verify regeneration is wired to data reloads and the banned-word lint runs in the pipeline.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Proposed rows leaked into adopted pages | MEDIUM | Hotfix stage filters; reload; refresh MV; redeploy; audit snapshot diff before announcing fixed |
| Wrong baseline in published diffs | HIGH | Correct the diff module; regenerate all diff pages *and* narratives; post a visible correction note (credibility requires owning it, not silently patching) |
| Unit error (1000x) in proposed data | MEDIUM | Re-extract with fixed multiplier; verify block at all granularities; redeploy; check no narratives were generated from bad numbers |
| AI narrative with hallucinated claim went live | HIGH | Pull the narrative immediately (reseed reviewed JSON without it); review the whole batch, not just the caught one; tighten prompt + lint before regenerating |
| Millage copy contradicted by TRIM notices (late Aug) | MEDIUM | Update calculator copy/rates same-day; add TRIM-certified rate as its own stage; this is predictable — pre-draft the August update now |
| County renamed a department mid-cycle and extraction broke | LOW | This is the designed path: warning fires, human adds alias/decision, re-run pipeline — cost is low *because* the identity gate exists |
| Change memo shifted numbers and site is stale during hearings | LOW | Re-run pipeline (built re-runnable), refresh MV, redeploy, bump `data_as_of` — same day |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Proposed rows leak into adopted queries | Phase: Stage-aware schema (first, gates all loads) | Snapshot diff of all v1.1 pages after proposed load = zero changes |
| 2. Two FY 25-26 baselines mixed | Phase: Extraction pipeline + Diff computation | Reconciliation report with zero unexplained discrepancies; scope labels on every diff |
| 3. Multi-row double counting in diffs | Phase: Diff computation | Cent-exact roll-up test (Σ dept diffs = countywide diff) |
| 4. Zero-baseline percent math | Phase: Diff computation (first task) | Vitest zero/eliminated/truncation cases green |
| 5. Rename/merge identity errors | Phase: Extraction pipeline | Load aborts on unresolved names; alias review artifact committed |
| 6. Proposed cited as fact | Phase: /proposed UI | Escape-surfaces audit (OG, title, search, alt text) checklist complete |
| 7. Sankey misread as money moving | Phase: Sankey visualization (after crosswalk decision in diff phase) | Left/right balance test; "same dollars, new categories" annotation present |
| 8. Good/bad diff colors | Phase: /proposed UI (design tokens first) | No success/danger tokens in diff components; blue/orange verified |
| 9. AI narratives editorialize | Phase: AI narratives (last content phase) | 100% human-reviewed; banned-word lint in pipeline; regeneration wired to reloads |
| 10. July proposal revises through Sept | Phase: Extraction pipeline + standing process checklist | Two idempotent re-runs; calendar checkpoints (Aug 4, Sept 3, Sept 17) documented |
| 11. TRIM/millage confusion | Phase: Calculator (after stage model) | Stage-aware millage rows; copy review vs 200.065 semantics; post-Aug 4 re-check scheduled |
| 12. Unit slips in new extractors | Phase: Extraction pipeline | Verify block green countywide + per-priority + sampled lines; wrap/header fixtures |

**Implied phase ordering:** Stage-aware schema → Extraction pipeline (with verification + identity gate) → Diff computation module → /proposed UI (diverging bars, waterfall) → Sankey crosswalk → Calculator millage comparison → AI narratives. The schema phase must be first; AI narratives must be last (they consume frozen diffs); the calculator has a hard external checkpoint after ~Aug 4 (TRIM certification).

## Sources

- Project-internal (HIGH confidence): `BudgetExplorer/.planning/PROJECT.md` (2026-07-18 audit findings, FY 2026-27 release format analysis) and `BudgetExplorer/CLAUDE.md` (data model invariants — multi-row budgets, COALESCE membership, cents formatters, extractor state machines).
- [Fla. Stat. § 200.065 — Method of fixing millage](https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299%2F0200%2FSections%2F0200.065.html) (HIGH — statutory TRIM timeline and ceiling semantics)
- [Florida DOR TRIM Compliance Workbook](https://floridarevenue.com/property/Documents/trimregwb.pdf) and [FAC 12D-17 TRIM Compliance](https://flrules.org/gateway/ChapterHome.asp?Chapter=12d-17) (HIGH — official compliance mechanics)
- [Caribbean National Weekly: Miami-Dade mayor proposes $14.2B FY2026-27 budget, tax rate unchanged](https://www.caribbeannationalweekly.com/posts/miami-dade-mayor-proposes-142-billion-fy2026-27-budget-keeps-county-tax-rate-unchanged) (MEDIUM — proposal totals/date, cross-checked against [miamidade.gov budget page](https://www.miamidade.gov/global/management/budget/home.page))
- [Palm Beach County PAO — TRIM notice explainer](https://pbcpao.gov/trim/), [Hillsborough County PAO — TRIM notices](https://www.hcpafl.org/Property-Info/Truth-In-Millage) (MEDIUM — notice timing, "lower but not raise" hearing behavior)
- [Datasketch: 5 most common Sankey design mistakes](https://datasketch.blog/en/post/the-5-most-common-mistakes-in-designing-a-sankey-diagram-and-how-to-avoid-them/), [PolicyViz: The Sankey Diagram](https://policyviz.com/2021/02/02/the-sankey-diagram/), [Plotly: Deep dive on Sankey diagrams](https://plotly.com/blog/sankey-diagrams/) (MEDIUM — proportionality, node ordering, overload, flow-misreading failure modes)
- Personal/system experience (HIGH for this codebase): 2026-07 audit — multi-row aggregation bug, Appendix J silent capital misattribution, search-index staleness, ISR redeploy requirement.

---
*Pitfalls research for: adding FY 2026-27 proposed budget + cross-taxonomy diffs to a live civic budget site*
*Researched: 2026-07-18*
