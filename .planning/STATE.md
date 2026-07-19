---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: FY 2026-27 Proposed Budget
status: executing
stopped_at: Completed 07-03-PLAN.md
last_updated: "2026-07-19T04:28:41.794Z"
last_activity: "2026-07-19 -- 07-03 complete (Deploy 1 web contract: final-state schema.prisma + stage-scoped reader queries, render-invisible)"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 6
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-18)

**Core value:** Residents can instantly see how their specific tax dollars fund county services -- from the total budget down to individual departments -- without reading a single PDF.
**Current focus:** v1.2 FY 2026-27 Proposed Budget -- ship the diff-centric /proposed section before the Sept 3 & 17 budget hearings

## Current Position

Phase: 7 of 13 (Stage-Aware Schema Foundation) -- in progress
Plan: 3 of 6 complete (07-04 in parallel wave; next: 07-05)
Status: Executing phase 7 plans
Last activity: 2026-07-19 -- 07-03 complete (Deploy 1 web contract: final-state schema.prisma + stage-scoped reader queries, 69/69 render-identical)

Progress: [------------------------------] 0/7 v1.2 phases

## Performance Metrics

**Velocity (cumulative):**
- Total plans completed: 18 (8 v1.0 + 10 v1.1)
- Average duration: 4 min
- Total execution time: ~1.1 hours

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.
v1.0 decisions archived in milestones/v1.0-ROADMAP.md.
v1.1 decisions archived in milestones/v1.1-ROADMAP.md.

v1.2 roadmap decisions:
- Phase 7 (stage schema) ships alone with zero user-visible change -- gates all FY 2026-27 data loading (pitfall 1: proposed rows leaking into adopted queries)
- Reference data (priorities, FY row) folded into Phase 8 with the pipeline rather than a standalone DDL phase (standard granularity)
- Diff module (Phase 9) isolated before any diff UI so every page/chart/narrative consumes one tested `computeDiff()`
- Sankey (Phase 11) sequenced after core diff data verification; blocks nothing, can run parallel with Phases 10/12
- DATA-04 dress rehearsal placed in Phase 13 alongside AI narratives as the September-readiness gate
- REQUIREMENTS.md "24 total" count corrected to 25 (actual REQ-ID count)
- [Phase 07]: Snapshot manifest keyed by URL path (origin-independent) so local and prod captures diff directly
- [Phase 07]: Pre-flight audits clean: no stray actual-era rows (simple Migration A backfill suffices); Migration B constraint names verified identical on local and prod
- [Phase 07]: Migration A shipped verbatim (clean audit); Tier 1 snapshot normalization extended to collapse Next build-id doctype comment only
- [Phase 07]: Deploy 1 web contract hand-written mid-window: final post-B schema.prisma (is_actual absent, 007 constraint names) + 10 stage-adopted reader filters + three-way YoY; 69/69 render-identical to baseline
- [Phase 07]: stage placed as last scalar field and enum after models to match prisma db pull emission order (07-05 no-diff gate)

### Pending Todos

- Recheck Phase 12 calculator rates after ~Aug 4 TRIM millage certification (external checkpoint, independent of phase sequencing)
- Verify $14.26B / $9.02B / $5.24B figures against the official Budget in Brief in Phase 8's verification block (currently news-sourced, MEDIUM confidence)

### Blockers/Concerns

- Hard deadline: Sept 3 hearing (dress rehearsal must complete before this date)
- Appendix A/H column-layout specifics are MEDIUM confidence -- Phase 8 planning should include a fixture-test spike against the sample PDFs before committing to column-position logic
- Sankey node-ordering/mobile tactics are MEDIUM confidence -- Phase 11 planning should review d3-sankey ordering options
- Deployment target still undecided (Vercel vs Render)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Clean up orphaned exports: remove unused ChartTooltip, centsToDollars, getDepartmentCount | 2026-03-01 | 59054e5 | [1-clean-up-orphaned-exports-remove-unused-](./quick/1-clean-up-orphaned-exports-remove-unused-/) |
| Phase 07 P01 | 15min | 3 tasks | 3 files |
| Phase 07 P02 | 4min | 2 tasks | 2 files |
| Phase 07-stage-aware-schema-foundation P03 | 4min | 3 tasks | 2 files |

## Session Continuity

Last session: 2026-07-19T04:28:41.793Z
Stopped at: Completed 07-03-PLAN.md
Resume file: None
