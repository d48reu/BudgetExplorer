# Feature Research

**Domain:** Civic budget visualization and transparency tools
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (based on analysis of 10+ live products and platforms, verified across multiple sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Hierarchical drill-down navigation** | Every major budget tool (USASpending, OpenGov, OpenBudget Oakland) offers drill-down from totals to categories to departments to line items. Users expect to click and explore deeper. | MEDIUM | Treemap is the planned approach. USAFacts uses Sankey, USASpending uses bar charts, OpenGov uses tiles. Treemap is strong for area-proportional hierarchy. |
| **Revenue + expenditure overview** | Open Budget Oakland, USAFacts, and VisGov all show both sides of the budget on the landing page. Users want "where does money come from" AND "where does it go" in one view. | LOW | Donut/pie for revenue is already planned. Make sure both are visible on homepage. |
| **Department-level detail pages** | OpenGov, Questica OpenBook, and USASpending all let you click into a department and see its full breakdown by expenditure category. This is the natural endpoint of drill-down. | MEDIUM | Each of 35 departments needs its own page. Include expenditure category breakdown (personnel, operating, capital). |
| **Year-over-year comparison** | Open Budget Oakland has a dedicated comparison tool. USAFacts shows trends. Hamilton Project offers "Compare by year." Multi-year context prevents misleading snapshots. | MEDIUM | 5 fiscal years (FY 2021-22 through FY 2025-26) are in the data model. Show sparkline trends on department pages plus a comparison view. |
| **Full-text search** | USAFacts, USASpending, OpenGov, and Questica all offer search across budget data. Users expect to type a department name or keyword and find results. | LOW | Search across departments, descriptions, and line items. Fuzzy matching is a nice-to-have but exact/substring search is the baseline. |
| **Responsive mobile design** | WCAG and civic design system best practices mandate mobile-first. Most residents access on phones. Questica OpenBook is WCAG AA certified. Every modern civic tool is responsive. | MEDIUM | Treemap on mobile is hard -- plan a list/accordion fallback for small screens rather than forcing a tiny treemap. |
| **Data table fallbacks** | VisGov, OpenGov, and Questica all provide tabular views alongside charts. Required for accessibility (screen readers) and for users who prefer raw numbers. | LOW | Every chart should have a toggle to show underlying data as a sortable table. This is an accessibility requirement. |
| **Shareable URLs / deep linking** | Civic tools must let journalists, activists, and commissioners share a link to a specific department or view. OpenGov and USASpending support direct links to specific views. | LOW | Use Next.js App Router to make every view its own URL route. This is essentially free with the planned architecture. |
| **Open Graph / SEO metadata** | Journalists and activists share links on social media. Without OG tags, shared links look generic and get less engagement. | LOW | Already planned. Each department page and main views need unique title/description/image. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by the ecosystem, but create unique value for Miami-Dade residents.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"What Does My Tax Dollar Buy?" calculator** | VisGov has a basic "My Tax Bill" shortcode. The LA Controller has a participatory budget tool. But no civic budget tool combines personalized property tax input with a visual breakdown showing "your $3,200 in taxes buys $X of police, $Y of parks." This makes the abstract budget feel personal. | MEDIUM | Input: property value. Multiply by millage rate (9.5778 mills total) to get tax bill. Then proportionally allocate across strategic areas. Display as colored segments (the "penny visualization"). |
| **AI-generated plain-English descriptions** | No existing civic budget visualization tool uses AI to explain what departments do in plain language. OECD research highlights this as a frontier for civic tech. Most tools show only numbers and official labels. Explaining "what does WASD do?" in human terms is a major barrier to engagement. | MEDIUM | Claude API generates descriptions during data pipeline (not at runtime). Store in DB. This is a genuine innovation -- no competitor does this. Verify descriptions for accuracy before publishing. |
| **Penny visualization** | While "where does your dollar go" is a common framing (USAFacts, IRS receipts), rendering it as a visual dollar or coin broken into colored proportional segments by strategic area is a memorable, shareable graphic that most tools lack. | LOW | Simple proportional bar or coin graphic. Each segment is a strategic area with label + percentage. Make it the social media sharing image. |
| **Strategic area grouping** | Miami-Dade organizes its 35 departments into 9 strategic areas (Public Safety, Transportation, Health, etc.). Most budget tools show flat department lists. Grouping by strategic area adds a meaningful middle layer that helps residents understand government priorities before diving into departments. | LOW | This is baked into the data model. Use it as the primary navigation level between total budget and departments. |
| **Contextual annotations on changes** | USAFacts provides "pop-up annotations" but most tools show numbers without context. Annotating notable year-over-year changes ("Fire Department budget increased 12% due to new station construction") transforms raw data into a story. | MEDIUM | AI-generated during data pipeline. Flag departments with changes >10% and generate explanations. These appear as callouts on department pages. |
| **Embeddable widgets** | OpenGov and Questica offer embedding. Allowing journalists, commissioners, and community groups to embed a budget chart or department view on their own sites extends reach without users needing to visit the app directly. | MEDIUM | Build as standalone iframe-compatible components. Defer to v1.x -- not essential for launch but high-value for adoption. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Participatory budgeting / "Build Your Own Budget"** | LA Controller has this. Polco, Citizen Budget, and Stanford PB Platform all offer it. Seems engaging. | Requires user accounts, session management, data submission pipeline, and ongoing moderation. Fundamentally different product (engagement tool vs. transparency tool). Massively increases scope. Miami-Dade's budget is adopted by commission, not by popular vote -- this tool would create expectations the county can't meet. | Focus on transparency (showing the adopted budget clearly) rather than simulation. Link to the county's actual public comment process instead. |
| **Real-time spending / checkbook data** | Some tools (LA Controller Open Expenditures, USASpending) show actual disbursements. Users want to see if money was actually spent. | Requires integration with county financial systems, ongoing data feeds, reconciliation logic, and potential privacy concerns with vendor payments. The county's adopted budget is annual -- real-time checkbook is a different data source entirely. | Defer to a future milestone as stated in PROJECT.md. Show adopted budget amounts clearly and note them as "adopted" not "spent." |
| **User accounts and saved views** | Enterprise tools (OpenGov, Questica) offer this. Seems useful for repeat visitors. | Adds authentication complexity, data storage obligations, privacy policy requirements, and maintenance burden. The target audience (residents, journalists) visits occasionally, not daily. Zero-friction access is more important than personalization. | The tax calculator can use URL parameters to save state. No accounts needed. |
| **Multi-language support** | Miami-Dade is majority Spanish-speaking. Accessibility advocates will request this. | Requires translation of all AI-generated descriptions, UI copy, and budget terminology. Doubles content maintenance burden. Gets stale fast if not maintained. | Build with i18n-ready architecture (externalized strings) so Spanish can be added later, but ship English-only for v1 as stated in PROJECT.md. |
| **Budget forecasting / projections** | Some tools show projected future budgets. Engaging for policy wonks. | Requires economic modeling, assumptions documentation, and opens the county to criticism for "inaccurate predictions." Budget projections are politically sensitive. The county produces its own forecasts -- duplicating them invites controversy. | Show historical trends (5 years of actuals) and let users draw their own conclusions. Link to the county's official forecast documents. |
| **Chatbot / conversational budget Q&A** | OECD highlights AI chatbots (GRASP) for budget engagement. Seems modern and accessible. | Runtime AI calls add latency, cost, and unpredictability. Chatbot could hallucinate budget figures. Maintaining accuracy is an ongoing obligation. Quality of responses degrades without continuous fine-tuning. | Use pre-generated AI descriptions (static, verified, cached in DB) instead of live chatbot responses. The descriptions answer the same "what does this mean?" question without the risks. |
| **Interactive map of capital projects** | Questica OpenBook offers GIS-mapped capital projects. Boston shows neighborhood infrastructure. Seems natural for a county tool. | Requires geocoding all capital projects, maintaining GIS data, building a map interface (Leaflet/Mapbox), and explaining project statuses. Capital programs are already out of scope for v1 per PROJECT.md. | Defer to future milestone. The strategic area and department views cover the same "where does money go?" question without geographic complexity. |

## Feature Dependencies

```
[Data pipeline (PDF extraction + DB seeding)]
    |
    +--requires--> [Hierarchical drill-down (treemap)]
    |                  |
    |                  +--requires--> [Department detail pages]
    |                  |                  |
    |                  |                  +--enhances--> [Year-over-year comparison]
    |                  |                  |
    |                  |                  +--enhances--> [AI descriptions]
    |                  |
    |                  +--enhances--> [Full-text search]
    |
    +--requires--> [Revenue overview (donut chart)]
    |
    +--requires--> [Tax calculator]
    |                  |
    |                  +--requires--> [Millage rate data in DB]
    |                  |
    |                  +--enhances--> [Penny visualization]
    |
    +--requires--> [SEO / Open Graph metadata]

[Responsive mobile design] --enhances--> [All visualization features]

[Data table fallbacks] --required-by--> [All chart/visualization features]

[Shareable URLs] --free-with--> [Next.js App Router architecture]
```

### Dependency Notes

- **Data pipeline must come first:** Every visualization depends on extracted, structured budget data in the database. Without the pipeline, nothing renders.
- **Treemap requires hierarchical data:** The strategic area -> department -> expenditure category hierarchy must exist in the data model before the treemap can render.
- **Tax calculator requires millage rates:** The personalized breakdown depends on millage rate data being in the database, not just department totals.
- **AI descriptions are pipeline-time, not runtime:** Descriptions are generated during data ingestion and stored in the DB. They don't depend on the frontend being built.
- **Search is trivially dependent on data:** Full-text search can be added at any point after data exists in the DB. PostgreSQL full-text search handles this without additional infrastructure.
- **Mobile responsiveness must be designed in from the start:** Retrofitting responsive design onto complex treemap visualizations is painful. Design mobile-first, not mobile-after.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate that residents find this useful and shareable.

- [ ] **Hierarchical treemap drill-down** -- The core interaction. Total budget -> 9 strategic areas -> 35 departments -> expenditure categories. This IS the product.
- [ ] **Revenue overview** -- Donut or pie chart showing where money comes from (property tax, fees, state/federal, etc.). Completes the "full picture."
- [ ] **Department detail pages** -- Click any department for expenditure breakdown, employee count, and AI-generated description. The drill-down's natural destination.
- [ ] **"What Does My Tax Dollar Buy?" calculator** -- Enter property value, see personalized breakdown. This is the viral hook -- shareable, personal, and novel.
- [ ] **AI-generated descriptions** -- Pre-generated plain-English explanations of each department and strategic area. The thing that makes budget data legible to non-experts.
- [ ] **Year-over-year trends** -- Sparklines or small bar charts showing 5-year trends on department pages. Provides context that static numbers lack.
- [ ] **Full-text search** -- Type a keyword, find relevant departments and line items.
- [ ] **Data table fallbacks** -- Every chart has a table view toggle. Required for accessibility.
- [ ] **Responsive mobile design** -- Works well on phones. List/accordion fallback for treemap on small screens.
- [ ] **SEO + Open Graph** -- Each page has proper metadata for sharing on social media and appearing in search results.

### Add After Validation (v1.x)

Features to add once the core product is live and getting traction.

- [ ] **Penny visualization** -- Trigger: when social media sharing is validated as a growth channel. The visual dollar breakdown becomes a shareable graphic.
- [ ] **Embeddable widgets** -- Trigger: when journalists or commissioners ask to embed charts on their sites. Build iframe-compatible components.
- [ ] **Contextual change annotations** -- Trigger: when users ask "why did X budget change?" on department pages. AI-generated explanations of notable year-over-year changes.
- [ ] **Comparison mode** -- Trigger: when users want to compare two departments or two fiscal years side-by-side, a la Open Budget Oakland's comparison tool.
- [ ] **CSV/PDF export** -- Trigger: when power users (journalists, analysts) want to download data for their own analysis.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Online Checkbook / disbursement data** -- Requires county data feed integration. Different data source entirely.
- [ ] **Capital project detail pages** -- Schema supports it, but UI deferred per PROJECT.md.
- [ ] **Spanish language support** -- Build i18n-ready now, translate later.
- [ ] **Embeddable budget simulator** -- Only if demand emerges for participatory engagement.
- [ ] **Geographic/map visualization** -- Capital projects on a Leaflet map. Requires geocoding pipeline.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hierarchical treemap drill-down | HIGH | HIGH | P1 |
| Revenue overview (donut chart) | HIGH | LOW | P1 |
| Department detail pages | HIGH | MEDIUM | P1 |
| Tax calculator ("What Does My Tax Dollar Buy?") | HIGH | MEDIUM | P1 |
| AI-generated descriptions | HIGH | MEDIUM | P1 |
| Year-over-year trends | MEDIUM | MEDIUM | P1 |
| Full-text search | MEDIUM | LOW | P1 |
| Data table fallbacks | MEDIUM | LOW | P1 |
| Responsive mobile design | HIGH | MEDIUM | P1 |
| SEO + Open Graph metadata | MEDIUM | LOW | P1 |
| Penny visualization | MEDIUM | LOW | P2 |
| Embeddable widgets | MEDIUM | MEDIUM | P2 |
| Contextual change annotations | MEDIUM | MEDIUM | P2 |
| Comparison mode | LOW | MEDIUM | P2 |
| CSV/PDF export | LOW | LOW | P2 |
| Online Checkbook | HIGH | HIGH | P3 |
| Capital project pages | MEDIUM | HIGH | P3 |
| Spanish language | HIGH | HIGH | P3 |
| Map visualization | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when traction validates demand
- P3: Future consideration, different milestone

## Competitor Feature Analysis

| Feature | USASpending.gov | Open Budget Oakland | USAFacts | VisGov Visual Budget | OpenGov/Questica | LA Controller | BudgetExplorer (Our Approach) |
|---------|----------------|---------------------|----------|---------------------|-----------------|---------------|-------------------------------|
| **Primary visualization** | Bar charts, spending explorer | Flow charts, detailed tables | Sankey diagram | Collapsible tree + donut | Drill-down tiles | Bar charts, tables | Treemap with drill-down |
| **Drill-down depth** | 3 levels (function/agency/object class) | 3 levels (fund/dept/line) | 2 levels (category/subcategory) | 2 levels (category/sub) | 3+ levels | 2 levels | 4 levels (total/strategic area/dept/expenditure) |
| **Year-over-year** | Yes (FY2017+) | Yes (comparison tool) | Yes (sparklines) | No | Limited | Yes (10 years) | Yes (5 fiscal years with sparklines) |
| **Tax calculator** | No | No | No | Basic ("My Tax Bill") | No | No (but has "Build Your Budget") | Yes -- personalized with property value + millage rates |
| **AI descriptions** | No | No | No | No | No | No | Yes -- plain-English department descriptions via Claude |
| **Search** | Yes | No | Yes | No | Yes | Yes | Yes |
| **Mobile responsive** | Yes | Partial | Yes | Partial | Yes | Yes | Yes (mobile-first with fallbacks) |
| **Data export** | Yes (CSV/API) | Yes (API) | No | No | Yes | Yes (API) | Deferred to v1.x |
| **Accessibility** | Section 508 | Unknown | Unknown | Unknown | WCAG AA certified | Unknown | WCAG AA target (data table fallbacks, semantic HTML) |
| **Open source** | Yes (GitHub) | Yes (GitHub) | No | Yes (Apache 2) | No (commercial) | Partial | Not yet decided |
| **Embeddable** | No | No | No | Yes (WordPress) | Yes | No | Deferred to v1.x |

### Competitive Position

BudgetExplorer's two genuine differentiators are:

1. **AI-generated plain-English descriptions** -- No competitor does this. Budget data without context is just numbers. Descriptions transform numbers into understanding.
2. **Personalized tax calculator with visual breakdown** -- VisGov has a basic version but no competitor combines property-value input with a proportional visual breakdown across strategic areas. This is the "aha moment" that makes the budget feel personal.

The treemap drill-down is table stakes done well, not a differentiator. The 4-level hierarchy (total -> strategic area -> department -> expenditure category) is deeper than most competitors but uses a standard interaction pattern.

## Sources

- [USASpending.gov Spending Explorer](https://www.usaspending.gov/explorer/budget_function) -- HIGH confidence, direct analysis
- [Open Budget Oakland](https://openbudgetoakland.org/) -- HIGH confidence, direct analysis via WebFetch
- [USAFacts Government Spending](https://usafacts.org/articles/this-chart-tells-you-everything-you-want-to-know-about-government-spending/) -- HIGH confidence, direct analysis via WebFetch
- [VisGov Visual Budget](https://visgov.com/visual-budget/) -- MEDIUM confidence, WebSearch descriptions
- [Questica OpenBook](https://www.questica.com/openbook/) -- MEDIUM confidence, WebSearch descriptions
- [LA Controller Budget Tools](https://budget.lacontroller.app/) -- MEDIUM confidence, WebSearch + WebFetch
- [LA Controller "Your Budget"](https://mylabudget.lacontroller.app/) -- HIGH confidence, direct analysis via WebFetch
- [Boston budget.boston.gov (GitHub)](https://github.com/Jantcu/budget.boston.gov) -- HIGH confidence, direct repository analysis
- [GovTech: Low-Cost Budget Visualization Tool Gains Momentum](https://govtech.com/civic/Low-Cost-Budget-Visualization-Tool-Gains-Momentum.html) -- MEDIUM confidence
- [OECD: AI in civic participation and open government (2025)](https://www.oecd.org/en/publications/2025/06/governing-with-artificial-intelligence_398fa287/full-report/ai-in-civic-participation-and-open-government_51227ce7.html) -- MEDIUM confidence
- [Polco Budget Simulation](https://info.polco.us/platform/simulation-tools/budget-simulation) -- MEDIUM confidence
- [Citizen Budget](https://www.citizenbudget.com/) -- MEDIUM confidence
- [OpenGov Transparency](https://opengov.com/products/reporting-and-transparency/transparency-interactive-stories/) -- MEDIUM confidence

---
*Feature research for: Miami-Dade Budget Explorer*
*Researched: 2026-02-28*
