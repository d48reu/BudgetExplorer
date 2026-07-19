---
phase: 7
slug: stage-aware-schema-foundation
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-18
updated: 2026-07-19
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (web, existing tests) + phase-built snapshot diff tool (`scripts/snapshot.mjs`) + `python -m pipeline verify` (pipeline oracle — note: `pipeline/tests/` is empty; the "70 pytest tests" in the draft was incorrect) |
| **Config file** | budget-explorer-web/vitest.config.ts; snapshot tool — Wave 1 (plan 07-01) installs |
| **Quick run command** | `cd budget-explorer-web && pnpm exec tsc --noEmit && pnpm exec vitest run` |
| **Full suite command** | tsc + vitest + `python -m pipeline verify` + `node scripts/snapshot.mjs diff <pair> [--normalize]` per choreography |
| **Estimated runtime** | ~90 seconds (snapshot crawl dominates; tsc+vitest+verify < 30s) |

---

## Sampling Rate

- **After every task commit:** tsc + vitest when web code changed; py_compile + `python -m pipeline verify` when pipeline code changed
- **After every plan wave:** snapshot diff for that wave's comparison pair (see map below)
- **Before `/gsd:verify-work`:** full local choreography green (baseline → post-A → deploy1 → post-B → probe) AND prod choreography green (baseline → deploy1 → post-B)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Build snapshot.mjs | 07-01 | 1 | DATA-01 | fixture self-test | `node scripts/snapshot.mjs diff fixture-a fixture-b` (Tier 0 fails / Tier 1 passes) | ❌ W0 — this task creates it | ⬜ pending |
| Capture local baseline | 07-01 | 1 | DATA-01 | determinism proof | `node scripts/snapshot.mjs diff local-baseline local-baseline-check` (Tier 0) + page count ≥ 60 | ❌ W0 | ⬜ pending |
| Pre-flight audits | 07-01 | 1 | DATA-01 | SQL assertion | pg_constraint name diff vs expected five names (local + prod) | ✅ psql | ⬜ pending |
| Write/apply 006 | 07-02 | 2 | DATA-01 | SQL assertion | information_schema stage-column count = 6; backfill counts stage='actual' == is_actual=true per table | ✅ psql | ⬜ pending |
| Post-A invisibility | 07-02 | 2 | DATA-01 | snapshot regression | `node scripts/snapshot.mjs diff local-baseline local-post-A --normalize` + `python -m pipeline verify` | dep: 07-01 | ⬜ pending |
| Final-state schema.prisma | 07-03 | 3 | DATA-01 | generate + grep | `pnpm exec prisma generate` + zero is_actual in schema + 5 `_stage_key` maps | ✅ | ⬜ pending |
| queries.ts stage filters | 07-03 | 3 | DATA-01 | type check + unit | `pnpm exec tsc --noEmit && pnpm exec vitest run` + exactly 10 `stage: 'adopted'` | ✅ | ⬜ pending |
| Deploy1 invisibility | 07-03 | 3 | DATA-01 | snapshot regression | `node scripts/snapshot.mjs diff local-baseline local-deploy1 --normalize` | dep: 07-01 | ⬜ pending |
| Seeder rewrites | 07-04 | 3 | DATA-01 | compile + grep | `python -m py_compile` on 3 seeders + is_actual grep gates + stage conflict-target grep | ✅ | ⬜ pending |
| Checker/generator rewrites | 07-04 | 3 | DATA-01 | integration | `python -m pipeline verify` (stage-scoped, post-A DB) | ✅ | ⬜ pending |
| Write/apply 007 | 07-05 | 4 | DATA-01 | SQL assertion | 0 is_actual columns / 5 stage keys / 0 stage defaults / search_index + v_department_yoy serve | ✅ psql | ⬜ pending |
| Convergence gate | 07-05 | 4 | DATA-01 | schema diff + full suite | `prisma db pull && git diff --exit-code prisma/schema.prisma` + tsc + vitest + verify + rg allowlist + post-B snapshot diff | ✅ | ⬜ pending |
| Proposed-row probe | 07-05 | 4 | DATA-01 | probe + snapshot | scratch DB + stage-probe.sql + `diff probe-pre probe-post --normalize` | ❌ W0-class — created in-task | ⬜ pending |
| Prod pre-flight + Migration A | 07-06 | 5 | DATA-01 | SQL assertion | prod stage-column count = 6 + `_migrations` has 006 | ✅ psql | ⬜ pending |
| Deploy 1 push + verify | 07-06 | 5 | DATA-01 | snapshot regression | `node scripts/snapshot.mjs diff prod-baseline prod-deploy1 --normalize` | dep: 07-01 | ⬜ pending |
| Prod Migration B + report | 07-06 | 5 | DATA-01 | SQL + raw snapshot | prod 0 is_actual / 5 stage keys / MV populated + `diff prod-deploy1 prod-post-B` (raw Tier 0) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Covered by plan 07-01 (wave 1, hard-gated before any schema change — 07-02+ all depend on it):

- [ ] Snapshot diff tool (sitemap-driven full crawl, two-tier normalization per 07-RESEARCH.md)
- [ ] Pre-migration local baseline captured BEFORE any migration lands (cannot be recreated after)
- [ ] Pre-flight audit queries: stray-row check for the three fresh-stage tables + constraint-name verification (local + prod)

Proposed-row probe fixture (`scripts/stage-probe.sql`) is created in 07-05 Task 3 — it can only run post-Migration-B (needs stage-inclusive unique keys), so it is not a Wave 0 artifact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None — all gates automated | DATA-01 | Prod rollout sequencing (A → deploy → B same day) is operator-driven by Claude per standing authorization, but every step's check is an automated command in 07-06 | Rollout report in 07-06-SUMMARY is the human-review artifact |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (plan 07-01, wave 1, blocks everything downstream)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned 2026-07-19 (plans 07-01 .. 07-06)
