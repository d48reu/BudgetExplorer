# Miami-Dade Budget Explorer

## What This Is

An interactive web application that transforms Miami-Dade County's $13.2 billion budget from opaque PDF documents into a searchable, visual, plain-English experience. Built for residents, journalists, activists, commissioners, and county staff who want to understand where their tax dollars go.

## Core Value

Residents can instantly see how their specific tax dollars fund county services — from the total $13.2 billion down to individual departments and line items — without needing to read a single PDF.

## Requirements

### Validated

- ✓ Budget data extracted from PDF and verified against $13.2B published total — v1.0
- ✓ All monetary values stored as BigInt cents in PostgreSQL — v1.0
- ✓ 9 strategic areas, 35 departments, FY 2025-26 figures seeded — v1.0
- ✓ Historical data for 5 fiscal years seeded and queryable — v1.0
- ✓ Millage rate data seeded for tax calculations — v1.0
- ✓ Homepage with animated $13.2B hero, quick stats, CTAs — v1.0
- ✓ Mobile-first responsive design (375px+) — v1.0
- ✓ Miami-Dade brand colors and Inter font design system — v1.0
- ✓ No jargon without tooltip explanation (BudgetTerm component) — v1.0
- ✓ Semantic HTML throughout — v1.0
- ✓ Footer links to source PDF on every page — v1.0

### Active

- [ ] Interactive treemap/sunburst drill-down from total budget → strategic areas → departments
- [ ] "What Does My Tax Dollar Buy?" calculator — enter property value, get personalized tax breakdown
- [ ] AI-generated plain-English descriptions of what each department does and what changed
- [ ] Year-over-year budget comparison (5 fiscal years)
- [ ] Full-text search across departments, descriptions, and line items
- [ ] Revenue source visualization (donut chart)
- [ ] "Penny visualization" — dollar broken into colored segments by strategic area
- [ ] Department detail pages with expenditure category breakdowns
- [ ] SEO-optimized pages with Open Graph metadata

### Out of Scope

- User authentication — this is a public transparency tool
- Real-time data updates — budget data is annual, updated via manual pipeline
- Online Checkbook integration — disbursement data deferred to future milestone
- Capital program detail pages — tracked in DB schema but not in v1 UI
- Multi-language support — English only for v1
- Custom alerts/notifications — no user accounts means no notifications

## Current Milestone: v1.1 Full Feature Set

**Goal:** Ship all 26 remaining requirements — interactive visualizations, explorer pages, department detail, tax calculator, AI descriptions, search, and SEO — completing the full original vision.

**Target features:**
- Interactive treemap/sunburst drill-down with revenue donut and penny visualization
- Department detail pages with AI-generated descriptions and year-over-year comparison
- "What Does My Tax Dollar Buy?" personalized tax calculator
- Full-text search, SEO optimization, and launch readiness

## Context

Shipped v1.0 MVP Foundation (2026-02-28) with ~5,800 LOC (4,800 Python pipeline + 1,000 TypeScript/CSS app).

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
- **Tech stack (actual)**: Next.js 16.1.6, TypeScript, Tailwind CSS v4, Prisma 7 (PrismaPg adapter), PostgreSQL, pnpm; Python pipeline with pdfplumber
- **Current state**: Homepage live with hero counter, quick stats, glossary, responsive nav; data pipeline verified; Phases 3-6 not started
- **Known tech debt**: format.ts bypassed by inline conversion, dead /explorer and /calculator links, unused getStrategicAreas() and Skeleton exports

## Constraints

- **Tech stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Nivo/D3.js for viz, PostgreSQL via Prisma 7, pnpm
- **Data pipeline**: Python scripts using pdfplumber for PDF extraction, Anthropic Claude API for descriptions
- **Deployment**: Vercel (frontend) + Supabase or Railway (PostgreSQL)
- **Design**: Miami-Dade blue (#0057B8), orange (#F7941D), green (#00A651), red (#EF4444), Inter font
- **Accessibility**: Semantic HTML, chart alt text, data table fallbacks — civic tool accessibility requirements
- **Storage**: All monetary values as BigInt cents in database, display formatting in frontend only
- **AI model**: claude-sonnet-4-5-20250929 for budget descriptions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router over Pages Router | Modern patterns, server components for DB queries, better SEO | ✓ Good — Server Components work well for DB-backed pages |
| BigInt cents for all monetary values | Avoid floating point errors in budget calculations | ✓ Good — requires .toString() serialization but prevents rounding errors |
| Nivo over Recharts for treemap/sunburst | Recharts lacks sunburst support; Nivo recommended during research | — Pending (Phase 3) |
| Prisma 7 with PrismaPg adapter | Type-safe queries, direct pg connection without Prisma engine binary | ✓ Good — introspection works, BigInt maps correctly |
| Python for data pipeline | pdfplumber is the best PDF extraction tool, separate from web app | ✓ Good — clean separation of concerns |
| Mobile-first responsive | Most residents access on phones | ✓ Good — Tailwind v4 responsive works well |
| No authentication | Public transparency tool — zero friction to access | ✓ Good |
| Flat card design (no shadows) | Linear/Notion aesthetic per user preference | ✓ Good — clean, modern look |
| Tailwind v4 @theme tokens | Native CSS custom properties, no tailwind.config.js needed | ✓ Good — simpler config |
| Unicode nav icons over icon library | Avoid dependency for simple navigation icons | ✓ Good — zero bundle impact |

---
*Last updated: 2026-02-28 after v1.0 milestone*
