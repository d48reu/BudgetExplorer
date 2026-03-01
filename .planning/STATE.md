# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Residents can instantly see how their specific tax dollars fund county services -- from the total $13.2 billion down to individual departments -- without reading a single PDF.
**Current focus:** Phase 3 -- Budget Visualizations + Explorer

## Current Position

Phase: 3 of 6 (Budget Visualizations + Explorer)
Plan: 1 of 3 in current phase
Status: Executing
Last activity: 2026-03-01 -- 03-01 shared chart infrastructure complete

Progress: [███████████░░░░░░░░░░░░░░░░░░░] 10% v1.1 (1/10 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 5 min
- Total execution time: 0.73 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 4 | 25 min | 6 min |
| 02-app-foundation-design-system | 4 | 18 min | 5 min |
| 03-budget-visualizations-explorer | 1 | 2 min | 2 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Full v1.0 decision log archived in milestones/v1.0-ROADMAP.md.

Key decisions carrying forward:
- [03-01]: D3 modules (d3-hierarchy, d3-shape, d3-scale) for complex charts + Recharts for Phase 4 bar/line charts (replaced Nivo)
- [03-01]: ChartContainer uses render prop pattern for responsive sizing via ResizeObserver
- [03-01]: DataTableToggle always renders sr-only table for screen reader accessibility (VIZ-07)
- [03-01]: ChartTooltip is controlled -- parent chart manages open/close state
- [Research]: BigInt cents must convert to Number via toChartValue() before any D3/Recharts data prop
- [Research]: AI descriptions pre-generated via Python pipeline, never at runtime
- [Research]: Full-text search uses PostgreSQL tsvector + $queryRaw (Prisma FTS is Preview-only)
- [Research]: Tax calculator is pure client-side computation (no API needed)
- [Research]: SEO uses Next.js built-in Metadata API (no next-seo)
- [Roadmap]: Phase 5 (Tax Calculator) can run in parallel with Phases 3-4

### Pending Todos

None.

### Blockers/Concerns

- [Research]: Treemap unusable on mobile below 768px -- accordion/list fallback required (addressed in 03-02)
- [Research]: Vercel vs Render deployment decision deferred to Phase 6

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 03-01-PLAN.md (shared chart infrastructure). Ready for 03-02.
Resume file: None
