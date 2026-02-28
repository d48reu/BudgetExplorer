# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Residents can instantly see how their specific tax dollars fund county services -- from the total $13.2 billion down to individual departments -- without reading a single PDF.
**Current focus:** Phase 1: Data Pipeline -- COMPLETE. Ready for Phase 2: App Foundation + Design System

## Current Position

Phase: 1 of 6 (Data Pipeline) -- COMPLETE
Plan: 3 of 3 in current phase -- ALL COMPLETE
Status: Phase 1 complete. Ready to begin Phase 2.
Last activity: 2026-02-28 -- 01-03-PLAN.md completed (verification system + historical framework + human-verified pipeline)

Progress: [██████████░░░░░░░░░░░░░░░░░░░░] 17% (3/16 plans complete, Phase 1 done)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 7 min
- Total execution time: 0.35 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-pipeline | 3 | 21 min | 7 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5min), 01-02 (4min), 01-03 (12min)
- Trend: stable (01-03 longer due to checkpoint + deviations)

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Nivo sunburst drill-down with 4 levels needs prototype validation in Phase 3
- [RESOLVED] [Research]: pdfplumber config for Budget in Brief PDF layout needs per-section tuning in Phase 1 -- resolved in 01-03 via extractor tuning and Appendix C/J integration
- [Research]: Vercel vs Render deployment decision deferred to Phase 6

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 01-03-PLAN.md -- Phase 1 (Data Pipeline) fully complete
Resume file: None
