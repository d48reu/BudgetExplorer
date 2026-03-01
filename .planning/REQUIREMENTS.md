# Requirements: Miami-Dade Budget Explorer v1.1

**Defined:** 2026-02-28
**Core Value:** Residents can instantly see how their specific tax dollars fund county services — from the total $13.2 billion down to individual departments — without reading a single PDF.

## v1.1 Requirements

Requirements carried forward from v1.0 (26 remaining). Each maps to roadmap phases 3-6.

### Visualization

- [x] **VIZ-01**: Interactive treemap showing 9 strategic areas sized by operating budget
- [x] **VIZ-02**: Drill-down from strategic area to departments within that area
- [x] **VIZ-03**: Revenue source donut chart showing 7 revenue categories
- [x] **VIZ-04**: "Penny visualization" — dollar broken into colored segments by strategic area
- [x] **VIZ-05**: Year-over-year bar charts comparing current vs. prior 4 fiscal years
- [x] **VIZ-06**: Expenditure category breakdown per department (salary, fringes, etc.)
- [x] **VIZ-07**: Data table fallback for every chart (accessibility requirement)

### Pages

- [x] **PAGE-02**: Explorer page with full-screen treemap/sunburst and drill-down
- [x] **PAGE-03**: Strategic area detail pages showing departments within each area
- [x] **PAGE-04**: Department detail pages with budget overview, AI description, YoY comparison
- [x] **PAGE-05**: Tax calculator page with property value input and visual breakdown
- [x] **PAGE-06**: Year-over-year comparison page

### Calculator

- [x] **CALC-01**: User enters property assessed value and gets total tax bill
- [x] **CALC-02**: Homestead exemption checkbox adjusts calculation
- [x] **CALC-03**: Visual breakdown of taxes by authority (County vs. School Board vs. others)
- [x] **CALC-04**: County portion drilled into by strategic area
- [x] **CALC-05**: Dollar amounts displayed alongside percentages

### AI Descriptions

- [x] **AI-01**: Plain-English summary (2-3 sentences) of what each department does
- [x] **AI-02**: "Key Changes" summary of what changed in adopted budget vs. prior year
- [x] **AI-03**: Descriptions generated via Claude API and stored in database
- [x] **AI-04**: Each description references its fiscal year and generation date

### Search

- [x] **SRCH-01**: Full-text search across departments, descriptions, and line items
- [x] **SRCH-02**: Search results link to relevant department/area pages
- [x] **SRCH-03**: Empty state with helpful message when no results found

### SEO & Sharing

- [x] **SEO-01**: Unique title/description/OG image per page type
- [x] **SEO-02**: Department pages statically generated for SEO

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Embeddable Widgets

- **EMBED-01**: Iframe-compatible chart components for external sites
- **EMBED-02**: Department budget widget for commissioner websites

### Data Export

- **EXPORT-01**: CSV download of budget data by department
- **EXPORT-02**: PDF report generation for department details

### Disbursements

- **DISB-01**: Online Checkbook integration showing actual spending
- **DISB-02**: Vendor payment search

### Capital Projects

- **CAP-01**: Capital program detail pages with multi-year totals
- **CAP-02**: Geographic map visualization of capital projects

### Internationalization

- **I18N-01**: Spanish language support for all UI text
- **I18N-02**: Spanish AI-generated descriptions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Participatory budgeting / "Build Your Budget" | Fundamentally different product (engagement vs. transparency). Creates political expectations the county can't meet. |
| User accounts / authentication | Zero-friction access is more important than personalization. No user data to protect. |
| Real-time spending data | Requires county financial system integration and ongoing data feeds. |
| Budget forecasting / projections | Politically sensitive. The county produces its own forecasts. |
| Chatbot / conversational Q&A | Runtime AI adds latency, cost, and hallucination risk. Pre-generated descriptions are safer. |
| Mobile native app | Web-first. Progressive web app features can be added later if demand warrants. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIZ-01 | Phase 3 | Complete |
| VIZ-02 | Phase 3 | Complete |
| VIZ-03 | Phase 3 | Complete |
| VIZ-04 | Phase 3 | Complete |
| VIZ-05 | Phase 4 | Complete |
| VIZ-06 | Phase 4 | Complete |
| VIZ-07 | Phase 3 | Complete |
| PAGE-02 | Phase 3 | Complete |
| PAGE-03 | Phase 3 | Complete |
| PAGE-04 | Phase 4 | Complete |
| PAGE-05 | Phase 5 | Complete |
| PAGE-06 | Phase 4 | Complete |
| CALC-01 | Phase 5 | Complete |
| CALC-02 | Phase 5 | Complete |
| CALC-03 | Phase 5 | Complete |
| CALC-04 | Phase 5 | Complete |
| CALC-05 | Phase 5 | Complete |
| AI-01 | Phase 4 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
| SRCH-01 | Phase 6 | Complete |
| SRCH-02 | Phase 6 | Complete |
| SRCH-03 | Phase 6 | Complete |
| SEO-01 | Phase 6 | Complete |
| SEO-02 | Phase 6 | Complete |

**Coverage:**
- v1.1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28 (carried forward from v1.0)*
*Last updated: 2026-02-28 after v1.1 milestone start*
