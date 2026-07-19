# Architecture Patterns: v1.2 Stage-Aware Budget Data

**Domain:** Civic budget visualization -- adding FY 2026-27 PROPOSED budget (stage-aware schema, year-scoped Strategic Priorities, /proposed routes, cross-stage diffs) to the existing Miami-Dade Budget Explorer
**Researched:** 2026-07-18
**Confidence:** HIGH (grounded in direct reads of schema.prisma, queries.ts, seed.py, migrations 003/004)
**Focus:** Integration architecture for NEW v1.2 features only. Supersedes the v1.1 research at this path (v1.1 patterns remain valid and are referenced, not repeated).

## Existing Architecture Constraints (what the new work must not break)

Verified against the actual code:

| Fact | Where | Consequence for v1.2 |
|------|-------|----------------------|
| `department_budgets` is multi-row per (dept, FY): one row per strategic area + capital-only rows | `schema.prisma:60-78`, CLAUDE.md invariants | Stage column must preserve this grain; `sumBudgetRows()` stays the aggregation path |
| Unique key `(fiscal_year_id, department_id, strategic_area_id, is_actual)` | `schema.prisma:74`, migration 003 | `is_actual` is INSIDE the unique key -- any stage model must replace it there |
| `is_actual` also exists on `department_expenditures` and `revenue_by_source`, inside their unique keys | `schema.prisma:91, 180` | Stage migration must cover all three tables |
| Area membership = `COALESCE(db.strategic_area_id, d.strategic_area_id)` | `queries.ts:61-66` (`areaMembershipFilter`), migration 003 `v_department_yoy` | Must hold for legacy rows; proposed rows must carry explicit area ids so the fallback never fires against the wrong taxonomy |
| Loader is delete+insert scoped by `fiscal_year_id` only | `seed.py:92, 160, 225, 332, 397, 452` | **Unchanged, this deletes proposed rows when adopted loads in September.** Every delete must become stage-scoped |
| `search_index` MV hardcodes `label = 'FY 2025-26'` and `db.is_actual = false` | migration 004:70-73 | MV must be recreated when `is_actual` is dropped |
| Queries hardcode `CURRENT_FY_LABEL = 'FY 2025-26'` and `is_actual: false` | `queries.ts:15, 191, 321, 404` | Every call site changes mechanically; proposed pages need a parallel (FY, stage) context |
| `millage_rates` unique on `(fiscal_year_id, authority)` | `schema.prisma:167` | Proposed and adopted FY 2026-27 millage would collide -- key needs stage |
| `strategic_area_budgets` unique on `(fiscal_year_id, strategic_area_id)` | `schema.prisma:203` | Same collision for priority-level totals -- key needs stage |
| `fiscal_years` carries countywide totals + `is_adopted` boolean | `schema.prisma:138-156` | One row per year can't hold both proposed and adopted totals |
| `strategic_areas.name` and `.slug` are globally UNIQUE | `schema.prisma:208-209` | Two of the 7 new priorities ("Policy Formulation", "Constitutional Offices") collide by name with existing areas -- must reuse those rows, not duplicate |
| Pages are static with daily ISR (`revalidate = 86400`) | CLAUDE.md conventions | /proposed pages follow the same pattern; prod loads require MV refresh + redeploy |

## Decision 1: Budget Stage Model -- Replace `is_actual` with a `stage` enum column

**Recommendation: Evolve `is_actual` into a `stage` column (Postgres enum `budget_stage`: `proposed` | `adopted` | `actual`) on the three tables that have `is_actual`, plus add `stage` to `millage_rates`, `strategic_area_budgets`, and `budget_descriptions`. Drop `is_actual` in the same migration.** Confidence: HIGH.

### Alternatives considered

| Option | Verdict | Why |
|--------|---------|-----|
| **A. Replace `is_actual` with `stage` enum (recommended)** | ✅ | Stage is one fact with three values; the discriminator lives in the same predicate every existing query already uses. Dropping `is_actual` makes `prisma db pull` + `tsc` fail loudly at every stale call site -- the type system becomes the migration checklist. |
| B. Add `stage` alongside `is_actual` | ❌ | Two columns encoding one fact. Fatal flaw: proposed rows would have `is_actual = false`, so every existing `where: { is_actual: false }` query **silently includes proposed data in adopted views** unless you update every call site anyway. All of A's churn plus a silent-corruption hazard. |
| C. Stage-scoped `fiscal_years` rows (e.g., a second row labeled "FY 2026-27 Proposed") | ❌ | Zero schema change and the existing delete-by-FY loader isolates stages for free -- but it corrupts the year dimension. `getDepartmentYoY` groups by `fiscal_years.label` (queries.ts:459-474) and would show two "years"; diff queries would need label parsing; `CURRENT_FY_LABEL` identity, search_index, and sitemap all treat label as year identity. Classic grain-conflation anti-pattern. |

