# Pitfalls Research

**Domain:** Civic Budget Data Visualization (Miami-Dade County)
**Researched:** 2026-02-28
**Confidence:** HIGH (multi-source verification across all critical areas)

## Critical Pitfalls

### Pitfall 1: BigInt Serialization Blows Up JSON API Responses

**What goes wrong:**
Prisma returns BigInt values for monetary fields stored as `BIGINT` in PostgreSQL. When Next.js API routes or Server Components try to serialize these to JSON via `JSON.stringify()`, they throw `TypeError: Do not know how to serialize a BigInt`. This crashes entire API responses, not just the affected field.

**Why it happens:**
JavaScript's native `JSON.stringify()` has no built-in support for BigInt. Prisma returns actual BigInt objects for BigInt columns, and unlike numbers, they cannot be implicitly converted. Developers test with small seed data that fits in Number range and never encounter the error until real budget numbers appear.

**How to avoid:**
1. Use Prisma 7.x (current stable is 7.4.x) which automatically casts BigInt to text inside JSON aggregation for relation joins.
2. For direct queries, create a Prisma Client extension that applies BigInt-to-string conversion across all operations:
```typescript
const prisma = new PrismaClient().$extends({
  result: {
    $allModels: {
      // Convert BigInt fields to string in all results
    },
  },
  query: {
    $allOperations: async ({ args, query }) => {
      const result = await query(args);
      return JSON.parse(
        JSON.stringify(result, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );
    },
  },
});
```
3. Create a single `formatCurrency(cents: bigint): string` utility used everywhere. Never format money inline.
4. Never use `Number(bigintValue)` for display -- values above `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991 = ~$90 trillion) silently lose precision. Miami-Dade's $13.2B budget is safe, but aggregated multi-year totals in cents could approach the limit.

**Warning signs:**
- Any `TypeError: Do not know how to serialize a BigInt` in server logs
- Monetary values appearing as `null` or `0` in API responses
- Tests passing with small fixture data but failing with real budget numbers
- Prisma `$queryRaw` returning Number instead of BigInt (known Prisma bug -- always verify type)

**Phase to address:**
Phase 1 (Database & Data Model) -- establish the Prisma extension and formatting utility before any API route or component touches monetary data.

---

### Pitfall 2: D3.js and React Fighting Over the DOM

**What goes wrong:**
D3.js manipulates the DOM directly (selections, enter/update/exit pattern, transitions). React manages the DOM through its Virtual DOM. When both try to control the same DOM elements, you get: ghost elements that survive React re-renders, memory leaks from orphaned D3 event listeners, React unmounting elements that D3 still references, and visual glitches where D3 renders duplicate elements on top of React's output.

**Why it happens:**
D3 tutorials and examples assume D3 owns the entire SVG. Developers copy D3 examples into useEffect hooks without accounting for React's lifecycle. The problem is invisible during initial render and only appears on re-renders, route changes, or component unmounts -- exactly the cases developers skip during manual testing.

**How to avoid:**
1. **Use D3 for math only, React for rendering.** Use D3's scales, layouts, and data transforms (`d3-scale`, `d3-hierarchy`, `d3-shape`), but render all SVG elements through React JSX. This eliminates DOM conflicts entirely.
2. If D3 must touch the DOM (for complex transitions), isolate it inside a ref-based container:
```typescript
const svgRef = useRef<SVGSVGElement>(null);
useEffect(() => {
  if (!svgRef.current) return;
  const svg = d3.select(svgRef.current);
  // D3 code here
  return () => {
    svg.selectAll("*").remove(); // Clean up on unmount
    // Remove event listeners explicitly
  };
}, [data]);
```
3. **Never** let D3 append elements that React also renders. Pick one owner per DOM subtree.
4. Use Recharts for standard charts (bar, line, pie, area). Reserve D3 only for the treemap/sunburst if Recharts Treemap proves insufficient.

**Warning signs:**
- Duplicate chart elements appearing after navigation
- Charts rendering correctly on first load but breaking on re-render
- Browser memory climbing steadily when navigating between pages with charts
- Console warnings about DOM nodes not matching during hydration

**Phase to address:**
Phase 2 (Visualization Components) -- establish the D3-for-math-only pattern as a project convention before any visualization code is written.

---

### Pitfall 3: Next.js Hydration Mismatches With Client-Side Charts

**What goes wrong:**
Chart components render different output on server vs client, causing React hydration errors: `Text content does not match server-rendered HTML` or `Hydration failed because the initial UI does not match what was rendered on the server`. This creates visual flicker, broken interactivity, and console errors that accumulate.

**Why it happens:**
Chart libraries (Recharts, D3) depend on browser APIs (`window`, `document`, `ResizeObserver`) that don't exist during SSR. Components that access `window.innerWidth` for responsive sizing, use `Date.now()` or locale-dependent formatting, or rely on CSS media queries for conditional rendering will produce different output on server vs client.

**How to avoid:**
1. Use `next/dynamic` with `ssr: false` for all chart components:
```typescript
const BudgetTreemap = dynamic(
  () => import("@/components/charts/BudgetTreemap"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```
2. **Critical App Router constraint:** `dynamic(... { ssr: false })` cannot be called in a Server Component. Create a Client Component wrapper first, then import that wrapper into the Server Component.
3. Always provide a meaningful loading skeleton (not a spinner) that matches the chart's approximate dimensions to prevent layout shift (CLS).
4. Never use `suppressHydrationWarning` as a fix -- it hides the symptom but leaves the mismatch. Only use it for inherently differing content like timestamps.

**Warning signs:**
- Console errors mentioning "hydration" on any page with charts
- Charts briefly showing wrong data then "jumping" to correct state
- Cumulative Layout Shift (CLS) scores above 0.1 in Lighthouse
- Chart components importing browser-only APIs at module level

**Phase to address:**
Phase 2 (Visualization Components) -- every chart component must use the dynamic import pattern from day one. Create a `ClientChart` wrapper utility in Phase 1.

---

### Pitfall 4: Civic Tech Information Overload Kills User Engagement

**What goes wrong:**
Developers build budget tools that present all the data because "transparency means showing everything." The resulting interface looks like a spreadsheet with pie charts. Residents visit, feel overwhelmed, and leave within 10 seconds. The tool gets praised by data nerds and ignored by the public it was built for.

**Why it happens:**
The team understands the data deeply and assumes users share that context. Budget literacy is assumed: terms like "operating expenditures," "general fund," "enterprise fund," "debt service," and "millage rate" are treated as self-evident. The design optimizes for completeness over comprehension.

**How to avoid:**
1. **Progressive disclosure:** Start with the simplest view (9 strategic areas as colored blocks with dollar amounts). Let users drill down on their own terms: Strategic Area -> Departments -> Line Items.
2. **Plain English first:** Every budget category needs a one-sentence description a 10th-grader would understand. "Public Safety: $2.8B" is useless. "Police, fire, corrections, and emergency services: $2.8 billion -- $850 per resident" tells a story.
3. **"What Does My Dollar Buy?" as the landing hook:** Don't start with the total budget. Start with the user's personal connection: their property value and what their taxes actually fund.
4. **Limit visible data points:** Show max 9-12 items per view. The Miami-Dade budget has 9 strategic areas -- this is a natural first level. Don't show all 35 departments at once.
5. **No jargon without a tooltip.** Every technical term gets a hover definition.
6. **Test with non-technical users early.** If your mom can't explain what she sees in 30 seconds, the design fails.

**Warning signs:**
- Homepage shows more than one chart or more than 12 data points
- No plain-English descriptions alongside budget numbers
- Users need to scroll to understand the main story
- Analytics show high bounce rate (>60%) on landing page
- Budget terms appear without explanation

**Phase to address:**
Phase 1 (Design & UX) -- content hierarchy and progressive disclosure structure must be defined before any visualization code. Phase 3 (AI Descriptions) must generate plain-English descriptions for every entity.

---

### Pitfall 5: PDF Parsing Produces Silently Wrong Budget Numbers

**What goes wrong:**
pdfplumber extracts tables from the Miami-Dade budget PDF, but merged cells, multi-line headers, spanning rows, and inconsistent formatting cause: numbers assigned to wrong departments, columns shifting by one, subtotals parsed as line items, dollar signs and parentheses (negatives) stripped incorrectly, and thousands separators creating duplicate entries. The extracted data "looks right" on spot-check but contains errors that compound through aggregation.

**Why it happens:**
Government budget PDFs are designed for print, not data extraction. They use complex table layouts with merged header cells, repeated headers across pages, varying column widths between sections, and decorative lines that pdfplumber interprets as table borders. The Budget in Brief PDF is a summary document with especially creative formatting.

**How to avoid:**
1. **Visual debugging is mandatory:** Use pdfplumber's `page.to_image()` to overlay detected table boundaries on each page. Visually verify every table extraction before trusting the data.
2. **Validate totals against known figures:** The total budget ($13,233,238,000), operating budget ($8,575,606,000), and capital budget ($4,657,632,000) are published figures. Sum extracted data and compare. If sums don't match, the extraction is wrong.
3. **Manual verification table:** Create a spreadsheet mapping each department's known budget to the extracted value. Flag any discrepancy over $1,000.
4. **Configure table detection explicitly:** Don't rely on pdfplumber's default `extract_tables()`. Tune `table_settings` with explicit `vertical_strategy`, `horizontal_strategy`, `snap_tolerance`, and `join_tolerance` per section of the PDF.
5. **Treat PDF extraction as a one-time pipeline, not a runtime operation.** Extract once, verify manually, seed to database. Don't re-parse at runtime.
6. **Consider manual data entry for the Budget in Brief.** It's only ~35 departments with a few figures each. 2 hours of manual entry with verification may be more reliable than days of debugging pdfplumber configurations.

**Warning signs:**
- Extracted row counts don't match expected department counts
- Column sums don't match published totals
- `None` values appearing in extracted table cells (merged cell artifact)
- Negative numbers appearing as positive (parenthetical notation stripped)
- Department names truncated or concatenated with adjacent cell content

**Phase to address:**
Phase 0 (Data Pipeline) -- this must be completed and verified before any other phase begins. Bad data propagates through the entire application.

---

### Pitfall 6: Recharts Treemap Limitations Force Mid-Project Library Switch

**What goes wrong:**
Developers choose Recharts for its simplicity, then discover its Treemap component lacks: drill-down interaction (click to zoom into a category), smooth animated transitions between levels, proper label positioning for small rectangles, responsive behavior that works on mobile, and custom tooltip positioning for nested hierarchies. Mid-project, they either hack workarounds that are fragile or switch to D3 treemap, which means rewriting the core visualization.

**Why it happens:**
Recharts Treemap works well for static, single-level treemaps. The BudgetExplorer needs a multi-level drill-down treemap (Strategic Area -> Department -> Line Items) with animations, which pushes beyond Recharts Treemap's design intent.

**How to avoid:**
1. **Prototype the treemap interaction in Phase 2 before committing.** Build a working drill-down prototype with real budget data using Recharts Treemap. If it can't handle the interaction within 2 days of effort, switch to D3 `d3-hierarchy` + `treemapSquarify` with React rendering.
2. **Have the D3 fallback plan ready.** Write the D3 treemap layout code separately so it can be swapped in without rewriting components.
3. **Consider Recharts for simple charts + D3 for treemap from the start.** Use Recharts for bar charts (year-over-year comparison), pie/donut charts (revenue sources), and line charts (trends). Use D3 layout calculations + React SVG rendering for the treemap/sunburst.
4. **Alternative: Replace treemap with drill-down stacked bar chart on mobile.** Treemaps are notoriously bad on small screens. NNGroup research confirms that simpler bar charts outperform treemaps for data comparison. Use treemap on desktop, stacked bar chart on mobile.

**Warning signs:**
- Recharts Treemap `onClick` handler doesn't support drill-down state management
- Labels overflow or disappear on small rectangles
- Animation between treemap states is jerky or absent
- Mobile users can't tap individual rectangles reliably

**Phase to address:**
Phase 2 (Visualization Components) -- build the treemap prototype first, before any other chart. This is the highest-risk visualization component.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding budget data as JSON instead of database | Ship MVP faster | Can't add years, can't search, can't do year-over-year comparison | Phase 1 MVP only, migrate to DB in Phase 2 |
| Using `Number()` for BigInt display | Simpler formatting code | Precision loss on large aggregations, inconsistent rounding | Never -- always format from BigInt |
| Skipping data table fallbacks for charts | Faster initial development | Fails WCAG 1.1.1, excludes screen reader users, potential ADA liability for a government transparency tool | Never -- civic tools have heightened accessibility obligations |
| Using `suppressHydrationWarning` on chart containers | Silences console errors | Masks real rendering bugs that cause visual glitches | Never -- fix the root cause |
| Inlining currency formatting per-component | Faster to write each component | Inconsistent formatting ($13.2B vs $13,200,000,000 vs $13.2 billion) | Never -- use single utility |
| Skipping PDF extraction validation | Faster pipeline development | Wrong numbers in production, loss of public trust | Never -- verify against published totals |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Prisma + BigInt + Next.js API Routes | Returning raw Prisma results from API routes without serialization | Create a Prisma client extension that converts BigInt to string, or serialize in a data access layer before API response |
| pdfplumber + government PDFs | Using default `extract_tables()` without configuring table detection settings | Inspect each page visually with `to_image()`, configure `table_settings` per section, validate totals |
| Anthropic Claude API for descriptions | Generating descriptions at build time with no caching, causing API rate limits and costs on every build | Generate once, store in database as `ai_descriptions` table, regenerate only on data changes |
| Vercel + Server Components + Prisma | Prisma Client instantiation creating multiple connections in serverless environment | Use singleton pattern: `globalThis.prisma ??= new PrismaClient()` in development; Vercel handles pooling via Prisma Accelerate or direct connection in production |
| Next.js + `@vercel/og` for OG images | Generating OG images client-side or with chart library rendering | Use `@vercel/og` with ImageResponse in route handlers; render simplified chart representations (colored bars, not full interactive charts) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all 5 years of budget data on initial page load | Slow first contentful paint, large JS bundle | Load current year by default, lazy-load comparison data on user interaction | When dataset exceeds ~500 line items across years |
| Rendering treemap with 200+ rectangles in SVG | Janky scrolling, high CPU on mobile, touch events lag | Aggregate to department level (35 items max), show line items only on drill-down | > 100 SVG elements on mobile devices |
| Re-creating Intl.NumberFormat on every render | Cumulative performance hit on pages with many formatted numbers | Create formatter once at module level: `const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Pages with > 50 formatted monetary values |
| Unoptimized Prisma queries fetching full department objects when only names are needed | Slow API responses, high memory usage on serverless | Use `select` to fetch only required fields; use `include` sparingly | > 50 concurrent users on serverless |
| Client-side year-over-year calculation | Recalculates percentage changes on every render | Compute year-over-year deltas in the data pipeline or server-side, store as pre-computed columns | When comparing > 3 fiscal years with > 100 line items |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Anthropic API key in client-side code | API key theft, unauthorized usage, billing surprise | AI descriptions are pre-generated and stored in DB. The API key lives only in the data pipeline `.env`, never in the Next.js app |
| Database connection string in client bundle | Full database access exposure | Prisma runs only in Server Components and API routes. Verify with `"use server"` directive. Never import Prisma client in files with `"use client"` |
| Unsanitized search input passed to Prisma `$queryRaw` | SQL injection | Use Prisma's type-safe query builder for search. If raw SQL is needed, use tagged template literals: `` prisma.$queryRaw`SELECT ... WHERE name ILIKE ${`%${input}%`}` `` |
| No rate limiting on API routes | DoS attacks on search/calculator endpoints | Apply rate limiting middleware (e.g., `@upstash/ratelimit` or Vercel's built-in edge rate limiting) on public API routes |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw dollar amounts without context | "$2.8B for Public Safety" means nothing to most people | Show per-capita cost ("$850 per resident"), percentage of total ("21% of budget"), and year-over-year change ("+5.2%") |
| Treemap labels disappearing on small rectangles | Users can't identify small departments | Use tooltip on hover/tap, or switch to sorted bar chart when rectangles are too small to label |
| Color-only encoding of budget categories | Colorblind users (8% of males) can't distinguish categories | Combine color with patterns, labels, or numbering. Use colorblind-safe palette (the Miami-Dade brand colors blue/orange/green are reasonably distinguishable) |
| "Penny visualization" without interaction | Static penny breakdown is forgettable | Make it interactive: hover/tap a segment to see department details, animate the penny splitting |
| Tax calculator requiring manual millage rate knowledge | User abandonment -- nobody knows their millage rate | Auto-detect from address or just ask for property value. Apply the county millage rate (9.5778 mills) automatically. Explain what millage means in a tooltip |
| Presenting operating and capital budgets mixed together | Confuses the narrative -- recurring costs vs. one-time investments are different stories | Separate tabs or toggle: "Day-to-Day Operations ($8.6B)" vs "Building the Future ($4.7B)" |
| Charts without data table alternatives | Screen reader users get zero information from chart-heavy pages | Provide a visually hidden `<table>` for every chart, or a toggle to switch between chart and table view |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Treemap visualization:** Often missing keyboard navigation -- verify Tab can reach the chart and Arrow keys navigate between segments
- [ ] **Currency formatting:** Often missing consistent significant figures -- verify "$13.2B" vs "$13,233,238,000" is chosen by context (overview vs detail) and never mixed within same view
- [ ] **Tax calculator:** Often missing input validation -- verify edge cases: $0 property value, $100M property value, non-numeric input, negative values
- [ ] **Mobile charts:** Often missing touch target sizes -- verify all tappable chart areas are at least 44x44px per WCAG 2.5.5
- [ ] **Year-over-year comparison:** Often missing "new department" handling -- verify what happens when a department exists in FY2025-26 but not FY2021-22 (show as "NEW" not as error)
- [ ] **Search functionality:** Often missing empty state -- verify what users see when search returns no results (helpful message, not blank page)
- [ ] **OG/social sharing:** Often missing per-page OG images -- verify that sharing a department page shows that department's data in the preview, not generic site image
- [ ] **AI descriptions:** Often missing staleness indicator -- verify descriptions note which fiscal year they describe and when they were generated
- [ ] **Accessibility:** Often missing skip navigation link -- verify users can skip past the main navigation to content, especially important for chart-heavy pages
- [ ] **Data integrity:** Often missing validation against source -- verify that sum of all department budgets equals published total ($13,233,238,000)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BigInt serialization errors in production | LOW | Add Prisma client extension (30 min fix), redeploy. No data loss. |
| Wrong budget numbers from PDF extraction | MEDIUM | Manually verify all extracted data against PDF, correct in seed script, re-seed database. Audit all derived calculations. |
| Hydration mismatch cascade | MEDIUM | Wrap all chart components in dynamic imports with ssr:false. Create ClientChart wrapper utility. Test each page in production build mode (not dev). |
| D3/React DOM conflict causing memory leaks | HIGH | Requires rewriting visualization approach. Migrate to D3-for-math pattern. Add cleanup functions to all useEffect hooks. Profile memory before/after. |
| Treemap library switch mid-project | HIGH | If caught early (Phase 2 prototype), 2-3 day rewrite. If caught late (Phase 4+), 1-2 week rewrite plus regression testing of all interactions. |
| Accessibility complaints / ADA inquiry | HIGH | Retrofit data tables for all charts, add ARIA labels, fix keyboard navigation, add skip links. Could take 2-4 weeks if not built in from the start. |
| Information overload user feedback | MEDIUM | Simplify landing page, add progressive disclosure layers, write plain-English descriptions. Easier to remove complexity than add clarity. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| PDF parsing errors | Phase 0: Data Pipeline | Sum of extracted departments equals $13,233,238,000 |
| BigInt serialization | Phase 1: Database + Data Layer | API routes return valid JSON with monetary values as formatted strings |
| Information overload | Phase 1: Design + Content Hierarchy | User test: non-technical person can explain the landing page in 30 seconds |
| Hydration mismatches | Phase 2: Visualization Components | `next build && next start` shows zero hydration warnings in console |
| D3/React DOM conflicts | Phase 2: Visualization Components | Memory profile shows no growth after 10 navigation cycles between chart pages |
| Recharts treemap limitations | Phase 2: Visualization Components (first sprint) | Working drill-down prototype with real data before building other charts |
| Accessibility gaps | Phase 2: Visualization Components (parallel track) | WAVE tool reports zero errors; keyboard-only navigation works for all charts |
| Mobile treemap unusability | Phase 2: Visualization Components | Treemap (or alternative) is usable on 375px-wide viewport with touch |
| SEO for chart pages | Phase 3: Pages + SEO | Google Search Console shows all department pages indexed; social share previews show correct OG images |
| AI description staleness | Phase 3: AI Descriptions | Each description includes fiscal year reference; regeneration script exists |
| Performance with full dataset | Phase 4: Optimization | Lighthouse Performance score > 90 on mobile with all 5 fiscal years available |

## Sources

- [Prisma BigInt serialization discussion](https://github.com/prisma/prisma/discussions/9793) -- HIGH confidence
- [Prisma ORM 7.3.0 BigInt JSON fix](https://www.prisma.io/blog/prisma-orm-7-3-0) -- HIGH confidence
- [Prisma special fields and types documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types) -- HIGH confidence
- [MDN: TypeError BigInt not serializable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/BigInt_not_serializable) -- HIGH confidence
- [D3.js and React DOM struggle](https://medium.com/@ecccs_FCC/d3-js-react-and-the-struggle-for-the-dom-116dd1045f22) -- MEDIUM confidence
- [React + D3 integration patterns (GitHub gist)](https://gist.github.com/alexcjohnson/a4b714eee8afd2123ee00cb5b3278a5f) -- MEDIUM confidence
- [Next.js hydration error documentation](https://nextjs.org/docs/messages/react-hydration-error) -- HIGH confidence
- [Fix hydration mismatch errors in Next.js (2026)](https://oneuptime.com/blog/post/2026-01-24-fix-hydration-mismatch-errors-nextjs/view) -- MEDIUM confidence
- [The ssr:false trap in Next.js App Router](https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778) -- MEDIUM confidence
- [pdfplumber merged cells handling (Issue #84)](https://github.com/jsvine/pdfplumber/issues/84) -- HIGH confidence
- [pdfplumber multi-line cell issue (Issue #317)](https://github.com/jsvine/pdfplumber/issues/317) -- HIGH confidence
- [Recharts performance issues (Issue #1146)](https://github.com/recharts/recharts/issues/1146) -- HIGH confidence
- [Recharts accessibility discussion (#4484)](https://github.com/recharts/recharts/discussions/4484) -- HIGH confidence
- [Recharts accessibility wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility) -- HIGH confidence
- [WCAG accessible data visualization guide](https://www.a11y-collective.com/blog/accessible-charts/) -- MEDIUM confidence
- [Accessible charts with data table fallbacks (Smashing Magazine)](https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/) -- MEDIUM confidence
- [NNGroup treemaps and alternatives](https://www.nngroup.com/articles/treemaps/) -- HIGH confidence
- [Storytelling with Data: treemap alternatives](https://www.storytellingwithdata.com/blog/2018/6/5/an-alternative-to-treemaps) -- MEDIUM confidence
- [Responsive data visualization techniques](https://data.europa.eu/apps/data-visualisation-guide/responsive-data-visualisation-introduction) -- MEDIUM confidence
- [Progressive disclosure in UX (NNGroup)](https://www.nngroup.com/articles/progressive-disclosure/) -- HIGH confidence
- [Next.js metadata and OG images documentation](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) -- HIGH confidence
- [Dashboard design principles (UXPin)](https://www.uxpin.com/studio/blog/dashboard-design-principles/) -- MEDIUM confidence

---
*Pitfalls research for: Miami-Dade Budget Explorer -- Civic Budget Data Visualization*
*Researched: 2026-02-28*
