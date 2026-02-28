# Research Summary: Miami-Dade Budget Explorer

**Domain:** Civic budget visualization web application
**Researched:** 2026-02-28
**Overall confidence:** HIGH

## Executive Summary

The Miami-Dade Budget Explorer is a civic transparency tool that transforms a $13.2 billion county budget from opaque PDF documents into an interactive, searchable, plain-English web experience. The technology ecosystem for this type of application is mature and well-understood in 2026: Next.js 16 with App Router provides the full-stack framework, Prisma 7 handles type-safe PostgreSQL access with proper BigInt support, and a combination of Recharts 3 (for standard charts) and Nivo (for hierarchical sunburst/treemap visualizations) covers all visualization needs. The data pipeline uses Python's pdfplumber for PDF extraction and Anthropic's Claude API for generating human-readable descriptions.

The stack research revealed one critical decision point: Recharts does NOT support sunburst charts (open GitHub issue since 2017, never implemented) and its Treemap component has limited drill-down capability (issue #1276 closed without implementation). The recommended approach is to use Nivo's @nivo/sunburst and @nivo/treemap packages for hierarchical budget drill-down visualizations, keeping Recharts for simpler chart types (bar, line, donut). If neither Nivo component meets the exact interaction requirements, a custom D3 treemap using d3-hierarchy for layout math with React SVG rendering is the established fallback pattern.

The most significant risk in this project is not the technology stack but the data pipeline: extracting accurate budget numbers from a government PDF designed for print, not data consumption. Silent errors in PDF extraction propagate through the entire application, making manual verification against published totals mandatory before any development begins. The second major risk is information overload -- presenting all budget data at once instead of using progressive disclosure to guide residents from simple totals to detailed breakdowns.

Both Next.js 16 and Prisma 7 are current stable releases with production-ready status. Tailwind CSS 4 uses a new CSS-first configuration model (replacing tailwind.config.js with @theme directives), which is a workflow change but well-documented. All recommended libraries have been verified for React 19 compatibility, which Next.js 16 requires.

## Key Findings

**Stack:** Next.js 16.1.6 + React 19.2 + Tailwind CSS 4.2 + Recharts 3.7 + Nivo 0.99 (sunburst/treemap) + Prisma 7.4.x + PostgreSQL 16 + pdfplumber 0.11.9. All current stable versions as of Feb 2026.

**Architecture:** Server-first with Client Islands. Server Components fetch budget data via Prisma, serialize BigInt to Number at the query layer, and pass props to Client Component charts. Python data pipeline is fully offline, producing JSON seed files.

**Critical pitfall:** BigInt serialization at the Server-to-Client Component boundary. Prisma returns BigInt for monetary fields; JSON.stringify throws without explicit conversion. Must be solved in the data access layer (lib/queries/) before any component code is written.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Data Pipeline + Foundation** - Extract budget data from PDF, verify accuracy, set up database schema and seed
   - Addresses: PDF extraction, data accuracy validation, database schema
   - Avoids: PDF parsing errors propagating through the application (Pitfall 5)

2. **Core Web App + Data Layer** - Next.js 16 project setup, Prisma singleton, query layer with BigInt serialization, basic pages
   - Addresses: Framework setup, data fetching patterns, BigInt handling
   - Avoids: BigInt serialization crashes (Pitfall 1), connection pool exhaustion

3. **Visualization Components** - Nivo sunburst/treemap for drill-down, Recharts for bar/donut/line charts
   - Addresses: Hierarchical drill-down, revenue breakdown, year-over-year trends
   - Avoids: Recharts treemap limitations (Pitfall 6), D3/React DOM conflicts (Pitfall 2), hydration mismatches (Pitfall 3)

4. **Interactive Features** - Tax calculator, search, animated numbers, penny visualization
   - Addresses: Personalization, discoverability, engagement
   - Avoids: Information overload (Pitfall 4) by adding features incrementally

5. **Polish + Launch** - SEO, Open Graph images, accessibility audit, mobile refinement, deployment
   - Addresses: Discoverability, accessibility, mobile experience
   - Avoids: Accessibility gaps being retrofitted late

**Phase ordering rationale:**
- Data pipeline MUST complete first because every other phase depends on accurate budget data in the database
- BigInt serialization pattern must be established before any chart component is built
- Visualization components should be prototyped early (especially treemap/sunburst drill-down) because they carry the highest implementation risk
- Interactive features (calculator, search) depend on the data layer and UI patterns established in earlier phases
- SEO and accessibility are parallel concerns that should be built in from the start but audited at the end

**Research flags for phases:**
- Phase 1 (Data Pipeline): Likely needs deeper research on specific Miami-Dade Budget in Brief PDF layout for pdfplumber configuration
- Phase 3 (Visualization): May need deeper research comparing Nivo sunburst vs. custom D3 sunburst for the specific drill-down interaction desired
- Phase 4 (Tax Calculator): Standard patterns, unlikely to need additional research
- Phase 5 (SEO/A11y): Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm/PyPI/official releases as of 2026-02-28. Next.js 16 stable confirmed via official upgrade guide. Prisma 7.4.x confirmed via official changelog. |
| Features | HIGH | Feature landscape validated against 10+ existing civic budget tools. Table stakes and differentiators well-defined. |
| Architecture | HIGH | Server Components + Prisma + Client chart components is the documented Next.js pattern from both Vercel and Prisma official guides. |
| Pitfalls | HIGH | All critical pitfalls verified with official GitHub issues, documentation, and multiple community sources. BigInt and D3/React conflicts are well-documented patterns. |
| Visualization Library Choice | MEDIUM | Nivo sunburst/treemap is recommended but not yet verified with the exact drill-down interaction pattern needed (4-level hierarchy). May need prototype validation. |

## Gaps to Address

- **Nivo sunburst drill-down depth:** Nivo's sunburst supports click-to-zoom, but the exact behavior with 4 levels (total -> strategic area -> department -> line items) needs prototype validation.
- **pdfplumber configuration for Budget in Brief:** The specific PDF layout of the Miami-Dade Budget in Brief PDF has not been tested. Table detection settings will need per-section tuning.
- **Vercel vs Render deployment:** PROJECT.md specifies Vercel for frontend, but the developer's preference is Render.com. Next.js 16's Turbopack and static generation work on both, but Vercel has better native Next.js support.
- **Tailwind v4 compatibility with UI component libraries:** If using shadcn/ui or similar, verify Tailwind v4 compatibility before adopting. Most popular libraries have migrated, but edge cases exist.
- **React 19.2 View Transitions vs Motion:** The project may be able to use React 19.2's built-in View Transitions for drill-down animations instead of Motion, reducing bundle size. Needs experimentation.