### Why a native Postgres enum (not VARCHAR + CHECK)

The schema is introspected (`prisma db pull` style, raw SQL migrations are canonical per CLAUDE.md). A Postgres enum introspects into a Prisma enum, so the generated client types `stage` as `'proposed' | 'adopted' | 'actual'` instead of `string` -- typos become compile errors. The stage set is closed (budget lifecycle is fixed), so enum rigidity costs nothing. VARCHAR + CHECK is an acceptable fallback (matches the untyped `entity_type` precedent) but gives up client-side type safety.

### Migration 006 sketch (`pipeline/migrations/006_budget_stage.sql`)

```sql
CREATE TYPE budget_stage AS ENUM ('proposed', 'adopted', 'actual');

-- department_budgets (repeat pattern for department_expenditures, revenue_by_source)
ALTER TABLE department_budgets ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
UPDATE department_budgets SET stage = 'actual' WHERE is_actual IS TRUE;
-- is_actual = false OR NULL both mean adopted today (column is nullable, default false)
ALTER TABLE department_budgets
    DROP CONSTRAINT department_budgets_fy_dept_area_actual_key;
ALTER TABLE department_budgets
    ADD CONSTRAINT department_budgets_fy_dept_area_stage_key
    UNIQUE (fiscal_year_id, department_id, strategic_area_id, stage);
ALTER TABLE department_budgets DROP COLUMN is_actual;

-- Tables gaining stage in their unique key (no is_actual to convert)
ALTER TABLE millage_rates ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE millage_rates DROP CONSTRAINT millage_rates_fiscal_year_id_authority_key;
ALTER TABLE millage_rates ADD CONSTRAINT millage_rates_fy_authority_stage_key
    UNIQUE (fiscal_year_id, authority, stage);

ALTER TABLE strategic_area_budgets ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
-- same drop/re-add pattern for its (fiscal_year_id, strategic_area_id) key

ALTER TABLE budget_descriptions ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';

-- Stage-scoped countywide totals (fiscal_years.total_* can only hold one stage)
CREATE TABLE fiscal_year_stages (
    id              SERIAL PRIMARY KEY,
    fiscal_year_id  INTEGER NOT NULL REFERENCES fiscal_years(id),
    stage           budget_stage NOT NULL,
    total_operating BIGINT,
    total_capital   BIGINT,
    total_budget    BIGINT,
    total_employees INTEGER,
    published_at    DATE,
    source_pdf_url  TEXT,
    UNIQUE (fiscal_year_id, stage)
);
-- Backfill one row per existing FY so the table is complete from day one
-- (FY 2021-24 -> 'actual', FY 2024-25 and 2025-26 -> 'adopted', copying fiscal_years totals)

-- Recreate everything that referenced is_actual
CREATE OR REPLACE VIEW v_department_yoy AS ... WHERE db.stage = 'adopted' ...;
DROP MATERIALIZED VIEW search_index;
CREATE MATERIALIZED VIEW search_index AS ...  -- migration 005 definition with
    -- AND db.stage = 'adopted' replacing AND db.is_actual = false
CREATE INDEX idx_search_index_fts ON search_index USING gin(search_vector);
```

**Data-preservation guarantees:** `is_actual = true → 'actual'`, `false/NULL → 'adopted'` is a total mapping; row counts are untouched; the multi-row grain and the NULL-distinct behavior of `strategic_area_id` in the unique key are identical to today (Postgres treats NULLs as distinct in unique constraints -- same as the current constraint, no behavior change). `fiscal_years.total_*` and `is_adopted` are left in place so `getCurrentFiscalYear()` keeps working; `fiscal_year_stages` is the going-forward home for stage-scoped totals and is what /proposed reads.

