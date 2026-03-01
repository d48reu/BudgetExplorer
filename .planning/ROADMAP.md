# Roadmap: Miami-Dade Budget Explorer

## Milestones

- ✅ **v1.0 MVP Foundation** -- Phases 1-2 (shipped 2026-02-28)
- [ ] **v1.1 Full Feature Set** -- Phases 3-6 (in progress)

## Phases

<details>
<summary>v1.0 MVP Foundation (Phases 1-2) -- SHIPPED 2026-02-28</summary>

- [x] Phase 1: Data Pipeline (4/4 plans) -- completed 2026-02-28
- [x] Phase 2: App Foundation + Design System (4/4 plans) -- completed 2026-02-28

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### v1.1 Full Feature Set

- [x] **Phase 3: Budget Visualizations + Explorer** - Users can visually explore the $13.2B budget through interactive charts with drill-down navigation
- [ ] **Phase 4: Department Pages + AI + Year-over-Year** - Users can read what each department does in plain English and see how budgets changed over 5 years
- [ ] **Phase 5: Tax Calculator** - Users can enter their property value and see exactly how their tax dollars are allocated
- [ ] **Phase 6: Search + SEO + Launch** - Users can search across all budget data, and every page is optimized for sharing and discovery

## Phase Details

### Phase 3: Budget Visualizations + Explorer
**Goal**: Users can visually explore the full $13.2B budget through interactive treemap/sunburst charts that drill down from the total budget to strategic areas to departments, with a revenue donut chart and penny visualization showing where money comes from and how each dollar is split
**Depends on**: Phase 2 (App Foundation + Design System)
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-07, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. User can open /explorer and see a full-screen treemap of 9 strategic areas sized by operating budget, click any area to drill into its departments, and navigate back via breadcrumb
  2. User can view a revenue source donut chart showing where the county's money comes from (7 revenue categories)
  3. User can see a penny visualization on the homepage showing how each dollar is split by strategic area with colored segments
  4. User on a mobile device (below 768px) sees a usable list/accordion fallback instead of the treemap, with all the same data accessible
  5. User using a screen reader can toggle any chart to a data table showing the same information in accessible tabular format
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md -- Shared chart infrastructure (D3 install, ChartContainer, DataTableToggle, ChartTooltip, chart-utils, queries)
- [x] 03-02-PLAN.md -- Treemap explorer with drill-down, mobile card fallback, area detail pages, department stub
- [x] 03-03-PLAN.md -- Revenue donut chart, penny waffle visualization, homepage integration

### Phase 4: Department Pages + AI + Year-over-Year
**Goal**: Users can visit any of the 35 department pages and read a plain-English AI-generated description of what the department does, see how its budget changed over 5 fiscal years, and view expenditure category breakdowns -- all statically generated for fast loading
**Depends on**: Phase 3 (treemap drill-down links to department pages)
**Requirements**: PAGE-04, PAGE-06, VIZ-05, VIZ-06, AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. User can click any department in the explorer treemap and land on a detail page showing that department's budget overview, AI-generated plain-English summary, and key changes annotation
  2. User can see year-over-year bar charts on department pages comparing the current fiscal year budget against the prior 4 years
  3. User can see an expenditure category breakdown (salary, fringes, operating, capital) for each department
  4. Every AI description displays its fiscal year and generation date, and no description is generated at runtime (all pre-seeded via Python pipeline)
  5. User visiting /department/[slug] for any of the 35 departments gets a fast page load (statically generated at build time)
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md -- AI description pipeline (Python batch generation with Claude API, human review gate, database seeding)
- [x] 04-02-PLAN.md -- Department detail pages with stat cards, AI descriptions, expenditure breakdown chart, and static generation
- [ ] 04-03-PLAN.md -- Year-over-year bar chart component and department page integration

### Phase 5: Tax Calculator
**Goal**: Users can enter their property assessed value and get a personalized breakdown of exactly how their tax dollars are allocated across county services, authorities, strategic areas, and departments
**Depends on**: Phase 2 (data layer); can run in parallel with Phases 3-4
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, PAGE-05
**Success Criteria** (what must be TRUE):
  1. User can enter a property assessed value on /calculator and see their total estimated annual tax bill calculated from real millage rates
  2. User can toggle a homestead exemption checkbox and see the tax bill recalculate immediately
  3. User can see a visual breakdown of their taxes by taxing authority (County vs. School Board vs. others) with both dollar amounts and percentages
  4. User can drill their county tax portion into strategic areas and departments to see exactly how much of their personal taxes fund each service
  5. All calculations match Miami-Dade's official tax estimator for sample property values (no floating-point rounding errors)
**Plans:** 2 plans

Plans:
- [ ] 05-01-PLAN.md -- Tax calculation engine (tax-math pure functions, millage rate query, SerializedMillageRate type) + calculator page UI (input with presets, homestead toggle, hero number, sticky sidebar layout)
- [ ] 05-02-PLAN.md -- Tax breakdown visualizations (authority stacked bar chart + detail table, county strategic area percentage bars, final wiring)

### Phase 6: Search + SEO + Launch
**Goal**: Users can search across all budget data by keyword and find relevant departments, and every page has unique SEO metadata and Open Graph images optimized for social sharing and search engine discovery
**Depends on**: Phase 4 (search results link to department pages; sitemap requires all routes to exist)
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SEO-01, SEO-02
**Success Criteria** (what must be TRUE):
  1. User can type a keyword (e.g., "fire" or "parks") into a search box and see ranked results linking to relevant department and strategic area pages
  2. User sees a helpful empty state message when search returns no results
  3. Every page type (homepage, explorer, department, calculator, search) has a unique title, meta description, and Open Graph image that renders correctly when shared on social media
  4. All 35 department pages and 9 strategic area pages are statically generated and appear in the sitemap
**Plans**: TBD

Plans:
- [ ] 06-01: Full-text search (PostgreSQL tsvector, /api/search route handler, /search page)
- [ ] 06-02: SEO metadata, Open Graph images, sitemap, robots.txt

## Progress

**Execution Order:**
Phases 3-4-6 are sequential. Phase 5 can run in parallel with Phases 3-4 (depends only on Phase 2).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Pipeline | v1.0 | 4/4 | Complete | 2026-02-28 |
| 2. App Foundation + Design System | v1.0 | 4/4 | Complete | 2026-02-28 |
| 3. Budget Visualizations + Explorer | v1.1 | 3/3 | Complete | 2026-03-01 |
| 4. Department Pages + AI + YoY | v1.1 | 2/3 | In Progress | - |
| 5. Tax Calculator | v1.1 | 0/2 | Not started | - |
| 6. Search + SEO + Launch | v1.1 | 0/2 | Not started | - |
