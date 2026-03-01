# Miami-Dade Budget Explorer

## What This Is

An interactive web application that transforms Miami-Dade County's $13.2 billion budget from opaque PDF documents into a searchable, visual, plain-English experience. Residents can explore the full budget through interactive treemaps, read AI-generated department descriptions, calculate their personal tax breakdown, and search across all budget data -- all without reading a single PDF.

## Core Value

Residents can instantly see how their specific tax dollars fund county services -- from the total $13.2 billion down to individual departments and line items -- without needing to read a single PDF.

## Requirements

### Validated

- ✓ Budget data extracted from PDF and verified against $13.2B published total -- v1.0
- ✓ All monetary values stored as BigInt cents in PostgreSQL -- v1.0
- ✓ 9 strategic areas, 35 departments, FY 2025-26 figures seeded -- v1.0
- ✓ Historical data for 5 fiscal years seeded and queryable -- v1.0
- ✓ Millage rate data seeded for tax calculations -- v1.0
- ✓ Homepage with animated $13.2B hero, quick stats, CTAs -- v1.0
- ✓ Mobile-first responsive design (375px+) -- v1.0
- ✓ Miami-Dade brand colors and Inter font design system -- v1.0
- ✓ No jargon without tooltip explanation (BudgetTerm component) -- v1.0
- ✓ Semantic HTML throughout -- v1.0
- ✓ Footer links to source PDF on every page -- v1.0
- ✓ Interactive treemap drill-down from total budget to strategic areas to departments -- v1.1
- ✓ Revenue source donut chart (7 categories) -- v1.1
- ✓ Penny visualization (dollar broken into colored segments by strategic area) -- v1.1
- ✓ Year-over-year bar charts (5 fiscal years) -- v1.1
- ✓ Expenditure category breakdown per department -- v1.1
- ✓ Data table fallback for every chart (accessibility) -- v1.1
- ✓ Explorer page with full-screen treemap and drill-down -- v1.1
- ✓ Strategic area detail pages -- v1.1
- ✓ Department detail pages with 7 sections (stat cards, AI summary, key changes, expenditure, YoY, related) -- v1.1
- ✓ Tax calculator with property value input, homestead exemption, authority/area drill-down -- v1.1
- ✓ AI-generated plain-English descriptions for all 35 departments via Claude API -- v1.1
- ✓ Full-text search across departments, descriptions, and glossary terms -- v1.1
- ✓ SEO-optimized pages with unique OG images per page type -- v1.1
- ✓ Static generation for all department and area pages -- v1.1

### Active

(No active requirements -- next milestone TBD)

### Out of Scope

- User authentication -- this is a public transparency tool
- Real-time data updates -- budget data is annual, updated via manual pipeline
- Online Checkbook integration -- disbursement data deferred to future milestone
- Capital program detail pages -- tracked in DB schema but not in v1 UI
- Multi-language support -- English only for v1
- Custom alerts/notifications -- no user accounts means no notifications
- Participatory budgeting / "Build Your Budget" -- fundamentally different product
- Budget forecasting / projections -- politically sensitive, county produces its own
- Chatbot / conversational Q&A -- runtime AI adds latency, cost, hallucination risk
- Mobile native app -- web-first, PWA can be added later

## Context

Shipped v1.1 Full Feature Set (2026-03-01) with ~34,500 LOC TypeScript/CSS (web app) + ~4,800 LOC Python (pipeline). Total: ~39,300 LOC across 2 milestones.