**Why `fiscal_year_stages` instead of overwriting `fiscal_years` totals:** the milestone explicitly requires retaining proposed totals after September's adopted load (proposal-vs-adopted waterfall). A single `fiscal_years` row cannot hold both. Alternative considered: compute countywide totals by summing `strategic_area_budgets` per stage -- workable, but published totals are the verification anchor (PDF is source of truth) and the waterfall should display official figures, not derived sums. Confidence: MEDIUM-HIGH (the table is the clean answer; the summing alternative is viable if you want one fewer table).

### Loader changes (critical -- this is where September goes wrong)

Every delete in `seed.py` currently scopes by `fiscal_year_id` alone. After migration 006:

```python
cur.execute(
    "DELETE FROM department_budgets WHERE fiscal_year_id = %s AND stage = %s",
    (fiscal_year_id, stage)
)
```

Without this, the September adopted load **silently deletes the proposed rows** it is supposed to coexist with. Same fix in `seed_strategic_area_budgets*`, `seed_revenue`, `seed_millage_rates` (its ON CONFLICT target also changes to the new 3-column key). All seed functions take a `stage` parameter; the appendix seeders pass `'proposed'` for this milestone. The single-transaction commit-on-close discipline is unchanged.

## Decision 2: Year-Scoped Priorities -- New rows in `strategic_areas`, membership derived from data

**Recommendation: Keep one `strategic_areas` table. Insert 5 new rows for the genuinely new priorities; REUSE the existing rows for "Policy Formulation" and "Constitutional Offices" (which carry over by name and would violate the UNIQUE name/slug constraints if duplicated). Which areas "exist" in a given (FY, stage) is derived from `strategic_area_budgets` rows -- no validity-range columns, no second table.** Confidence: HIGH.

### Alternatives considered

| Option | Verdict | Why |
|--------|---------|-----|
| **A. New rows in `strategic_areas`, data-driven year scoping (recommended)** | ✅ | `strategic_area_budgets` (now keyed by FY + area + stage) already IS the "this area exists in this year" fact table. `getStrategicAreas()` already joins it per FY -- switching from "all areas, zero-filled" to "areas having a budget row for this (FY, stage)" makes navigation year-scoped with no new schema. FKs from `department_budgets.strategic_area_id` and `capital_programs` keep working untouched. |
| B. Separate `strategic_priorities` table | ❌ | Forces either a second nullable FK on `department_budgets` or a polymorphic FK. Breaks `areaMembershipFilter`, migration 003 views, the COALESCE invariant, and the generic Treemap component's data shape. Massive churn for one reorg. |
| C. Versioned taxonomy tables (`area_sets`, `area_set_members`) | ❌ | Correct in the abstract, overkill for one reorganization every N years. Revisit only if the county reorganizes again. |
| D. Validity columns on `strategic_areas` (`first_fy_id`, `last_fy_id`) | ❌ | Redundant with what `strategic_area_budgets` already encodes, and wrong for the two carry-over areas that exist in both taxonomies. |

### Key implications

- **Row plan:** 5 INSERTs (An Economy that Works for All, Healthy and Safe Communities, Investment in Infrastructure, Risk Reduction and Resilience, Fiscal Responsibility and Efficiency) with new slugs, colors, display_order. "Policy Formulation" and "Constitutional Offices" reuse ids -- their Sankey crosswalk links are self-links, which is correct and visually communicates continuity. Do this in migration 007 (precedent: migration 003 inserted departments).
- **"Strategic Priority" vs "Strategic Area" labeling is a function of the fiscal year being viewed, not a column.** FY 2026-27 UI says "Strategic Priority"; FY 2025-26 UI says "Strategic Area". No `taxonomy` column needed -- the /proposed route namespace already knows which vocabulary to render.
- **Pipeline must enforce explicit `strategic_area_id` on every FY 2026-27 proposed row** (Appendix A gives "Strategic Priority:" headers, so the data supports it). If a priority name fails to resolve, warn and skip -- never fall back to NULL, because the `COALESCE(db.strategic_area_id, d.strategic_area_id)` fallback resolves to the department's **home area in the OLD taxonomy** and would silently leak 9-area membership into 7-priority aggregations. The Appendix A extractor's alias table needs the county's own typo: "Constitutional Office" (singular) → constitutional-offices.
- **`departments.strategic_area_id` (home area) stays pointed at the old taxonomy.** It is display metadata and the COALESCE fallback for legacy rows only. Do NOT retarget it to priorities this milestone -- that would corrupt FY 2025-26 area pages. Department counts for priorities must come from budget rows (`groupBy department_id`), not `_count: { departments: true }` (which counts by home area and would return 0 for the 5 new priorities -- see `getStrategicAreasWithDetails`, queries.ts:285-287).
- **Sankey crosswalk (9 → 7)** is computed, not stored: join `department_budgets` FY 2025-26 `stage='adopted'` rows against FY 2026-27 `stage='proposed'` rows on `department_id`, flowing each old (dept, area) slice's dollars to the department's new priority. Multi-area → multi-priority departments split proportionally. Compute in a build-time query function (`getCrosswalkData()`); pages are static so the cost is paid once per revalidation. No crosswalk table unless manual overrides prove necessary.

