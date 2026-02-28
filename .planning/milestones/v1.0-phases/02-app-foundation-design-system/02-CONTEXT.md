# Phase 2: App Foundation + Design System - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A working Next.js application with the homepage shell, Miami-Dade design system, Prisma data layer, and responsive layout. This is the scaffold all subsequent phases build on. Visualizations (treemap, charts) are Phase 3. Department pages are Phase 4. Tax calculator is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Homepage hero & first impression
- $13.2B hero number uses a count-up animation (rolling from $0 to $13.2B over ~2 seconds)
- Below the hero number: a quick stats row showing key figures (9 strategic areas, 35 departments, etc.)
- Dual CTAs side by side: primary "Explore the Budget" and secondary "Calculate Your Taxes"
- Overall tone: authoritative but approachable — trustworthy government resource that's actually well-designed

### Design system personality
- Neutral base (white/gray) with color reserved almost entirely for data visualization and charts — colors carry meaning, not decoration
- Miami-Dade brand colors (#0057B8 blue, #F7941D orange, #00A651 green, #EF4444 red) used primarily in data viz, not UI chrome
- Flat cards with subtle borders (no shadows) — Linear/Notion aesthetic, clean and modern
- Medium information density — balanced padding and text size, dashboard-like (Stripe Dashboard feel)
- Light mode only for v1, but design tokens (CSS variables) structured to support dark mode later

### Site structure & navigation
- Top navigation bar for main sections (Home, Explorer, Calculator, etc.)
- Sidebar navigation appears on detail/explorer pages for sub-navigation within sections
- Mobile: bottom tab bar (always visible, thumb-friendly, app-like feel)
- Resource footer: source budget PDF link, related resources (county budget office, open data portal), methodology notes, credit
- Breadcrumb navigation on all detail pages (e.g., Home > Explorer > Public Safety > Police)

### Jargon & data formatting
- Budget jargon explained via inline tooltips on hover (desktop) / tap (mobile) — dotted underline signals "this term is explained"
- Dedicated /glossary page listing all budget terms with plain-English definitions (good for SEO)
- Dollar amounts: adaptive formatting — abbreviated in headlines/cards ($13.2B), full in tables/detail views ($13,233,238,000)
- Year-over-year percentage changes: neutral color-coding — blue for increases, orange for decreases (avoids implying "good" or "bad")

### Claude's Discretion
- Loading skeleton design and animation patterns
- Exact spacing, typography scale, and component sizing
- Error state design and messaging
- Glossary term selection and definition writing
- Quick stats row: which specific stats to feature

</decisions>

<specifics>
## Specific Ideas

- "Mint.com for county budgets" — the design reference from requirements (UX-05)
- Linear/Notion card aesthetic — flat, bordered, modern
- Stripe Dashboard density level — balanced, not cramped
- Bottom tab bar on mobile gives an app-like native feel
- Neutral color-coding for budget changes avoids political interpretation of increases/decreases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-app-foundation-design-system*
*Context gathered: 2026-02-28*
