# Phase 1: Data Pipeline - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract, verify, and seed all budget data from the Miami-Dade FY 2025-26 Budget in Brief PDF into PostgreSQL. Covers 9 strategic areas, 35 departments, revenue sources, millage rates, and up to 5 fiscal years of historical data. The pipeline processes the PDF into a verified, queryable database — no frontend, no API, no UI.

</domain>

<decisions>
## Implementation Decisions

### Source documents
- The Budget in Brief PDF is the single source document for Phase 1
- Pipeline must support both a local file path and downloading from a public URL
- Other document types (detailed budget book, millage schedules, etc.) are deferred to later phases

### Data granularity
- Extract whatever the PDF provides — mirror the PDF's own structure and level of detail
- Both revenue data (where money comes from) and expenditure data (where it goes) must be extracted
- Operating budget and capital budget must be stored as separate values per department
- The Budget in Brief contains a published penny/dollar breakdown graphic — extract and match it exactly rather than calculating from totals

### Historical data sourcing
- The current FY 2025-26 Budget in Brief PDF includes multiple prior-year comparison columns
- Pipeline focuses on extracting data from the current year's PDF (not a multi-PDF design)
- For any fiscal years not covered by the current PDF, user will provide historical data as CSV/JSON files for manual seeding
- Goal is 5 fiscal years: FY 2021-22 through FY 2025-26
- Departments and strategic areas change significantly across years (renamed, merged, reorganized) — schema and seeding must account for this

### Verification expectations
- Small rounding tolerance allowed (e.g., +/-$1,000) to account for PDF rounding — not exact to the penny
- Verification checks at two levels: grand total and each strategic area subtotal — department-level numbers are trusted if strategic area totals reconcile
- On verification failure: generate a detailed diff report showing expected vs actual at every checked level, then halt with error
- Verification runs automatically as the final pipeline step after seeding AND is available as a standalone script for re-verification at any time

### Claude's Discretion
- PDF parsing approach and library choice
- Database schema design and migration tooling
- How to handle cross-year department/area mismatches (renamed, merged, added departments)
- Exact diff report format and rounding tolerance threshold
- CSV/JSON schema for manual historical data seeding

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Additional source documents (detailed budget book, millage rate schedules, revenue detail docs) — future phases
- Multi-PDF pipeline that can process any year's Budget in Brief — not needed for Phase 1

</deferred>

---

*Phase: 01-data-pipeline*
*Context gathered: 2026-02-28*