## Decision 3: Diff Queries and /proposed Routes

### Route structure (NEW)

```
src/app/proposed/
  layout.tsx                     # THE separation mechanism: persistent "PROPOSED --
                                 #   not adopted" banner, distinct accent tokens,
                                 #   metadata title template "Proposed: %s"
  page.tsx                       # Landing: proposed totals hero, countywide waterfall,
                                 #   7 priorities treemap (reuses generic Treemap),
                                 #   Sankey crosswalk, link to hearings info
  priority/[slug]/page.tsx       # Priority detail: departments in this priority
                                 #   (proposed sums + diff vs FY 2025-26 adopted)
  department/[slug]/page.tsx     # Department diff page: proposed vs adopted stat
                                 #   cards, diverging bars, AI "what's changing"
                                 #   narrative, expenditure comparison
```

Namespacing under `/proposed/*` (rather than a `?stage=` param or `/explorer/2026-27`) is the right call: it makes the "cannot be mistaken for adopted" requirement a **layout-level guarantee** -- every proposed page inherits the banner and visual identity from one `layout.tsx`, and existing routes are untouched. All /proposed pages use `generateStaticParams` + daily ISR exactly like `/department/[slug]` does today. Slugs come from departments having FY 2026-27 proposed rows (new departments get rows via the existing `department_aliases` / insert path).

### Query layer (NEW files, MECHANICAL edits to existing)

```
src/lib/db/
  queries.ts            # MODIFIED mechanically only: is_actual: false -> stage: 'adopted'
                        #   (4 call sites; getDepartmentYoY's is_actual branch -> stage
                        #   ternary, and it must now EXCLUDE stage='proposed' rows so
                        #   history charts never mix proposed into the trend)
  proposed-queries.ts   # NEW: getProposedFiscalYear() (fiscal_year_stages row),
                        #   getPriorities() (areas having FY26-27 proposed budget rows),
                        #   getPriorityWithDepartments(slug), getProposedDepartment(slug)
                        #   -- mirrors existing patterns: React cache(), sumBudgetRows(),
                        #   areaMembershipFilter(), BigInt->string serialization
  diff-queries.ts       # NEW: getDepartmentDiff(slug), getAllDepartmentDiffs(),
                        #   getCountywideWaterfall(), getCrosswalkData()
  millage-queries.ts    # NEW or extend existing: getMillageComparison() ->
                        #   { current: FY25-26 adopted rates, proposed: FY26-27 proposed }
```

**Do not genericize the existing v1.1 query functions into (FY, stage)-parameterized versions this milestone.** They passed the 2026-07 audit as written; the only forced change is the compile-driven `is_actual` → `stage` rename. Proposed pages get their own query module (matching the v1.1 per-feature-module precedent: explorer-queries, calculator-queries, etc.). Shared helpers `sumBudgetRows` and `areaMembershipFilter` should be exported from queries.ts (or a shared `budget-helpers.ts`) and reused -- they encode the audit invariants.

### Diff query pattern

Follow the codebase's established "fetch rows, group in JS" pattern (used in `getAreaWithDepartments` and `getDepartmentYoY`) rather than SQL views:

```typescript
// diff-queries.ts -- two indexed queries, one in-memory join
const [proposedRows, adoptedRows] = await Promise.all([
  prisma.department_budgets.findMany({
    where: { fiscal_year_id: fy2627.id, stage: 'proposed' },
    include: { departments: true },
  }),
  prisma.department_budgets.findMany({
    where: { fiscal_year_id: fy2526.id, stage: 'adopted' },
    include: { departments: true },
  }),
])
// Group each by department_id, sumBudgetRows() each side, then:
// deltaCents  = proposed.total - adopted.total          (BigInt end to end)
// deltaPct    = adopted.total === 0n ? null : Number(...) (Number ONLY for the ratio;
//                cents magnitudes ~1.3e12 are far inside 2^53 -- safe)
// status      = 'new' (no adopted rows) | 'eliminated' (no proposed rows) | 'changed'
```

