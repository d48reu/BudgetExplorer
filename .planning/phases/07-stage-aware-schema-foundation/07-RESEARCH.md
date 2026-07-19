# Phase 7: Stage-Aware Schema Foundation - Research

**Researched:** 2026-07-18
**Domain:** Postgres expand/contract schema migration + Prisma 7 introspected client + byte-identical HTML regression gate
**Confidence:** HIGH (grounded in direct reads of schema.prisma, queries.ts, migrations 001/003/004/005, all three seeders, checker.py, cli.py/db.py, package.json/vercel.json, plus live catalog queries against the local database)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Production rollout**
- Phase 7 ships to production Neon **immediately** once local verification passes — it does not wait for Phase 8. Rationale: if anything is wrong with the stage model, find out in July with zero proposed data at stake.
- **Standing authorization for this milestone:** Claude runs production migrations/loads/redeploys via `DATABASE_URL_PROD` when a phase's verification passes, and reports results — the pattern established in the 2026-07-18 session. No per-touch approval needed; results always reported.

**Migration downtime strategy**
- **Two-step expand/contract, zero downtime.** Migration A adds the `budget_stage` enum column alongside `is_actual` and backfills (`is_actual=true` → 'actual', `is_actual=false` → 'adopted'); deploy code that reads `stage`; Migration B drops `is_actual` and swaps the unique keys.
- **Migration B runs the same day as the verified deploy.** The dual-column window lasts hours, not days — Phase 8 must start against a schema where stale `is_actual` references are impossible (compile-time failure via regenerated Prisma types).
- The public site must never error during the transition.

**Verification standard**
- **Automated snapshot diff, full crawl.** A script fetches every page's HTML (sitemap-driven: all 53 department pages, 9 area pages, homepage, explorer, calculator, glossary, search shell — ~70 pages) before and after migration, and diffs byte-for-byte. Run locally first, then against prod.
- The snapshot tool is built as a **reusable regression gate** — Phases 8–13 each use it to prove adopted pages were not disturbed.
- Dynamic content that legitimately varies between fetches (if any) must be normalized by the script, not excused by hand.

### Claude's Discretion
- Enum mechanics (Postgres enum type vs check-constrained text), backfill SQL, index/constraint naming
- How the snapshot script normalizes any legitimately-dynamic bytes
- Prisma regeneration flow and TypeScript migration of the 4+ `is_actual` call sites in queries.ts
- View/materialized-view recreation order

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Budget stage (proposed/adopted/actual) is a first-class dimension replacing `is_actual` across `department_budgets`, `strategic_area_budgets`, `millage_rates`, `revenue_by_source`, `department_expenditures`, and `budget_descriptions` — with every existing page rendering byte-identical after the migration | Full table/constraint inventory with **exact live constraint names** (verified via pg_constraint); complete migration A/B SQL choreography incl. verified view-dependency set; complete reader/writer call-site inventory (found 6 stage-less query sites beyond the 4 documented `is_actual` sites — required for success criterion 3); Vercel build-ordering analysis showing schema.prisma is the deploy contract; snapshot-tool design with two-tier diff strategy |
</phase_requirements>

## Summary

The six tables split cleanly into three groups: three tables carry `is_actual` inside unique keys (`department_budgets`, `department_expenditures`, `revenue_by_source`), two gain `stage` fresh with a unique-key widening (`millage_rates`, `strategic_area_budgets`), and one gains only the column (`budget_descriptions`, which has no unique key at all). Exact live constraint names were pulled from `pg_constraint` — two of them are **Postgres-truncated** (`revenue_by_source_..._is_actua_key`, `department_expenditures_..._expend_key`), so Migration B must use these verified names, not guessed ones. Only two relations depend on `is_actual` (verified via `pg_depend`): the `v_department_yoy` view and the `search_index` materialized view — they must be dropped before the column drop and recreated after.

The single most important sequencing finding: **Vercel builds run `prisma generate` from the committed `schema.prisma`, never from the database** — so the schema file is the deploy contract. Deploy 1 (between Migrations A and B) must ship a schema.prisma in *final* shape: `stage` present, `is_actual` fields *removed* even though the columns still exist in the DB. Prisma ignores DB columns absent from the schema, but generates explicit column lists in every SELECT for columns that ARE in the schema — if Deploy 1's schema still listed `is_actual`, Migration B's column drop would instantly break the per-request `/search` page. With `is_actual` absent from Deploy 1's schema, Migration B cannot break the running site by construction.

Second critical finding: the four documented `is_actual` call sites in queries.ts are **not** the full protection surface. Six more query sites read stage-carrying tables with no stage filter at all (`getRevenueSources`, `getMillageRates`, `getDepartmentExpenditures`, the `strategic_area_budgets` joins in three area queries, and the `budget_descriptions` lookup). Success criterion 3 — "a test proposed row changes nothing user-visible" — is unachievable unless every one of these gains a `stage: 'adopted'` filter in this phase. Adding them is byte-invisible today (all rows are adopted/actual) and is precisely the drift-proofing this phase exists for.

**Primary recommendation:** Native Postgres enum `budget_stage`; Migration A = type + columns + backfill only; Deploy 1 = final-state schema.prisma + stage filters on all ten reader sites + loader rewrites; Migration B = view/MV drop → constraint swap → column drop → default drop → view/MV recreate; snapshot tool at `budget-explorer-web/scripts/snapshot.mjs` with raw (same-build) and normalized (cross-build) diff modes.

