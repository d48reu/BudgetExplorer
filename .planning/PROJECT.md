# Miami-Dade Budget Explorer

## What This Is

An interactive web application that transforms Miami-Dade County's $13.2 billion budget from opaque PDF documents into a searchable, visual, plain-English experience. Built for residents, journalists, activists, commissioners, and county staff who want to understand where their tax dollars go.

## Core Value

Residents can instantly see how their specific tax dollars fund county services — from the total $13.2 billion down to individual departments and line items — without needing to read a single PDF.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive treemap/sunburst drill-down from total budget → strategic areas → departments → line items
- [ ] "What Does My Tax Dollar Buy?" calculator — enter property value, get personalized tax breakdown
- [ ] AI-generated plain-English descriptions of what each department does and what changed
- [ ] Year-over-year budget comparison (5 fiscal years: FY 2021-22 through FY 2025-26)
- [ ] Full-text search across departments, descriptions, and line items
- [ ] Revenue source visualization (donut/pie chart)
- [ ] "Penny visualization" — dollar broken into colored segments by strategic area
- [ ] Department detail pages with expenditure category breakdowns
- [ ] Responsive mobile-first design
- [ ] SEO-optimized pages with Open Graph metadata

### Out of Scope

- User authentication — this is a public transparency tool
- Real-time data updates — budget data is annual, updated via manual pipeline
- Online Checkbook integration — disbursement data deferred to future milestone
- Capital program detail pages — tracked in DB schema but not in v1 UI
- Multi-language support — English only for v1
- Custom alerts/notifications — no user accounts means no notifications

## Context

- **Company**: Abreu Data Works LLC
- **Domain**: budgetexplorer.miamidade.tools (placeholder)
- **Tagline**: "See where your money goes."
- **Data source**: Miami-Dade County FY 2025-26 Adopted Budget (Budget in Brief)
- **Budget PDF URL**: https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf
- **Total budget**: $13,233,238,000 (Operating: $8,575,606,000 + Capital: $4,657,632,000)
- **Total employees**: 31,996
- **9 Strategic Areas**: Policy Formulation, Constitutional Offices, Public Safety, Transportation & Mobility, Recreation & Culture, Neighborhood & Infrastructure, Health & Society, Economic Development, General Government
- **35 departments** mapped to strategic areas
- **Historical data**: 5 fiscal years (FY 2021-22 through FY 2025-26) for year-over-year comparison
- **Millage rates**: Full breakdown for tax calculator (total county: 9.5778 mills)
- **Full SQL schema**: `budget-explorer-schema.sql` with tables for fiscal years, strategic areas, departments, revenue sources, expenditure categories, department budgets, millage rates, AI descriptions, capital programs, and disbursements

## Constraints

- **Tech stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts + D3.js, PostgreSQL via Prisma ORM, pnpm
- **Data pipeline**: Python scripts using pdfplumber for PDF extraction, Anthropic Claude API for descriptions
- **Deployment**: Vercel (frontend) + Supabase or Railway (PostgreSQL)
- **Design**: Miami-Dade blue (#0057B8), orange (#F7941D), green (#00A651), red (#EF4444), Inter font
- **Accessibility**: Semantic HTML, chart alt text, data table fallbacks — civic tool accessibility requirements
- **Storage**: All monetary values as BigInt cents in database, display formatting in frontend only
- **AI model**: claude-sonnet-4-5-20250929 for budget descriptions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router over Pages Router | Modern patterns, server components for DB queries, better SEO | — Pending |
| BigInt cents for all monetary values | Avoid floating point errors in budget calculations | — Pending |
| Recharts primary, D3.js fallback | Recharts simpler for most charts; D3 only if treemap/sunburst needs it | — Pending |
| Prisma ORM over raw SQL | Type-safe queries, easier migrations, good DX | — Pending |
| Python for data pipeline | pdfplumber is the best PDF extraction tool, separate from web app | — Pending |
| Mobile-first responsive | Most residents access on phones | — Pending |
| No authentication | Public transparency tool — zero friction to access | — Pending |
| Static seed data first, DB later | Ship homepage fast, connect database in Phase 2 | — Pending |

---
*Last updated: 2026-02-28 after initialization*