Department identity across years is `department_id` -- renames are already handled upstream by `department_aliases` at load time, so diffs need no name matching. `new`/`eliminated` must be first-class in the return type (the reorg guarantees both exist); percent-change is `null` for new departments, never Infinity.

### Static generation integration

- All /proposed pages: `export const revalidate = 86400` (same as existing). Data ships via the same pipeline → Neon → build/ISR path; **prod checklist is unchanged and mandatory: reseed → `REFRESH MATERIALIZED VIEW search_index` → Vercel redeploy.**
- `sitemap.ts`: add `/proposed`, priority slugs, and proposed department slugs.
- `nav-config.ts`: add "Proposed" item (likely with a visual "New" affordance).
- **Search stays pinned to FY 2025-26 adopted this milestone.** The MV gets recreated in migration 006 only because `is_actual` disappears -- its FY filter is unchanged. Extending search to proposed content is a deferred, separate migration; mixing proposed figures into search results without stage labeling would violate the separation requirement.
- Calculator: `getMillageComparison()` feeds the existing pure-client-side computation with two rate sets; the comparison math is client-side like everything else (v1.1 Pattern 2 unchanged).
- AI narratives: same offline pattern -- pipeline generates "what's changing" text per department into `budget_descriptions` with `fiscal_year_id = FY 2026-27, stage = 'proposed'`; `/proposed/department/[slug]` reads it like any other description. No runtime AI.

## Integration Points Summary

| Integration point | Kind | Change |
|-------------------|------|--------|
| `pipeline/migrations/006_budget_stage.sql` | NEW | Enum, three `is_actual` conversions, three unique-key changes, `fiscal_year_stages`, view + MV recreation |
| `pipeline/migrations/007_strategic_priorities.sql` | NEW | 5 priority rows (colors, slugs, display_order); Appendix-A name aliases if stored |
| `pipeline/extract/` Appendix A + H extractors | NEW | State machines per the verified FY 26-27 formats (paired-year columns, "Strategic Priority:" headers, Appendix H wrapped names); unrecognized-header = warn + close block (audit rule) |
| `pipeline/load/seed.py` | MODIFIED | `stage` param threaded through; all deletes gain `AND stage = %s`; new proposed-appendix seeders; `fiscal_year_stages` upsert |
| `pipeline/verify/checker.py` | MODIFIED | Verification keyed on (FY, stage); FY 2026-27 proposed published-totals block |
| `pipeline/generate/descriptions` | MODIFIED | Change-narrative prompt variant writing stage='proposed' rows |
| `prisma/schema.prisma` | REGENERATED | `prisma db pull` after 006/007; enum `budget_stage` appears; `is_actual` fields vanish |
| `src/lib/db/queries.ts` | MODIFIED (mechanical) | `is_actual: false` → `stage: 'adopted'` (4 sites); `getDepartmentYoY` stage ternary + exclude proposed |
| `src/lib/db/proposed-queries.ts`, `diff-queries.ts` | NEW | As above |
| `src/app/proposed/**` | NEW | Layout + 3 page types |
| `src/components/` (DivergingBarChart, Waterfall, SankeyCrosswalk, ProposedBanner, DiffStatCard) | NEW | D3 modules per v1.1 chart conventions (ChartContainer, data-table fallback, cents in / formatting at display) |
| `nav-config.ts`, `sitemap.ts`, calculator page | MODIFIED | Nav item; sitemap entries; millage comparison props |
| `search_index` MV | RECREATED (unchanged behavior) | Only the `is_actual` predicate swap |

## Anti-Patterns to Avoid (v1.2-specific)

