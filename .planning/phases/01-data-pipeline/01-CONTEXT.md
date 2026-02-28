# Phase 1: Data Pipeline - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract, verify, and seed all budget data from the Miami-Dade FY 2025-26 Budget in Brief PDF into PostgreSQL. Covers 9 strategic areas, 35 departments, revenue sources, millage rates, and up to 5 fiscal years of historical data. The pipeline processes PDF(s) into a verified, queryable database — no frontend, no API, no UI.

</domain>

<decisions>
## Implementation Decisions

### Source documents
- The Budget in Brief PDF is the single source document for all data (departments, strategic areas, revenue, millage rates)
- Pipeline must support both a local file path and downloading from a public URL
- No additional documents needed — everything comes from Budget in Brief PDFs

### Data granularity
- Extract whatever the PDF provides — mirror the PDF's own structure and level of detail
- Both revenue data (where money comes from) and expenditure data (where it goes) must be extracted
- If the PDF separates operating and capital budgets, store them separately; if not, store a single total
- Penny breakdown (how $1 splits across strategic areas) is calculated from strategic area totals, not extracted from a published graphic

### Historical data sourcing
- The current FY 2025-26 PDF contains some prior-year comparison columns (exact number TBD during research)
- User will provide older Budget in Brief PDFs for any fiscal years not covered by the current PDF
- Pipeline must be designed as multi-PDF: accept any year's Budget in Brief, extract the fiscal year, and seed appropriately — run once per PDF
- Goal is 5 fiscal years: FY 2021-22 through FY 2025-26

### Verification expectations
- Exact match required — the sum of all department budgets must equal the published total ($13,233,238,000) with zero tolerance
- Multi-level verification: grand total, each strategic area subtotal, and each department must all reconcile
- On verification failure: generate a detailed diff report showing expected vs actual at every level (grand total, strategic areas, departments), then halt with error
- Verification runs automatically as the final pipeline step after seeding AND is available as a standalone script for re-verification at any time

### Claude's Discretion
- PDF parsing approach and library choice
- Database schema design and migration tooling
- How to handle cross-year department/area mismatches (renamed, merged, added departments)
- PDF structure analysis and table extraction strategy
- Exact diff report format

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-data-pipeline*
*Context gathered: 2026-02-28*
