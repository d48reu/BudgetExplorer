# Phase 7: Stage-Aware Schema Foundation - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Budget stage (proposed/adopted/actual) becomes an explicit, first-class dimension replacing the `is_actual` boolean across `department_budgets`, `strategic_area_budgets`, `millage_rates`, `revenue_by_source`, `department_expenditures`, and `budget_descriptions` — including unique keys, views (`v_department_yoy`, `v_strategic_area_summary`), the `search_index` materialized view, all Prisma queries, and the pipeline loaders. Zero user-visible change: every existing page renders byte-identical. No FY 2026-27 data loads in this phase (that is Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Production rollout
- Phase 7 ships to production Neon **immediately** once local verification passes — it does not wait for Phase 8. Rationale: if anything is wrong with the stage model, find out in July with zero proposed data at stake.
- **Standing authorization for this milestone:** Claude runs production migrations/loads/redeploys via `DATABASE_URL_PROD` when a phase's verification passes, and reports results — the pattern established in the 2026-07-18 session. No per-touch approval needed; results always reported.

### Migration downtime strategy
- **Two-step expand/contract, zero downtime.** Migration A adds the `budget_stage` enum column alongside `is_actual` and backfills (`is_actual=true` → 'actual', `is_actual=false` → 'adopted'); deploy code that reads `stage`; Migration B drops `is_actual` and swaps the unique keys.
- **Migration B runs the same day as the verified deploy.** The dual-column window lasts hours, not days — Phase 8 must start against a schema where stale `is_actual` references are impossible (compile-time failure via regenerated Prisma types).
- The public site must never error during the transition.

### Verification standard
- **Automated snapshot diff, full crawl.** A script fetches every page's HTML (sitemap-driven: all 53 department pages, 9 area pages, homepage, explorer, calculator, glossary, search shell — ~70 pages) before and after migration, and diffs byte-for-byte. Run locally first, then against prod.
- The snapshot tool is built as a **reusable regression gate** — Phases 8–13 each use it to prove adopted pages were not disturbed.
- Dynamic content that legitimately varies between fetches (if any) must be normalized by the script, not excused by hand.

### Claude's Discretion
- Enum mechanics (Postgres enum type vs check-constrained text), backfill SQL, index/constraint naming
- How the snapshot script normalizes any legitimately-dynamic bytes
- Prisma regeneration flow and TypeScript migration of the 4+ `is_actual` call sites in queries.ts
- View/materialized-view recreation order

</decisions>

<specifics>
## Specific Ideas

- The "byte-identical" gate exists because of the July audit lesson: silent data-shape drift between pipeline and web was the root of every high-severity bug. Phase 7's whole job is making the next drift impossible to write without a compile error.
- Architecture research (.planning/research/ARCHITECTURE.md) sketches migration 006/007 and argues for dropping the boolean specifically so stale call sites fail loudly — that reasoning is endorsed, now with the two-step sequencing above layered on for zero downtime.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline/migrations/` runner (`python -m pipeline migrate`) with `_migrations` tracking — migrations 006/007 slot in
- `budget-explorer-web/src/lib/db/queries.ts` — `sumBudgetRows()` / `areaMembershipFilter()` helpers survive unchanged; the `is_actual: false` filters (4 call sites: getAreaWithDepartments, getDepartmentDetail, getRelatedDepartments, getDepartmentYoY) become `stage: 'adopted'`; getDepartmentYoY's adopted/actual merge logic maps directly onto the enum
- Prod ops pattern from 2026-07-18: `DATABASE_URL_PROD` in root `.env`, direct (non-pooler) endpoint for migrations, `prod_env.sh`-style env swap, post-change `REFRESH MATERIALIZED VIEW search_index` + Vercel redeploy

### Established Patterns
- All monetary values BigInt cents; `is_actual` semantics: FY 2021-24 actual, FY 2024-25+ adopted (the backfill mapping)
- Unique keys embedding `is_actual` on `department_budgets`, `department_expenditures`, `revenue_by_source` — each must swap to `stage`
- Migration 003 views and migration 005 search_index reference `is_actual` — must be recreated in Migration B
- Pages are static with daily ISR — snapshot comparison must fetch fresh renders (dev server or revalidated prod), not stale cache

### Integration Points
- `pipeline/load/seed.py`, `seed_historical.py`, `seed_descriptions.py` write `is_actual` — loaders switch to writing `stage` in Migration A's window (write both) then stage-only
- Vercel deploy pipeline (`prisma generate` runs in build) — deploy sequencing is: Migration A → deploy → verify snapshots → Migration B same day

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-stage-aware-schema-foundation*
*Context gathered: 2026-07-18*