## Standard Stack

No new libraries. Everything in this phase uses tooling already in the repo.

### Core
| Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Postgres native enum | Neon/local PG | `budget_stage` type | Introspects into a typed Prisma enum → typos become compile errors (the phase's whole point) |
| Prisma CLI (`db pull`, `generate`) | 7.4.2 | Regenerate client from migrated DB | Repo's canonical flow: raw SQL migrations + introspected schema (schema.prisma is introspection-shaped, `prisma-client` generator to `src/generated/prisma`) |
| `python -m pipeline migrate` | in-repo | Apply 006/007 | Existing runner: numbered `.sql` files, `_migrations` tracking, one transaction per file, commit-per-file (`pipeline/load/db.py:32-102`) |
| Node built-in `fetch` + `node:fs`/`node:crypto` | Node 18+ | Snapshot tool | Zero-dependency crawl/diff script; no new packages |
| Vitest | 4.0.18 | Web unit tests (existing) | Already configured (`vitest.config.ts`, `src/lib/__tests__/tax-math.test.ts`) |
| pytest | ≥8.0.0 | Pipeline tests (installed, unused) | In requirements.txt; `pipeline/tests/` is empty |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres enum | VARCHAR + CHECK constraint | Introspects as `String` — loses the compile-time gate that is this phase's entire purpose. Matches the untyped `entity_type` precedent, but that precedent is a weakness, not a pattern to follow. Rejected. |
| `prisma db pull` then hand-verify | Hand-edit schema.prisma, verify with `db pull` no-diff | **Use the second.** Deploy 1 must ship a schema that deliberately omits `is_actual` while the column still exists — `db pull` at that moment would re-add it. Hand-write the final schema for Deploy 1; after Migration B, `prisma db pull` + `git diff --exit-code prisma/schema.prisma` proves convergence. |
| Playwright for snapshots | Plain `fetch` | Pages are fully server-rendered; the HTML response IS the page. No browser needed. Playwright adds flake and cost for zero gain here. |

**Installation:** none.

### Enum vs CHECK — the decision detail (Claude's discretion, resolved)

Native enum `budget_stage AS ENUM ('proposed', 'adopted', 'actual')`:
- Prisma 7 `db pull` maps PG enums to Prisma enums (long-stable behavior; Prisma 7 even added `@map` on enum members). Generated client types `stage` as the closed union — `stage: 'adotped'` is a compile error, `String` would accept it silently.
- Future alteration ergonomics: `ALTER TYPE budget_stage ADD VALUE 'amended'` works in a transaction on PG 12+ (restriction: the new value can't be used in the same transaction — irrelevant under the repo's one-transaction-per-migration-file runner, since usage lands in a later file). The stage set is a fixed budget lifecycle; removal/rename will never be needed.
- Ordering: enum comparison order is declaration order; nothing in the codebase sorts by stage, so declaration order is cosmetic. Declare `('proposed', 'adopted', 'actual')` in lifecycle order.

## Architecture Patterns

### Verified table inventory (live catalog, local DB)

| Table | Has `is_actual`? | Unique key today (EXACT live name) | Phase 7 action |
|-------|------------------|-------------------------------------|----------------|
| `department_budgets` | Yes | `department_budgets_fy_dept_area_actual_key` — `(fiscal_year_id, department_id, strategic_area_id, is_actual)` | Convert + key swap |
| `department_expenditures` | Yes | `department_expenditures_fiscal_year_id_department_id_expend_key` — `(fiscal_year_id, department_id, expenditure_category_id, is_actual)` ⚠️ PG-truncated name | Convert + key swap |
| `revenue_by_source` | Yes | `revenue_by_source_fiscal_year_id_revenue_source_id_is_actua_key` — `(fiscal_year_id, revenue_source_id, is_actual)` ⚠️ PG-truncated name | Convert + key swap |
| `millage_rates` | No | `millage_rates_fiscal_year_id_authority_key` — `(fiscal_year_id, authority)` | Add stage + widen key |
| `strategic_area_budgets` | No | `strategic_area_budgets_fiscal_year_id_strategic_area_id_key` — `(fiscal_year_id, strategic_area_id)` | Add stage + widen key |
| `budget_descriptions` | No | none (only `idx_budget_descriptions_entity` index) | Add stage column only — do NOT introduce a new unique key this phase (behavior change outside zero-change scope) |

Objects depending on `is_actual` (verified via `pg_depend` — this is the complete set):
- `search_index` (materialized view, migration 005 definition, dept subquery has `AND is_actual = false`)
- `v_department_yoy` (view, migration 003 definition, `WHERE db.is_actual = FALSE`)
- `v_strategic_area_summary` does **not** reference `is_actual` — leave it untouched.

Constraint-name portability: local and prod Neon were both built by the same migration files, so names should match — but Migration B should still be preceded by a one-line prod pre-flight (`SELECT conname FROM pg_constraint WHERE contype='u' AND conrelid::regclass::text IN (...)`) run via the direct (non-pooler) endpoint. The runner wraps each file in a transaction, so a name mismatch aborts cleanly with nothing half-applied.

### Pattern 1: Migration A — `pipeline/migrations/006_budget_stage_expand.sql` (expand only)

Keep A minimal: type, columns, backfill. No constraint changes, no view changes. The old deployed client keeps working untouched (Prisma SELECTs name only the columns in its schema; it never sees `stage`).

```sql
-- Source: verified against local schema; PG 11+ fast-path ADD COLUMN NOT NULL DEFAULT
CREATE TYPE budget_stage AS ENUM ('proposed', 'adopted', 'actual');

-- Tables converting from is_actual (backfill: true -> actual, false/NULL -> adopted)
ALTER TABLE department_budgets      ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE department_expenditures ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE revenue_by_source       ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';

UPDATE department_budgets      SET stage = 'actual' WHERE is_actual IS TRUE;
UPDATE department_expenditures SET stage = 'actual' WHERE is_actual IS TRUE;
UPDATE revenue_by_source       SET stage = 'actual' WHERE is_actual IS TRUE;

-- Tables gaining stage fresh (all existing rows are adopted-stage data)
ALTER TABLE millage_rates          ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE strategic_area_budgets ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
ALTER TABLE budget_descriptions    ADD COLUMN stage budget_stage NOT NULL DEFAULT 'adopted';
```

The backfill mapping is total: `is_actual` is `Boolean? @default(false)`, so `TRUE → 'actual'`, `FALSE`/`NULL → 'adopted'` covers every row. Row counts untouched. Pre-flight sanity query worth running before A (should return zero rows — confirms no actual-stage rows lurk in the three fresh-stage tables): check whether `millage_rates`/`strategic_area_budgets`/`budget_descriptions` have any rows for FY 2021-24 fiscal years (all three are expected to hold only FY 2024-25+ adopted-era data; if any FY 2021-24 rows exist, their stage assignment needs a decision before the backfill).

### Pattern 2: Deploy 1 — final-state schema.prisma + all code changes

**The committed schema.prisma is the deploy contract** (`pnpm build` = `prisma generate && next build`; generate reads the file, not the DB). Deploy 1 ships:

1. **schema.prisma hand-edited to final shape:** `enum budget_stage { proposed adopted actual }`; `stage budget_stage` on all six models; **`is_actual` fields deleted**; `@@unique` blocks swapped to stage with the exact `map:` names Migration B will create. Prisma tolerates DB columns not present in the schema — during the dual-column window the client simply never touches `is_actual`, which is what makes Migration B safe. The `@@unique` mismatch during the window is harmless: the web app only uses `findMany`/`findFirst`/`count`/`$queryRaw`, never compound-key `findUnique`.
2. **queries.ts — complete reader inventory** (10 touch points, not 4):

| Function | Today | Change |
|----------|-------|--------|
| `getAreaWithDepartments` (queries.ts:191) | `is_actual: false` | → `stage: 'adopted'` |
| `getDepartmentDetail` (queries.ts:321) | `is_actual: false` | → `stage: 'adopted'` |
| `getRelatedDepartments` (queries.ts:404) | `is_actual: false` | → `stage: 'adopted'` |
| `getDepartmentYoY` (queries.ts:464) | `b.is_actual ? actual : adopted` | → explicit three-way: `stage === 'actual'` → actual map, `stage === 'adopted'` → adopted map, `stage === 'proposed'` → **skip** (protects Phase 8 history charts) |
| `getRevenueSources` (queries.ts:250) | **no stage filter** | ADD `stage: 'adopted'` |
| `getMillageRates` (queries.ts:96) | **no stage filter** | ADD `stage: 'adopted'` |
| `getDepartmentExpenditures` (queries.ts:370) | **no stage filter** | ADD `stage: 'adopted'` |
| `getStrategicAreas` (queries.ts:121) `strategic_area_budgets` include | **no stage filter** | ADD `stage: 'adopted'` |
| `getAreaWithDepartments` (queries.ts:175) `strategic_area_budgets` include | **no stage filter** | ADD `stage: 'adopted'` |
| `getStrategicAreasWithDetails` (queries.ts:282) `strategic_area_budgets` include | **no stage filter** | ADD `stage: 'adopted'` |
| `getDepartmentDetail` (queries.ts:327) `budget_descriptions` lookup | **no stage filter** | ADD `stage: 'adopted'` |

   All additions are byte-invisible today (every row is adopted or actual, and the actual rows were already excluded or irrelevant) and are REQUIRED for success criterion 3. `searchBudget` needs no change (the MV pins stage internally); `sitemap.ts` reads only `departments`/`strategic_areas` (no stage columns). Update the stale comments at queries.ts:452-453 and the `sumBudgetRows`/`areaMembershipFilter` helpers stay untouched.
3. **Pipeline writers/readers** (must land before Migration B or `python -m pipeline load` breaks post-B):

| File | Sites | Change |
|------|-------|--------|
| `pipeline/load/seed.py` | 4 INSERTs (lines ~127, 273, 301, 424) write `is_actual` FALSE; millage `ON CONFLICT (fiscal_year_id, authority)` (line ~481); 5 FY-scoped DELETEs | INSERTs write `stage` from a `stage='adopted'` parameter threaded through `seed_all`; millage conflict target → `(fiscal_year_id, authority, stage)`; DELETEs gain `AND stage = %s` now (byte-invisible today, removes the Phase 13 September-wipe landmine while the file is already open) |
| `pipeline/load/seed_historical.py` | INSERT + `ON CONFLICT (fiscal_year_id, department_id, strategic_area_id, is_actual)` (line 220) + `seen_keys` tuple (line 204) | Map record's `is_actual` bool → `'actual'`/`'adopted'` at the seed layer; conflict target → `(..., stage)`; DELETE gains stage scope. Historical CSVs keep their `is_actual` column — `transform/historical.py` parsing is unchanged; only the loader maps bool → enum |
| `pipeline/load/seed_descriptions.py` | DELETE + INSERT (lines 93-114) | Both gain `stage = 'adopted'` |
| `pipeline/verify/checker.py` | 4 sites `is_actual = FALSE` (lines 61, 100, 150, 180) | → `stage = 'adopted'` |
| `pipeline/generate/descriptions.py` | 2 sites `is_actual = FALSE` (lines 82, 99) | → `stage = 'adopted'` |

4. **Prod ordering:** Migration A must be applied to prod **before** Deploy 1 is triggered — the Vercel build prerenders ~70 static pages against Neon at build time using the new client, and would fail loudly ("column stage does not exist") if A hasn't run. That failure mode is a build failure, not a live-site error — acceptable but avoidable by sequencing.

### Pattern 3: Migration B — `pipeline/migrations/007_budget_stage_contract.sql` (contract)

Order matters — PG refuses `DROP COLUMN` while dependent views exist:

```sql
-- 1. Drop the only two objects that reference is_actual (verified via pg_depend)
DROP MATERIALIZED VIEW search_index;
DROP VIEW v_department_yoy;

-- 2. Swap unique keys (EXACT live names — two are PG-truncated)
ALTER TABLE department_budgets
    DROP CONSTRAINT department_budgets_fy_dept_area_actual_key,
    ADD CONSTRAINT department_budgets_fy_dept_area_stage_key
        UNIQUE (fiscal_year_id, department_id, strategic_area_id, stage);
ALTER TABLE department_expenditures
    DROP CONSTRAINT department_expenditures_fiscal_year_id_department_id_expend_key,
    ADD CONSTRAINT department_expenditures_fy_dept_cat_stage_key
        UNIQUE (fiscal_year_id, department_id, expenditure_category_id, stage);
ALTER TABLE revenue_by_source
    DROP CONSTRAINT revenue_by_source_fiscal_year_id_revenue_source_id_is_actua_key,
    ADD CONSTRAINT revenue_by_source_fy_source_stage_key
        UNIQUE (fiscal_year_id, revenue_source_id, stage);
ALTER TABLE millage_rates
    DROP CONSTRAINT millage_rates_fiscal_year_id_authority_key,
    ADD CONSTRAINT millage_rates_fy_authority_stage_key
        UNIQUE (fiscal_year_id, authority, stage);
ALTER TABLE strategic_area_budgets
    DROP CONSTRAINT strategic_area_budgets_fiscal_year_id_strategic_area_id_key,
    ADD CONSTRAINT strategic_area_budgets_fy_area_stage_key
        UNIQUE (fiscal_year_id, strategic_area_id, stage);

-- 3. Drop the boolean
ALTER TABLE department_budgets      DROP COLUMN is_actual;
ALTER TABLE department_expenditures DROP COLUMN is_actual;
ALTER TABLE revenue_by_source       DROP COLUMN is_actual;

-- 4. Drop the transitional defaults: future INSERTs must state their stage explicitly
ALTER TABLE department_budgets      ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE department_expenditures ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE revenue_by_source       ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE millage_rates           ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE strategic_area_budgets  ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE budget_descriptions     ALTER COLUMN stage DROP DEFAULT;

-- 5. Recreate v_department_yoy: migration 003 definition with
--    WHERE db.stage = 'adopted' replacing WHERE db.is_actual = FALSE
-- 6. Recreate search_index: migration 005 definition with
--    AND stage = 'adopted' replacing AND is_actual = false in the dept subquery
--    (CREATE MATERIALIZED VIEW populates WITH DATA by default; no separate REFRESH needed)
CREATE INDEX idx_search_index_fts ON search_index USING gin(search_vector);
```

Key swap safety: the old and new keys are bijective per row group (`is_actual` true/false maps injectively to actual/adopted), so the new constraints cannot fail on existing data. Nothing writes during the dual-column window (no pipeline loads are scheduled between A and B in this phase). The new unique constraints implicitly create indexes replacing the old ones.

After B: `prisma db pull` then `git diff --exit-code prisma/schema.prisma` must be clean — proving the hand-written Deploy 1 schema and the actual DB converged. That's the compile-time-gate handoff Phase 8 depends on. (One wrinkle: `db pull` orders models/fields per introspection rules; write the Deploy 1 schema by copying db-pull output style — field order matches the DB column order, new columns appear last.)

### Pattern 4: Snapshot tool — `budget-explorer-web/scripts/snapshot.mjs`

**Location:** `budget-explorer-web/scripts/` (directory doesn't exist yet — create it). Wire package.json scripts: `"snapshot": "node scripts/snapshot.mjs"` (subcommands: `capture --base <url> --out <label>`, `diff <labelA> <labelB> [--normalize]`). Zero dependencies (Node ≥18 global fetch). Snapshots land in `budget-explorer-web/.snapshots/<label>/` — add `.snapshots/` to `.gitignore`.

**URL enumeration:** fetch `${base}/sitemap.xml`, extract `<loc>` values with a regex, rewrite each URL's origin to `--base` (sitemap URLs carry `CANONICAL_DOMAIN`, which differs from `http://localhost:3000`). Sitemap already covers all page types: `/`, `/explorer`, `/explorer/[slug]` per area, `/department/[slug]` per department, `/calculator`, `/glossary`, `/search`. Do NOT diff sitemap.xml itself — it embeds `new Date()` per request (sitemap.ts:14 etc.), the only dynamic-bytes source found.

**Dynamic-bytes audit of page HTML (verified by grep):** no `new Date()`, `Date.now()`, or `Math.random()` in any page render path. `AiDescription.tsx:42` renders a date, but from the DB's `generated_at` — stable unless data changes. All `toLocaleString` calls run server-side on one machine — deterministic. **Within a single build, repeated fetches are byte-identical; no normalization needed.**

**Two-tier diff (the core design):**
- **Tier 0 — raw byte compare** (SHA-256 per page + full-file diff on mismatch). Valid whenever both snapshots come from the *same build*. This is the true "byte-identical" gate.
- **Tier 1 — normalized compare**, for cross-build comparisons (old code vs Deploy 1 code): strip `<script>...</script>` bodies and normalize `/_next/static/...` asset URLs to placeholders, then byte-compare the remainder. All user-visible content is server-rendered outside script tags; what Tier 1 removes is exactly the build-artifact noise (buildId in asset paths, hashed chunk filenames, RSC flight-payload chunk references). This is the "normalized by the script, not excused by hand" mechanism the locked decision requires.

**The local `next start` trap (critical):** static pages are prerendered at build time — `next start` serves HTML baked into `.next/`, so migrating the DB under a running server changes *nothing* in what it serves. Every post-change local snapshot requires a **rebuild** (`pnpm build && pnpm start`). Rebuilds get a fresh random Next.js buildId, which changes asset URLs even for identical code. Two options, in preference order:
1. Pin `generateBuildId` in `next.config.ts` (e.g., return a constant or the git SHA) — same-code rebuilds then become byte-stable and Tier 0 works across rebuilds. ⚠️ This is a config change: per the developer's guardrails, surface it for approval in the plan rather than silently including it.
2. Without pinning, use Tier 1 for any cross-rebuild comparison. Tier 1 is the guaranteed-correct fallback either way (Turbopack chunk-hash determinism across rebuilds is believed but not verified — see Open Questions).

**Local verification choreography:**
1. Baseline: old code, pre-migration DB → build → `snapshot capture --out local-baseline`
2. Apply Migration A → rebuild (same old code) → capture `local-post-A` → **Tier 0 vs baseline** (with pinned buildId; else Tier 1) — proves A is invisible
3. Check out Deploy 1 code → build → capture `local-deploy1` → **Tier 1 vs baseline** — proves the code swap is invisible
4. Apply Migration B → rebuild (Deploy 1 code) → capture `local-post-B` → **Tier 0 vs local-deploy1** — proves B is invisible
5. `python -m pipeline verify` still passes (checker now reads `stage = 'adopted'`)

**Prod choreography (static pages don't re-render on migration, which simplifies things):**
1. `snapshot capture --base https://<prod> --out prod-baseline`
2. Run Migration A on Neon (direct endpoint, `DATABASE_URL_PROD`). Static pages unchanged by construction; spot-check `/search` (force-dynamic, hits DB per request) still works.
3. Trigger Deploy 1 → capture `prod-deploy1` → **Tier 1 vs prod-baseline**
4. Same day: run Migration B → capture `prod-post-B` → **Tier 0 vs prod-deploy1** (same deployed build — raw byte-identical expected) and exercise `/search` (proves the recreated MV serves). No MV refresh needed (CREATE populates); no redeploy strictly needed (deployed code never references `is_actual`; ISR re-renders within 24h work against the post-B schema).

**Proposed-row probe (success criterion 3):** a companion script (`scripts/stage-probe.sql` or a flag on snapshot.mjs) that, against a scratch DB (`createdb budget_explorer_probe -T budget_explorer`), inserts one `stage='proposed'` row into each of the six tables (a FY 2025-26 proposed department_budgets row with a large distinctive amount, a proposed revenue row, proposed millage authority, proposed area budget, proposed expenditure, proposed description), rebuilds + recrawls, and asserts Tier-0 identity with the pre-probe snapshot. This directly exercises the ten stage filters — without the six newly-added filters, the probe FAILS on revenue/millage/expenditure/area pages.

### Anti-Patterns to Avoid
- **Shipping Deploy 1 with `is_actual` still in schema.prisma:** Migration B then breaks the live `/search` page at the moment the column drops (Prisma SELECTs explicitly list schema columns). The field must be absent from Deploy 1's schema.
- **Running `prisma db pull` during the dual-column window and committing the result:** it re-adds `is_actual` and the old unique keys. `db pull` is a *post-B verification* tool in this phase, not the Deploy 1 schema source.
- **Swapping constraints or recreating views in Migration A:** keeps the old client's world intact is the whole point of A; all destructive/DDL-visible work belongs in B.
- **Comparing snapshots across builds without normalization** and concluding the migration broke something: buildId/chunk hashes differ by construction.
- **`next dev` for snapshots:** dev-mode HTML includes HMR/react-refresh scaffolding and differs from production output. Always `pnpm build && pnpm start`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration tracking/ordering | A new migration harness or Prisma Migrate adoption | Existing `python -m pipeline migrate` runner | Already transactional-per-file with `_migrations` tracking on both DBs; introducing Prisma Migrate mid-project would fight the raw-SQL-canonical convention |
| Stage typing in TS | Hand-written string-union types for stage | Prisma-generated enum from `db pull` | The generated enum IS the drift gate; a parallel hand-written type can drift from the DB |
| Finding stale `is_actual` call sites | Manual code audit | `pnpm exec tsc --noEmit` after the schema swap + `rg is_actual` allowlist gate | The regenerated client makes every stale site a compile error — the type system is the checklist |
| Full XML sitemap parsing | xml2js or similar | A `<loc>` regex over sitemap.xml | The sitemap is machine-generated with a fixed shape; a dependency is overkill |
| HTML structural diffing | DOM-aware diff library | Byte compare (Tier 0) + script-strip normalization (Tier 1) | The requirement is byte-identity, not semantic similarity — a smarter differ would *weaken* the gate |

**Key insight:** every verification layer in this phase should be dumb and absolute (byte equality, compile success, zero grep hits, zero schema diff). Clever comparisons create places for drift to hide — the July audit lesson.

## Common Pitfalls

### Pitfall 1: Deployed client selects a dropped column
**What goes wrong:** Migration B drops `is_actual`; the live site's Prisma client still lists it in generated SELECTs; `/search` (force-dynamic) and any ISR revalidation start throwing immediately.
**Why it happens:** Prisma generates explicit column lists from schema.prisma; "the code doesn't *filter* on is_actual anymore" is not enough — the field must not exist in the schema.
**How to avoid:** Deploy 1 ships final-state schema.prisma with `is_actual` fields deleted. Migration B is then provably unable to break the running site.
**Warning signs:** any `is_actual` string in `prisma/schema.prisma` at Deploy 1 review time.

### Pitfall 2: Guessed constraint names in Migration B
**What goes wrong:** `DROP CONSTRAINT revenue_by_source_fiscal_year_id_revenue_source_id_is_actual_key` fails — the real name is truncated to `...is_actua_key` (PG 63-byte identifier limit); the migration transaction aborts.
**How to avoid:** use the exact names verified in this research (table above); pre-flight the same `pg_constraint` query against prod before running B.
**Warning signs:** constraint names in migration SQL longer than 63 characters.

### Pitfall 3: DROP COLUMN blocked by dependent views
**What goes wrong:** `ALTER TABLE ... DROP COLUMN is_actual` errors with "cannot drop ... because other objects depend on it".
**How to avoid:** drop `search_index` and `v_department_yoy` first (verified complete dependency set), recreate after. Never reach for `CASCADE` — explicit drops keep the recreation list honest.

### Pitfall 4: Stale prerendered HTML masquerading as "byte-identical"
**What goes wrong:** snapshot after a migration matches baseline — but only because `next start` (locally) or the Vercel static cache (prod) is serving pre-migration HTML. The gate passes without testing anything.
**How to avoid:** locally, rebuild before every capture. On prod, understand what each comparison proves: post-A static pages are *expected* untouched (spot-check `/search` instead); the real prod render-against-new-schema proof is Deploy 1's build itself (it prerenders all ~70 pages against the migrated DB and fails the build on any query error).

### Pitfall 5: The six stage-less readers (success criterion 3 killer)
**What goes wrong:** the migration converts the 4 documented `is_actual` sites, criterion 2 passes — then the test proposed row appears in the revenue donut, millage table, expenditure breakdown, and area budget figures.
**Why it happens:** `getRevenueSources`, `getMillageRates`, `getDepartmentExpenditures`, three `strategic_area_budgets` joins, and the `budget_descriptions` lookup filter only by fiscal year today because stage never varied within a year before.
**How to avoid:** add `stage: 'adopted'` to all of them in Deploy 1 (table in Pattern 2); the proposed-row probe exists precisely to catch any missed site.

### Pitfall 6: Transitional DEFAULT left in place
**What goes wrong:** `stage` keeps `DEFAULT 'adopted'` forever; a future loader (or Phase 8 seeder bug) that omits stage silently writes adopted rows — the exact silent-drift class this phase eliminates.
**How to avoid:** Migration B drops the default on all six tables; INSERTs must state stage explicitly from then on.

### Pitfall 7: Loaders broken between B and their rewrite
**What goes wrong:** Migration B lands but seed.py still INSERTs `is_actual` → next pipeline run crashes (or worse, Phase 8 starts on broken loaders).
**How to avoid:** all pipeline writer/reader rewrites (seed.py, seed_historical.py, seed_descriptions.py, checker.py, generate/descriptions.py) land in Deploy 1's commit, before B runs. Post-B, run `python -m pipeline verify` as proof the pipeline speaks stage.

### Pitfall 8: Committing db-pull output mid-window
**What goes wrong:** someone runs `prisma db pull` between A and B "to sync" — it resurrects `is_actual` and the old keys in schema.prisma, silently reverting Deploy 1's contract.
**How to avoid:** the plan should state explicitly: `db pull` runs exactly once, *after* Migration B, as a no-diff verification.

## Code Examples

### Post-B convergence check (the compile-time-gate handoff to Phase 8)
```bash
# Source: repo conventions (prisma.config.ts reads DATABASE_URL via dotenv)
cd budget-explorer-web
pnpm exec prisma db pull          # rewrites prisma/schema.prisma from the migrated DB
git diff --exit-code prisma/schema.prisma   # MUST be empty: hand-written Deploy 1 schema == reality
pnpm exec prisma generate
pnpm exec tsc --noEmit            # zero errors: no stale is_actual call sites can exist
```

### Zero-reference gate (phase success criterion 2)
```bash
# Allowlist: historical CSV data files + transform/historical.py (CSV column parsing,
# mapped to stage at the seed layer) remain legitimately; everything else must be zero.
rg -l "is_actual" --glob '!*.md' --glob '!.planning/**' --glob '!pipeline/data/**' \
   budget-explorer-web/src budget-explorer-web/prisma pipeline
# Expected output: pipeline/transform/historical.py only (or empty if the plan renames the CSV field mapping)
```

### Schema state assertion (runnable against local and prod)
```sql
-- is_actual fully gone; stage present on all six tables
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name IN ('is_actual', 'stage')
  AND table_name IN ('department_budgets','department_expenditures','revenue_by_source',
                     'millage_rates','strategic_area_budgets','budget_descriptions')
ORDER BY column_name, table_name;
-- Expect: exactly 6 'stage' rows, zero 'is_actual' rows
```

### getDepartmentYoY three-way stage handling (the one non-mechanical TS edit)
```typescript
// queries.ts:464 today:  const byYear = b.is_actual ? actual : adopted
// Deploy 1 — explicit about all three enum members so Phase 8 proposed rows
// can never leak into the history chart:
if (b.stage === 'proposed') continue
const byYear = b.stage === 'actual' ? actual : adopted
```
(Note: the `yearLabels` push at queries.ts:461 must also move below the skip so a proposed-only year never registers a label — byte-invisible today, correct for Phase 8.)

## State of the Art

| Old Approach (this repo, v1.0-1.1) | Current Approach (this phase) | Impact |
|--------------|------------------|--------|
| Stage encoded as `is_actual` boolean, two states | `budget_stage` enum, three states, typed end-to-end | Third state (proposed) becomes representable; typos become compile errors |
| Verification = pipeline totals vs published PDF figures | + full-crawl byte-identical snapshot gate | Silent data-shape drift between pipeline and web (root cause of every high-severity July-audit bug) becomes mechanically detectable |
| Single-step migrations (001-005 each self-contained) | Two-step expand/contract with a deploy between | First migration in this repo coordinated with a code deploy; the pattern to reuse if schema+code ever move together again |

Nothing external deprecated or changed: Prisma 7.4.2, Next 16.1.6, Neon, and the pipeline runner all behave as already established in the repo.

## Open Questions

1. **Turbopack rebuild determinism (affects Tier 0 vs Tier 1 locally)**
   - What we know: Next.js buildId is random per build unless `generateBuildId` is configured; chunk hashes are content-derived.
   - What's unclear: whether pinning buildId makes same-code rebuilds fully byte-identical under Next 16/Turbopack (unverified against this exact toolchain).
   - Recommendation: plan Tier 1 (normalized) as the required gate for any cross-rebuild comparison, and treat raw Tier-0 equality across rebuilds as a bonus if pinning works. First local run will answer this empirically in minutes. Also: `generateBuildId` is a `next.config.ts` change — surface for Diego's approval per his config-change guardrail.

2. **Pre-backfill data audit on the three fresh-stage tables**
   - What we know: `millage_rates`, `strategic_area_budgets`, `budget_descriptions` are believed to hold only FY 2024-25+ adopted-era rows (their seeders only run for current-FY loads).
   - What's unclear: whether any stray FY 2021-24 rows exist that "DEFAULT 'adopted'" would mislabel as adopted rather than actual.
   - Recommendation: one SELECT-count-by-fiscal-year per table as a Migration A pre-flight, local and prod. If any early-FY rows appear, extend the backfill with a fiscal-year-based `SET stage='actual'` for them.

3. **`fiscal_year_stages` table (sketched in ARCHITECTURE.md migration 006)**
   - What we know: it solves stage-scoped countywide totals — which is DATA-03, mapped to Phase 8.
   - Recommendation: **exclude from Phase 7.** DATA-01 names six tables; scope lock and the zero-user-visible-change bar both argue for deferring the new table to Phase 8's migration. Nothing in Phase 7 depends on it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (web) | Vitest 4.0.18, configured (`budget-explorer-web/vitest.config.ts`, globals on, `@` alias) |
| Framework (pipeline) | pytest ≥8.0.0 installed; `pipeline/tests/` empty |
| Quick run command | `cd budget-explorer-web && pnpm exec vitest run` |
| Full suite command | `cd budget-explorer-web && pnpm exec tsc --noEmit && pnpm exec vitest run && pnpm lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Every existing page byte-identical after migration | snapshot regression | `node scripts/snapshot.mjs diff <a> <b>` (Tier 0/1 per choreography) | ❌ Wave 0 |
| DATA-01 | `budget_stage` fully replaces `is_actual` in the DB | SQL assertion | `psql "$DATABASE_URL" -f scripts/assert-stage-schema.sql` (information_schema query above; expect 6/0) | ❌ Wave 0 |
| DATA-01 | Zero stale `is_actual` references in code | grep gate | `rg is_actual` allowlist command (Code Examples) — expect allowlist-only | ✅ (rg available) |
| DATA-01 | Prisma schema converged with migrated DB | schema diff | `pnpm exec prisma db pull && git diff --exit-code prisma/schema.prisma` | ✅ (tooling exists) |
| DATA-01 | No stale call sites can compile | type check | `pnpm exec tsc --noEmit` | ✅ |
| DATA-01 | Test proposed row changes nothing user-visible | probe + snapshot | probe script inserts 1 proposed row per table into scratch DB → rebuild → crawl → Tier-0 diff | ❌ Wave 0 |
| DATA-01 | Pipeline totals still verify post-migration | integration | `python -m pipeline verify` | ✅ (existing checker, updated to stage) |
| DATA-01 | Existing unit tests unaffected | unit | `pnpm exec vitest run` | ✅ (tax-math.test.ts) |

### Sampling Rate
- **Per task commit:** `pnpm exec tsc --noEmit && pnpm exec vitest run` (< 30s)
- **Per wave merge:** full local snapshot capture + diff for the wave's comparison pair, plus the grep gate
- **Phase gate:** complete local choreography (steps 1-5) + prod choreography (steps 1-4) + proposed-row probe + `python -m pipeline verify` + db-pull no-diff — all green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `budget-explorer-web/scripts/snapshot.mjs` — capture + two-tier diff; covers the byte-identical gate for this phase and Phases 8-13
- [ ] `budget-explorer-web/scripts/assert-stage-schema.sql` (or inline psql in a task) — schema-state assertion
- [ ] Proposed-row probe (SQL fixture + scratch-DB recipe `createdb budget_explorer_probe -T budget_explorer`)
- [ ] **Baseline capture must run BEFORE any migration task** — the pre-migration snapshot cannot be recreated after the fact
- [ ] Framework install: none needed

## Sources

### Primary (HIGH confidence — direct reads / live queries, 2026-07-18)
- Live local Postgres catalog: `pg_constraint` (exact unique-constraint names incl. two PG-truncated names), `pg_depend` (complete is_actual view-dependency set: `search_index`, `v_department_yoy` only)
- `budget-explorer-web/prisma/schema.prisma` — all six models, nullable `is_actual Boolean? @default(false)`, unique keys, `prisma-client` generator to `src/generated/prisma`
- `budget-explorer-web/src/lib/db/queries.ts` — full reader inventory (10 stage-relevant sites), helper functions, raw-SQL search
- `budget-explorer-web/src/lib/prisma.ts`, `prisma.config.ts`, `package.json` (`build: prisma generate && next build`), `vercel.json`, `vitest.config.ts`
- `pipeline/migrations/001_initial_schema.sql`, `003_appendix_integration.sql`, `004/005_search_index*.sql` — view/MV definitions to recreate, constraint evolution precedent
- `pipeline/load/db.py` (runner: per-file transaction + `_migrations`), `cli.py`, `seed.py`, `seed_historical.py`, `seed_descriptions.py`, plus grep-verified `checker.py` and `generate/descriptions.py` `is_actual` sites
- App route scan: `revalidate = 86400` on 4 routes, `force-dynamic` on `/search`, `generateStaticParams` on department + area pages; grep-verified absence of per-request dynamic bytes in page renders
- `CLAUDE.md` (project) — prod ops runbook (direct Neon endpoint, MV refresh, redeploy), data-model invariants

### Secondary (MEDIUM-HIGH — verified with official docs via search)
- Prisma 7 (released 2025-11-19): `prisma.config.ts` required, `prisma-client` generator ESM default, PG enums natively introspected (with new `@map` support on enum members) — [Prisma introspection docs](https://www.prisma.io/docs/orm/prisma-schema/introspection), [prisma db pull reference](https://www.prisma.io/docs/cli/db/pull), [Prisma 7.0.0 release notes](https://www.gitclear.com/open_repos/prisma/prisma/release/7.0.0)

### Tertiary (training knowledge, standard-behavior claims)
- PG 11+ fast-path for `ADD COLUMN NOT NULL DEFAULT`; PG 12+ `ALTER TYPE ... ADD VALUE` in transactions (new value unusable same-txn); 63-byte identifier truncation; `DROP COLUMN` blocked by dependent views; `CREATE MATERIALIZED VIEW` populates by default — all long-stable documented PostgreSQL behavior
- Next.js: random per-build buildId unless `generateBuildId` set; `next start` serves build-time prerendered HTML — stable documented behavior; the Turbopack-determinism corollary is flagged LOW/empirical in Open Questions

## Metadata

**Confidence breakdown:**
- Table/constraint/dependency inventory: HIGH — queried from the live database, not inferred
- Migration A/B choreography + Deploy 1 schema contract: HIGH — mechanical consequences of verified Prisma/PG behavior
- Reader/writer call-site inventory: HIGH — exhaustive grep + file reads; the six extra stage-less readers are the key addition over prior research
- Snapshot tool design: HIGH on architecture, MEDIUM on cross-rebuild byte-determinism (Tier 1 normalization is the guaranteed fallback; first local run resolves it)
- Validation architecture: HIGH — commands verified against installed tooling

**Research date:** 2026-07-18
**Valid until:** ~2026-08-18 (stable stack; re-verify only if Prisma/Next majors bump or prod schema is touched outside this phase)
