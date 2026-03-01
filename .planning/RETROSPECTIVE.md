# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 -- Full Feature Set

**Shipped:** 2026-03-01
**Phases:** 4 | **Plans:** 10 | **Sessions:** ~4

### What Was Built
- Interactive treemap explorer with drill-down navigation (budget total > strategic areas > departments)
- Revenue donut chart and penny waffle visualization on homepage
- 35 department detail pages with AI-generated descriptions, expenditure breakdowns, and year-over-year charts
- Tax calculator with homestead exemption, authority breakdown, and county strategic area drill-down
- Full-text search with PostgreSQL materialized views and tsvector
- SEO optimization with dynamic OG images, database-driven sitemap, static generation

### What Worked
- **D3 over Nivo pivot**: Early Phase 3 research identified Nivo's treemap limitations; switching to D3 modules gave full control and was reused across all 6 chart types
- **Generic Treemap component**: Building it with name/slug/color/value + linkPrefix let us reuse it for both area and department drill-down views
- **Pure function tax-math module**: Zero React dependencies made it trivially testable with Vitest (16 tests)
- **AI description pipeline with human review gate**: Batch generation + JSON review step prevented any bad descriptions from reaching the DB
- **Server Components for data-heavy pages**: Department pages fetch from DB at build time with zero hydration cost
- **Materialized view for search**: Single GIN-indexed view across 3 entity types is fast and maintainable

### What Was Inefficient
- **ChartTooltip built but never used**: Phase 3-01 created it as shared infrastructure, but every chart (donut, waffle, treemap) chose simpler alternatives. Cleaned up as tech debt post-milestone.
- **centsToDollars utility never used**: formatDollarsAbbreviated handled the division internally, making the standalone utility unnecessary
- **ROADMAP progress table went stale**: Phases 4-6 weren't marked complete in the progress table as they shipped, requiring manual fixup before milestone close

### Patterns Established
- **ChartContainer render prop pattern**: All charts use `<ChartContainer>{({width, height}) => ...}</ChartContainer>` for responsive sizing
- **DataTableToggle**: sr-only table always rendered alongside every chart for accessibility
- **BigInt-to-Number via toChartValue()**: Required before passing any monetary data to D3/Recharts props
- **websearch_to_tsquery over to_tsquery**: Handles natural user input without syntax errors
- **File-based OG images**: opengraph-image.tsx in route directory with exported size/alt/contentType constants

### Key Lessons
1. Build chart infrastructure once, reuse everywhere -- ChartContainer and DataTableToggle saved time across 6 chart components
2. Pre-generate AI content via pipeline, never at runtime -- eliminates latency, cost, and hallucination risk in production
3. Research phases before planning pay off -- the D3/Nivo pivot, tsvector choice, and client-side tax math were all informed by research
4. Keep ROADMAP progress table updated as phases complete, not retroactively

### Cost Observations
- Model mix: ~70% sonnet (executors, checkers), ~30% opus (planners, orchestration)
- Execution time: 1.08 hours total for 10 plans (avg 3 min/plan for Phases 3-6)
- Notable: Phase 3-6 plans averaged 3 min each vs 5-6 min for Phase 1-2 -- familiarity with codebase accelerated later phases

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 2 (8 plans) | Established pipeline + app foundation patterns |
| v1.1 | ~4 | 4 (10 plans) | Research-driven chart decisions, faster execution |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 0 | 0% | 0 |
| v1.1 | 16 | tax-math 100% | 1 (Vitest) |

### Top Lessons (Verified Across Milestones)

1. Research before planning prevents costly pivots (v1.0: Nivo selected then dropped; v1.1: D3 chosen upfront)
2. BigInt cents for all monetary values pays off consistently -- no rounding errors in any calculation
3. Server Components + static generation for data-heavy pages eliminates hydration cost and improves SEO