- **Company**: Abreu Data Works LLC
- **Domain**: budgetexplorer.miamidade.tools (placeholder)
- **Tagline**: "See where your money goes."
- **Data source**: Miami-Dade County FY 2025-26 Adopted Budget (Budget in Brief)
- **Budget PDF URL**: https://www.miamidade.gov/resources/budget/adopted/fy2025-26/budget-in-brief.pdf
- **Total budget**: $13,233,238,000 (Operating: $8,575,606,000 + Capital: $4,657,632,000)
- **Total employees**: 31,996
- **9 Strategic Areas**: Policy Formulation, Constitutional Offices, Public Safety, Transportation & Mobility, Recreation & Culture, Neighborhood & Infrastructure, Health & Society, Economic Development, General Government
- **35 departments** mapped to strategic areas
- **Historical data**: 5 fiscal years (FY 2021-22 through FY 2025-26)
- **Millage rates**: Full breakdown for tax calculator (total county: 9.5778 mills)
- **Tech stack**: Next.js 16.1.6, TypeScript, Tailwind CSS v4, Prisma 7 (PrismaPg adapter), PostgreSQL, D3.js + Recharts, Vitest, pnpm; Python pipeline with pdfplumber + Anthropic Claude API
- **Known tech debt**: Umami analytics placeholder in layout.tsx (deferred to post-launch), /calculator and /search lack Breadcrumbs (top-level nav, minimal impact)

## Constraints

- **Tech stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, D3.js + Recharts for viz, PostgreSQL via Prisma 7, pnpm
- **Data pipeline**: Python scripts using pdfplumber for PDF extraction, Anthropic Claude API for descriptions
- **Deployment**: Vercel (frontend) + Supabase or Railway (PostgreSQL)
- **Design**: Miami-Dade blue (#0057B8), orange (#F7941D), green (#00A651), red (#EF4444), Inter font
- **Accessibility**: Semantic HTML, chart alt text, data table fallbacks -- civic tool accessibility requirements
- **Storage**: All monetary values as BigInt cents in database, display formatting in frontend only
- **AI model**: claude-sonnet-4-5-20250929 for budget descriptions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router over Pages Router | Modern patterns, server components for DB queries, better SEO | ✓ Good -- Server Components work well for DB-backed pages |
| BigInt cents for all monetary values | Avoid floating point errors in budget calculations | ✓ Good -- requires .toString() serialization but prevents rounding errors |
| D3 modules over Nivo for complex charts | Nivo treemap lacked customization; D3 gives full control | ✓ Good -- d3-hierarchy + d3-shape + d3-scale for treemap, donut, bars |
| Recharts for simple bar charts | Simpler API for straightforward vertical/horizontal bars | ✓ Good -- used for Phase 4 YoY charts initially, then replaced with D3 for consistency |
| Prisma 7 with PrismaPg adapter | Type-safe queries, direct pg connection without Prisma engine binary | ✓ Good -- introspection works, BigInt maps correctly |
| Python for data pipeline | pdfplumber is the best PDF extraction tool, separate from web app | ✓ Good -- clean separation of concerns |
| Mobile-first responsive | Most residents access on phones | ✓ Good -- Tailwind v4 responsive works well |
| No authentication | Public transparency tool -- zero friction to access | ✓ Good |
| Flat card design (no shadows) | Linear/Notion aesthetic per user preference | ✓ Good -- clean, modern look |
| ChartContainer render prop pattern | Responsive sizing via ResizeObserver, shared across all charts | ✓ Good -- consistent responsive behavior |
| DataTableToggle for accessibility | sr-only table always rendered for screen readers (VIZ-07) | ✓ Good -- meets civic tool accessibility requirements |
| Generic Treemap component | Items with name/slug/color/value + linkPrefix; reused for areas and departments | ✓ Good -- eliminated duplication |
| AI descriptions pre-generated via Python pipeline | Never at runtime; batch with human review gate | ✓ Good -- no runtime AI cost/latency/hallucination risk |
| PostgreSQL tsvector for full-text search | Prisma FTS is Preview-only; materialized view + GIN index | ✓ Good -- fast, reliable, no external service |
| Tax calculator pure client-side | No API needed; millage rates fetched once, computation in browser | ✓ Good -- instant recalculation on input change |
| Next.js Metadata API for SEO | Built-in, no next-seo dependency needed | ✓ Good -- file-based OG image generation works well |
| Vitest for testing | First test framework; pure tax-math module with zero React deps | ✓ Good -- 16 unit tests, fast |

---
*Last updated: 2026-03-01 after v1.1 milestone*
