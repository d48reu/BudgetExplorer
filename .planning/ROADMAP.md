# Roadmap: Miami-Dade Budget Explorer

## Overview

This roadmap transforms the Miami-Dade Budget Explorer from concept to launched product across 6 phases. The critical path starts with data extraction and verification (garbage in, garbage out), then establishes the web foundation and design system, builds the signature drill-down visualizations, adds department detail with AI-generated descriptions, delivers the personalized tax calculator, and finishes with search and SEO for discoverability. Each phase delivers a coherent, demonstrable capability that builds on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Pipeline** - Extract, verify, and seed all budget data from PDF into PostgreSQL
- [ ] **Phase 2: App Foundation + Design System** - Next.js scaffold, Prisma data layer, homepage shell, Miami-Dade design system
- [ ] **Phase 3: Budget Visualizations + Explorer** - Interactive treemap/sunburst drill-down, revenue donut, penny viz, explorer pages
- [ ] **Phase 4: Department Pages + AI + Year-over-Year** - Department detail pages with AI descriptions and historical comparison
- [ ] **Phase 5: Tax Calculator** - "What Does My Tax Dollar Buy?" personalized calculator
- [ ] **Phase 6: Search + SEO + Launch** - Full-text search, SEO optimization, and launch readiness

## Phase Details

### Phase 1: Data Pipeline
**Goal**: Accurate, verified budget data exists in PostgreSQL, ready for any frontend to consume
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Python pipeline extracts budget figures from the FY 2025-26 Budget in Brief PDF and the sum of all department budgets matches the published total ($13,233,238,000)
  2. PostgreSQL database contains all 9 strategic areas, 35 departments, and their budget allocations with monetary values stored as BigInt cents
  3. Historical data for 5 fiscal years (FY 2021-22 through FY 2025-26) is seeded and queryable
  4. Millage rate data for all taxing authorities is seeded and usable for tax calculations
  5. A verification script confirms data integrity by comparing seeded totals to published figures
**Plans**: TBD

Plans:
- [ ] 01-01: PDF extraction pipeline
- [ ] 01-02: Database schema, migrations, and seed scripts
- [ ] 01-03: Data verification and historical seeding

### Phase 2: App Foundation + Design System
**Goal**: A working Next.js application with the homepage shell, Miami-Dade design system, and data layer that serves as the scaffold for all subsequent phases
**Depends on**: Phase 1
**Requirements**: PAGE-01, UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, SEO-03
**Success Criteria** (what must be TRUE):
  1. Homepage loads and displays the $13.2B hero number, a basic layout, and a footer linking to the source budget PDF
  2. The application renders correctly on mobile (375px+), tablet, and desktop viewports with responsive layout
  3. Miami-Dade brand colors, Inter font, and a clean modern design system are applied consistently
  4. All page elements use semantic HTML and budget jargon includes tooltip explanations
  5. Every page communicates a clear "What am I looking at?" moment -- a visitor understands the page purpose within 3 seconds
**Plans**: TBD

Plans:
- [ ] 02-01: Next.js project setup with Prisma data layer and BigInt serialization
- [ ] 02-02: Design system (Tailwind theme, components, responsive layout)
- [ ] 02-03: Homepage shell with hero, layout, and footer

### Phase 3: Budget Visualizations + Explorer
**Goal**: Residents can visually explore the full budget hierarchy from $13.2B total down to individual departments, plus see revenue sources and the penny breakdown
**Depends on**: Phase 2
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-07, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. User can see a treemap or sunburst showing all 9 strategic areas sized by operating budget, click one, and drill into its departments
  2. User can view a donut chart showing the 7 revenue source categories and their proportions
  3. User can see a "penny visualization" showing how one dollar breaks down by strategic area
  4. Every chart has a data table fallback accessible to screen readers
  5. Strategic area detail pages show all departments within that area with budget figures
**Plans**: TBD

Plans:
- [ ] 03-01: Treemap/sunburst drill-down component (Nivo or D3)
- [ ] 03-02: Revenue donut, penny visualization, and data table fallbacks
- [ ] 03-03: Explorer page and strategic area detail pages

### Phase 4: Department Pages + AI + Year-over-Year
**Goal**: Each of the 35 departments has its own page with a plain-English AI description, expenditure breakdown, and year-over-year budget comparison
**Depends on**: Phase 3
**Requirements**: PAGE-04, PAGE-06, VIZ-05, VIZ-06, AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Each department page shows a 2-3 sentence plain-English summary of what the department does and a "Key Changes" summary of what changed from the prior year
  2. Each department page shows an expenditure category breakdown (salary, fringes, operating, etc.) as a chart
  3. Year-over-year bar charts compare the current fiscal year budget to the prior 4 years, available both on department pages and a dedicated comparison page
  4. AI descriptions are generated via Claude API, stored in the database, and tagged with fiscal year and generation date
**Plans**: TBD

Plans:
- [ ] 04-01: AI description generation pipeline (Claude API)
- [ ] 04-02: Department detail pages with expenditure breakdown
- [ ] 04-03: Year-over-year comparison charts and page

### Phase 5: Tax Calculator
**Goal**: A resident enters their property value and instantly sees exactly how their tax dollars fund county services
**Depends on**: Phase 2 (uses millage data from Phase 1, but does not depend on Phases 3-4)
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, PAGE-05
**Success Criteria** (what must be TRUE):
  1. User enters a property assessed value and sees their total calculated tax bill
  2. Homestead exemption checkbox adjusts the calculation and result in real time
  3. Tax bill is broken down by taxing authority (County vs. School Board vs. others) with both dollar amounts and percentages
  4. The county portion drills further into strategic areas and departments showing how county taxes are allocated
**Plans**: TBD

Plans:
- [ ] 05-01: Tax calculation engine and calculator UI
- [ ] 05-02: Visual tax breakdown with authority and department drill-down

### Phase 6: Search + SEO + Launch
**Goal**: The application is discoverable via search engines and residents can find any budget information by searching
**Depends on**: Phases 3 and 4 (needs pages and content to exist for search and SEO)
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SEO-01, SEO-02
**Success Criteria** (what must be TRUE):
  1. User can type a query and get results across departments, descriptions, and line items with links to relevant pages
  2. Search shows a helpful empty state when no results are found
  3. Every page type (homepage, explorer, department, calculator) has a unique title, meta description, and Open Graph image
  4. Department pages are statically generated for optimal search engine indexing
**Plans**: TBD

Plans:
- [ ] 06-01: Full-text search implementation
- [ ] 06-02: SEO optimization and static generation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
(Phase 5 can execute in parallel with Phases 3-4 if desired, as it only depends on Phase 2.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Pipeline | 0/3 | Not started | - |
| 2. App Foundation + Design System | 0/3 | Not started | - |
| 3. Budget Visualizations + Explorer | 0/3 | Not started | - |
| 4. Department Pages + AI + Year-over-Year | 0/3 | Not started | - |
| 5. Tax Calculator | 0/2 | Not started | - |
| 6. Search + SEO + Launch | 0/2 | Not started | - |