1. **Stage-in-label** ("FY 2026-27 Proposed" as a fiscal_years row): breaks YoY grouping, label identity, and diff joins. Stage is a column, never a label suffix.
2. **Adding `stage` while keeping `is_actual`:** proposed rows with `is_actual=false` silently contaminate every existing adopted-view query. Drop the boolean; let `tsc` find the call sites.
3. **Loading September's adopted data with year-scoped deletes:** wipes the proposed rows the milestone exists to preserve. Stage-scope every delete before any FY 2026-27 load runs.
4. **Letting proposed rows fall back to home-area COALESCE:** home areas are the OLD 9-area taxonomy; a NULL `strategic_area_id` on a proposed row misfiles dollars into the wrong taxonomy. Enforce non-null at load; verify should assert it.
5. **Counting priority departments via `departments.strategic_area_id`:** returns 0 for new priorities. Count distinct `department_id` in stage-scoped budget rows.
6. **Reading `department_budgets[0]` in any new diff/proposed query:** the audit's worst class of bug. Every total goes through `sumBudgetRows()`.
7. **Number arithmetic on cents before the ratio step:** deltas in BigInt; convert to Number only for percentages.

## Build Order (dependency chain)

```
Phase A: Stage foundation (blocks everything)
  006 migration -> prisma db pull + generate -> mechanical queries.ts fixes
  -> recreate views/MV -> regression gate: existing pages byte-identical
  (this phase changes ZERO user-visible behavior; ship it alone)
      |
Phase B: Reference data
  007 migration (5 priority rows) + FY 2026-27 fiscal_years row
      |
Phase C: Pipeline (depends on A+B)
  Appendix A/H extractors -> stage-scoped loaders -> FY 26-27 proposed verify block
  -> local DB has real proposed data (unblocks all frontend work)
      |
Phase D: Query layer (depends on C for real-data testing)
  proposed-queries.ts, diff-queries.ts, millage comparison query
      |
Phase E: /proposed routes + charts (depends on D)
  layout + banner identity -> landing (waterfall, treemap, Sankey)
  -> priority pages -> department diff pages
      |
Phase F: Cross-cutting polish (depends on E)
  Calculator comparison, AI change narratives (pipeline + seed + render),
  nav/sitemap/OG images, prod load + MV refresh + redeploy
```

Phase A is the risk concentrator and is independently shippable -- do it first and alone, verified against production parity, before any new-feature code. Phases D/E can overlap once C lands. The September adopted release then becomes: run pipeline with `stage='adopted'`, refresh MV, redeploy -- a data load, not a rebuild, which is the milestone's stated success criterion.

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Stage enum replacing `is_actual` | HIGH | Grounded in actual schema/queries/loader reads; option B's contamination failure mode is mechanical fact |
| Migration data-preservation path | HIGH | Total mapping true→actual, false/NULL→adopted; constraint semantics identical (NULL-distinct unchanged) |
| Priorities as `strategic_areas` rows, data-driven scoping | HIGH | `strategic_area_budgets` join already exists in every area query; name-collision forcing row reuse verified against UNIQUE constraints + PROJECT.md priority list |
| `fiscal_year_stages` table | MEDIUM-HIGH | Clean answer to dual-totals retention; summing area rows is a viable lighter alternative |
| /proposed routing + query-module split | HIGH | Direct extension of verified v1.1 patterns (per-feature query modules, generateStaticParams, ISR) |
| Prisma introspection of PG enums → typed client enums | HIGH | Long-stable Prisma behavior (since Prisma 2; unchanged in Prisma 7 introspection flow used here) |
| Appendix A/H extractor specifics | MEDIUM | Format facts from PROJECT.md's 2026-07-18 verification session; extractor design must be validated against the sample PDFs during Phase C |

## Sources

- `budget-explorer-web/prisma/schema.prisma` -- constraints, nullability, unique keys (HIGH)
- `budget-explorer-web/src/lib/db/queries.ts` -- sumBudgetRows, areaMembershipFilter, is_actual call sites, YoY merge logic (HIGH)
- `pipeline/load/seed.py` -- delete+insert scoping, appendix seeding path, name resolution (HIGH)
- `pipeline/migrations/003_appendix_integration.sql` -- unique-key evolution precedent, COALESCE views (HIGH)
- `pipeline/migrations/004_search_index.sql` -- MV's is_actual and FY-label dependencies (HIGH)
- `.planning/PROJECT.md` -- v1.2 requirements, FY 26-27 release format verification (2026-07-18), 7 priority names incl. county typo (HIGH)
- `CLAUDE.md` (project) -- 2026-07 audit invariants, prod data-ops checklist (HIGH)
- PostgreSQL docs: NULLs distinct in unique constraints; enum ALTER semantics (HIGH, standard behavior)

---
*Architecture research for: Miami-Dade Budget Explorer v1.2 (FY 2026-27 Proposed Budget)*
*Researched: 2026-07-18 -- supersedes v1.1 research at this path*
