# Phase 6: Search + SEO + Launch - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can search across all budget data by keyword and find relevant departments, strategic areas, and glossary terms. Every page has unique SEO metadata and Open Graph images optimized for social sharing and search engine discovery. Includes sitemap, robots.txt, canonical domain configuration, and a custom 404 page.

</domain>

<decisions>
## Implementation Decisions

### Search experience
- Search icon in navbar that navigates to a dedicated `/search` page (add to `nav-config.ts`)
- Full search box on `/search` page — not a typeahead/command-K overlay
- Results grouped by type under section headers: "Departments", "Strategic Areas", "Glossary Terms"
- Type-appropriate result cards sharing a flat card shell:
  - **Departments**: name + strategic area badge + budget amount + AI description snippet
  - **Strategic areas**: name + colored border + cents-per-dollar badge + mission snippet
  - **Glossary terms**: term + full definition only
- Empty state shows helpful suggestions: "No results for 'xyz'. Try: parks, fire rescue, public safety" — suggest popular departments or terms

### Search scope & indexing
- Searchable content: departments, strategic areas, and glossary terms
- Department search indexes: name + AI summary + key changes (from `budget_descriptions`)
- Strategic area search indexes: name + description
- Glossary search indexes: term + definition
- Do NOT index department aliases, expenditure categories, revenue sources, or disbursements
- Use PostgreSQL full-text search (`tsvector`) with ranking and stemming
- Weighted fields: names weighted higher than descriptions

### OG images + social sharing
- Single branded OG image template for all page types (via Next.js ImageResponse API)
- Minimal text card design: white/light background, page title prominently displayed, small "Miami-Dade Budget Explorer" branding at bottom
- Every page type gets a unique meta description:
  - Homepage, explorer, department (already has `generateMetadata`), calculator, glossary, search
- Sitemap auto-generated from database — queries all department and area slugs dynamically
- Include `robots.txt`

### Domain & deployment
- Canonical domain: `budgetexplorer.miami` — use this URL everywhere in the codebase (sitemap.ts, robots.ts, OG images, footer, canonical tags)
- Deploy to Vercel preview URL for testing; DNS pointed to Vercel when ready for public launch
- No analytics setup now — add TODO comment in layout.tsx: `{/* TODO: Add Umami analytics before public launch - self-hosted on Vercel, free tier */}`

### Custom 404 page
- Branded "page not found" with navigation back to homepage and explorer
- Match existing design system styling

### Claude's Discretion
- Search ranking weights and tsvector configuration details
- OG image exact layout, font sizes, and spacing
- 404 page illustration or icon choice
- Loading/skeleton states for search results
- Popular search suggestions list for empty state
- robots.txt crawl directives specifics

</decisions>

<specifics>
## Specific Ideas

- Type-appropriate cards use the same flat card shell but each entity type has its own content layout inside
- Strategic area result cards should use the area's `color` field for their colored border
- Domain `budgetexplorer.miami` must be hardcoded as canonical base URL (not derived from request headers)
- Vercel preview deployment for testing before DNS cutover
- Umami (self-hosted, free tier) is the planned analytics provider for post-launch

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nav-config.ts`: Centralized nav items — add Search entry here
- `Navbar` / `MobileTabBar`: Already consume `NAV_ITEMS` — search icon auto-appears
- `ChartContainer` / flat card patterns: Established card shells in components/charts and components/explorer
- `generateMetadata` pattern: Already implemented on department pages — extend to all page types
- `format.ts`: Dollar formatting utilities (`formatDollarsAbbreviated`, `formatDollarsFull`)
- `prisma.ts`: Shared Prisma client singleton
- `queries.ts`: All data access functions — add search query here

### Established Patterns
- Static generation with `generateStaticParams` for department and area pages
- BigInt → string serialization pattern for all budget amounts
- `SerializedX` type pattern for all data transfer objects
- Tailwind CSS with design system tokens (mdc-blue, surface, text-primary, etc.)
- Breadcrumbs component for navigation hierarchy

### Integration Points
- `nav-config.ts` — add `/search` route
- `app/layout.tsx` — update base OG metadata, add analytics TODO comment
- `prisma/schema.prisma` — may need raw SQL migration for tsvector columns
- `app/sitemap.ts` — new file, queries departments + areas from DB
- `app/robots.ts` — new file with canonical domain
- `app/not-found.tsx` — new file for custom 404
- `app/api/og/route.tsx` — new file for OG image generation
- `app/search/page.tsx` — new search page

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-search-seo-launch*
*Context gathered: 2026-03-01*
