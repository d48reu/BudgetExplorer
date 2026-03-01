# Milestones

## v1.1 Full Feature Set (Shipped: 2026-03-01)

**Phases completed:** 4 phases, 10 plans, 0 tasks

**Key accomplishments:**
- Interactive treemap explorer with drill-down from $13.2B total to 9 strategic areas to 35 departments, plus revenue donut and penny waffle charts
- AI-generated plain-English descriptions for all 35 departments via Claude API batch pipeline with human review gate
- Department detail pages with 7 sections: stat cards, AI summary, key changes, expenditure breakdown, year-over-year comparison, related departments
- "What Does My Tax Dollar Buy?" calculator with homestead exemption toggle, authority breakdown, and county strategic area drill-down
- Full-text search across departments, descriptions, and glossary terms using PostgreSQL materialized views and tsvector
- SEO optimization with dynamic Open Graph images, database-driven sitemap (49 URLs), and static generation for all pages

---

## v1.0 MVP Foundation (Shipped: 2026-02-28)

**Phases completed:** 2 phases, 8 plans, 0 tasks

**Key accomplishments:**
- Complete data pipeline extracting and verifying 5 fiscal years of Miami-Dade budget data into PostgreSQL ($13.2B verified against published totals)
- Next.js 16 app scaffold with Prisma 7 data layer, BigInt-safe serialization, and Server Component patterns
- Miami-Dade design system with Tailwind v4 tokens, responsive navigation (desktop + mobile tab bar), and reusable UI components
- Homepage with animated $13.2B hero counter, live database stats, and dual CTAs for Explorer and Calculator
- SEO-ready glossary page and BudgetTerm tooltip system for jargon-free budget explanations

### Known Gaps
- 26 of 40 v1 requirements remain pending (Phases 3-6: VIZ-01 through VIZ-07, PAGE-02 through PAGE-06, CALC-01 through CALC-05, AI-01 through AI-04, SRCH-01 through SRCH-03, SEO-01, SEO-02)
- Dead navigation links to /explorer (Phase 3) and /calculator (Phase 5)
- format.ts utilities bypassed by HeroBanner inline conversion
- 8 human verification items pending (browser/database QA)

---

