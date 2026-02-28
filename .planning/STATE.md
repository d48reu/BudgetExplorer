# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Residents can instantly see how their specific tax dollars fund county services -- from the total $13.2 billion down to individual departments -- without reading a single PDF.
**Current focus:** Phase 2: App Foundation + Design System -- Plan 01 complete. Continuing with Plan 02.

## Current Position

Phase: 2 of 6 (App Foundation + Design System)
Plan: 1 of 3 in current phase -- COMPLETE
Status: Plan 02-01 complete (Next.js scaffold, Prisma data layer, formatting utilities). Ready for Plan 02-02 (Design System).
Last activity: 2026-02-28 -- 02-01-PLAN.md completed (Next.js + Prisma + data layer + formatting)

Progress: [█████████████░░░░░░░░░░░░░░░░░] 29% (5/17 plans complete, Phase 2 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 6 min
- Total execution time: 0.54 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 4 | 25 min | 6 min |
| 02-app-foundation-design-system | 1 | 7 min | 7 min |

**Recent Trend:**
- Last 5 plans: 01-02 (4min), 01-03 (12min), 01-04 (4min), 02-01 (7min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Data pipeline must complete and verify before any frontend work begins
- [Roadmap]: Nivo recommended over Recharts for treemap/sunburst (Recharts lacks sunburst support)
- [Roadmap]: Phase 5 (Tax Calculator) can run in parallel with Phases 3-4
- [01-01]: Extraction modules use known-name matching sets for robust PDF parsing
- [01-01]: Penny extractor supports both table and text-based extraction modes
- [01-01]: All extractors return raw strings; cents conversion deferred to transform module (Plan 02)
- [01-02]: dollars_to_cents uses int multiplication for whole dollars, float only for decimal values
- [01-02]: Department name matching uses cascading strategy: exact -> apostrophe normalization -> &/and swap -> substring
- [01-02]: seed_all uses published totals from config.py for fiscal_year record (source of truth)
- [01-02]: Millage rates stored as Decimal for PostgreSQL DECIMAL(8,4) precision
- [01-03]: Verification tolerance set at +/-$1,000 (100,000 cents) per user requirement
- [01-03]: Verification runs as both standalone CLI command and final step of run-all pipeline
- [01-03]: Historical CSV uses whole dollars (loader converts to cents) for human-friendly data entry
- [01-03]: Penny breakdown seeding supports both key naming conventions via normalization
- [01-04]: Historical budget values converted from Appendix C thousands format to whole dollars (e.g., 7,591 -> 7591000)
- [01-04]: FY 2021-22 through FY 2023-24 marked is_actual=true (actual spending); FY 2024-25 marked is_actual=false (adopted budget)
- [01-04]: Transfers line item correctly skipped during seeding (interagency transfer, not a real department)
- [01-04]: v_department_yoy view shows budget-type rows only for adopted-vs-adopted comparison
- [02-01]: Prisma 7 with prisma-client generator and PrismaPg adapter (not prisma-client-js from Prisma 6.x)
- [02-01]: Next.js 16.1.6 installed (latest stable) -- App Router and Server Components work identically to v15
- [02-01]: Homepage uses force-dynamic for DB queries at request time (not static generation)
- [02-01]: BigInt serialization handled centrally in data access layer (queries.ts)

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Nivo sunburst drill-down with 4 levels needs prototype validation in Phase 3
- [RESOLVED] [Research]: pdfplumber config for Budget in Brief PDF layout needs per-section tuning in Phase 1 -- resolved in 01-03 via extractor tuning and Appendix C/J integration
- [Research]: Vercel vs Render deployment decision deferred to Phase 6

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 02-01-PLAN.md -- Next.js scaffold, Prisma data layer, formatting utilities
Resume file: None
