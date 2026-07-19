---
phase: 7
slug: stage-aware-schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (web, existing 16 tests) + pytest (pipeline, existing 70 tests) + phase-built snapshot diff tool |
| **Config file** | budget-explorer-web/vitest.config.ts; pytest via pipeline defaults; snapshot tool — Wave 0 installs |
| **Quick run command** | `cd budget-explorer-web && node_modules/.bin/vitest run` and `python3 -m pytest tests/ -q` |
| **Full suite command** | vitest + pytest + `node_modules/.bin/tsc --noEmit` + snapshot diff against baseline |
| **Estimated runtime** | ~90 seconds (snapshot crawl dominates; vitest+pytest+tsc < 30s) |

---

## Sampling Rate

- **After every task commit:** Run the quick commands (vitest + pytest) plus `tsc --noEmit` when web code changed
- **After every plan wave:** Full suite including snapshot diff vs the pre-phase baseline
- **Before `/gsd:verify-work`:** Full suite green AND snapshot diff clean on local build; prod snapshots clean post-rollout
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| (populated by planner — every DATA-01 task must reference snapshot diff, tsc, or suite runs) | | | DATA-01 | | | ❌ W0 (snapshot tool) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Snapshot diff tool (sitemap-driven full crawl, two-tier normalization per 07-RESEARCH.md) — this IS the phase's primary oracle and must exist and capture the **pre-migration baseline** before any schema change lands
- [ ] Pre-flight audit queries: stray-row check for the three tables gaining a fresh stage column (per research open question 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production rollout sequence (Migration A → deploy → snapshot verify → Migration B same day) | DATA-01 | Involves live Neon + Vercel deploy timing; automated pieces run inside a human-observed sequence | Follow the choreography in 07-RESEARCH.md; each step's own check is automated, the sequencing is operator-driven |
| Live site never errors during transition | DATA-01 | Requires watching prod during the dual-column window | Spot-check homepage + /search + one department page between Migration A and Migration B; prod snapshot crawl after |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
