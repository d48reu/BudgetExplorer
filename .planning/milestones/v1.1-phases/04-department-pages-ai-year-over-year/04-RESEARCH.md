# Phase 4: Department Pages + AI + Year-over-Year - Research

**Researched:** 2026-03-01
**Domain:** AI content generation pipeline (Python/Claude API), Next.js static generation, D3 bar charts
**Confidence:** HIGH

## Summary

Phase 4 has three distinct technical domains: (1) a Python batch pipeline that generates plain-English department descriptions via the Anthropic Claude API and seeds them into PostgreSQL, (2) Next.js App Router static generation converting the existing department stub page from `force-dynamic` to `generateStaticParams` for all 35 departments, and (3) two D3 bar chart components (year-over-year vertical bars and expenditure category horizontal bars) following the existing ChartContainer + DataTableToggle pattern.

The codebase is exceptionally well-prepared. The `budget_descriptions` table already exists with `summary`, `detailed_description`, `key_changes`, `generated_at`, and `model_version` columns. The `department_expenditures` table has 9 categories seeded. The `v_department_yoy` SQL view computes prior-year comparison with LAG. The department stub page at `src/app/department/[slug]/page.tsx` already has breadcrumbs and strategic area badge -- it just needs `force-dynamic` replaced with `generateStaticParams` and real content sections. All three chart infrastructure components (ChartContainer, DataTableToggle, ChartTooltip) are battle-tested from Phase 3.

**Primary recommendation:** Build as three independent plans: (1) AI pipeline in Python with human review step before database seeding, (2) department detail page with static generation and all layout sections, (3) two D3 chart components following the established render-prop pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Civic plain-English tone -- write like a county newsletter, no jargon, readable by any resident with no budget background
- Include specific dollar amounts and employee counts to ground descriptions in real data
- Three content tiers in the `budget_descriptions` table:
  - `summary`: 2-3 sentence always-visible overview
  - `detailed_description`: 1-2 paragraphs behind a "Read more" expand/collapse
  - `key_changes`: What changed from prior year, displayed in a colored callout box near top
- All descriptions pre-generated via Python pipeline using Claude API, seeded into database -- never generated at runtime
- Every description displays its fiscal year and generation date (per success criteria)
- **Section order (top to bottom):**
  1. Breadcrumbs + department name + strategic area color badge (already exists in stub)
  2. Stat cards row: Operating Budget, Capital Budget, Employees, YoY Change (reuse Card component)
  3. AI summary (2-3 sentences, always visible) + "Read more" for detailed_description
  4. Key changes callout box (colored banner highlighting what changed this year)
  5. Expenditure category breakdown chart (full-width)
  6. Year-over-year budget history chart (full-width)
  7. "More in [Strategic Area]" section with cards linking to sibling departments
- Charts are full-width stacked (not side-by-side) -- each gets its own section with room for labels
- All pages statically generated at build time (success criteria requirement)
- **YoY Charts:** Single bar per year showing total budget (operating + capital combined). Current FY bar uses strategic area color; prior years neutral gray. Show percentage change badge for current year only. Show only years with data (max 5). Uses D3 via existing ChartContainer + DataTableToggle pattern.
- **Expenditure Breakdown:** Horizontal bar chart ranked by amount (largest at top). Each bar shows dollar amount and percentage. Hide $0 categories; <1% get minimum-width bar. Bars use strategic area color with opacity gradient. Up to 9 categories. Uses D3 via existing ChartContainer + DataTableToggle pattern.

### Claude's Discretion
- Loading skeleton design during page transitions
- Exact spacing and typography within sections
- Error state handling for missing data
- "Read more" expand/collapse animation style
- Callout box color and icon choice for key changes
- Stat card design details (icons, formatting)
- Exact minimum bar width threshold for small expenditure categories

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-04 | Department detail pages with budget overview, AI description, YoY comparison | Next.js `generateStaticParams` pattern verified for v16.1.6; existing stub page has breadcrumbs + area badge ready; Prisma queries provide all budget data; department layout sections defined in CONTEXT.md |
| PAGE-06 | Year-over-year comparison page | D3 `scaleBand` + `scaleLinear` available in d3-scale v4.0.2 (already installed); `v_department_yoy` SQL view provides LAG-computed prior year data; ChartContainer render prop pattern handles responsive sizing |
| VIZ-05 | Year-over-year bar charts comparing current vs. prior 4 fiscal years | D3 vertical bar chart with `scaleBand` for fiscal years, `scaleLinear` for budget amounts; strategic area color for current FY, neutral gray for prior; DataTableToggle for accessibility fallback |
| VIZ-06 | Expenditure category breakdown per department (salary, fringes, etc.) | D3 horizontal bar chart with `scaleBand` for categories, `scaleLinear` for amounts; `department_expenditures` table with 9 categories seeded; opacity gradient using strategic area color |
| AI-01 | Plain-English summary (2-3 sentences) of what each department does | Anthropic Python SDK `messages.create` with system prompt for civic tone; structured output via `messages.parse` with Pydantic for reliable extraction; stored in `budget_descriptions.summary` |
| AI-02 | "Key Changes" summary of what changed in adopted budget vs. prior year | Same pipeline as AI-01; uses YoY data from `v_department_yoy` view as context in prompt; stored in `budget_descriptions.key_changes` |
| AI-03 | Descriptions generated via Claude API and stored in database | Anthropic SDK `messages.batches.create` for cost-effective bulk processing of 35 departments; Python pipeline with JSON intermediate files for human review before DB seeding |
| AI-04 | Each description references its fiscal year and generation date | `budget_descriptions.generated_at` (TIMESTAMPTZ DEFAULT NOW()) and `budget_descriptions.fiscal_year_id` (FK to fiscal_years) already in schema; display fiscal year label + formatted generation date in UI |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | Static generation via `generateStaticParams` | Already installed; App Router is the standard for statically generated dynamic routes |
| d3-scale | 4.0.2 | `scaleBand` for category axes, `scaleLinear` for value axes | Already installed; used throughout Phase 3 charts |
| d3-shape | 3.2.0 | Not directly needed for bar charts (used for arcs/pies) but available | Already installed |
| Anthropic Python SDK | latest | `messages.create` for AI description generation | Official SDK for Claude API; supports structured output via Pydantic |
| Prisma | 7.4.2 | ORM for database queries (department data, expenditures, budgets) | Already installed and configured; existing query patterns in `src/lib/db/queries.ts` |
| psycopg2-binary | 2.9.11 | Direct PostgreSQL access for Python pipeline seeding | Already in requirements.txt; used by existing pipeline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic | latest | Structured output validation for AI-generated descriptions | Use with `messages.parse()` to ensure Claude returns the 3 required fields (summary, detailed_description, key_changes) |
| python-dotenv | 1.2.1 | Load ANTHROPIC_API_KEY from .env | Already in requirements.txt; used by pipeline config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| D3 for bar charts | Recharts (already in deps) | Recharts is simpler but user locked decision to "D3 via existing ChartContainer + DataTableToggle pattern" for consistency with Phase 3 charts; Recharts can still be removed later or kept for potential future use |
| Batch API for 35 descriptions | Sequential `messages.create` calls | Batch API is 50% cheaper but asynchronous (may take hours). For 35 requests, sequential is fine (~2 min total, ~$0.50 with Sonnet). Use Batch API only if cost is a concern. |
| `d3-axis` for axis rendering | Manual SVG text labels in JSX | Project pattern is D3-for-math, JSX-for-rendering. Manual labels are more React-idiomatic and consistent with DonutChart/WaffleChart patterns. |

**Installation:**
```bash
# Python pipeline additions
pip install anthropic pydantic

# No new JS dependencies needed -- d3-scale, d3-shape already installed
```

## Architecture Patterns

### Recommended Project Structure
```
pipeline/
├── generate/
│   └── descriptions.py     # AI description generation script
├── data/
│   └── descriptions/
│       └── fy_2025_26_descriptions.json  # Generated output for human review
├── load/
│   └── seed_descriptions.py  # Seeds reviewed descriptions into DB

budget-explorer-web/
├── src/
│   ├── app/department/[slug]/
│   │   └── page.tsx          # Static generation + full layout
│   ├── components/
│   │   ├── charts/
│   │   │   ├── YearOverYearChart.tsx     # Vertical bar chart (D3)
│   │   │   └── ExpenditureBreakdown.tsx  # Horizontal bar chart (D3)
│   │   └── department/
│   │       ├── StatCards.tsx             # Budget stat cards row
│   │       ├── AiDescription.tsx         # Summary + "Read more" expand
│   │       ├── KeyChangesCallout.tsx     # Colored callout box
│   │       └── RelatedDepartments.tsx    # "More in [Area]" section
│   ├── lib/db/
│   │   └── queries.ts       # Add getDepartmentDetail, getDepartmentYoY, getDepartmentExpenditures
│   └── types/
│       └── budget.ts         # Add SerializedBudgetDescription, SerializedExpenditure, SerializedYoYData
```

### Pattern 1: D3-for-Math, JSX-for-Rendering (Established)
**What:** Use D3 scale functions to compute positions and sizes, but render all SVG elements as JSX (not `d3.select().append()`).
**When to use:** All chart components in this project.
**Example:**
```tsx
// Source: Existing DonutChart.tsx pattern adapted for bar charts
'use client'
import { useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { toChartValue, centsToDollars } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'

type YoYBarProps = {
  data: { fiscalYear: string; totalBudget: string; isCurrent: boolean }[]
  areaColor: string
  width: number
  height: number
}

export function YearOverYearChart({ data, areaColor, width, height }: YoYBarProps) {
  const margin = { top: 20, right: 20, bottom: 40, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const { xScale, yScale } = useMemo(() => {
    const x = scaleBand()
      .domain(data.map(d => d.fiscalYear))
      .range([0, innerWidth])
      .padding(0.3)
    const y = scaleLinear()
      .domain([0, Math.max(...data.map(d => toChartValue(d.totalBudget)))])
      .nice()
      .range([innerHeight, 0])
    return { xScale: x, yScale: y }
  }, [data, innerWidth, innerHeight])

  return (
    <svg width={width} height={height} role="img" aria-label="Year-over-year budget chart">
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {data.map(d => (
          <rect
            key={d.fiscalYear}
            x={xScale(d.fiscalYear)}
            y={yScale(toChartValue(d.totalBudget))}
            width={xScale.bandwidth()}
            height={innerHeight - yScale(toChartValue(d.totalBudget))}
            fill={d.isCurrent ? areaColor : '#D1D5DB'}
            rx={2}
          />
        ))}
        {/* X-axis labels */}
        {data.map(d => (
          <text
            key={`label-${d.fiscalYear}`}
            x={(xScale(d.fiscalYear) ?? 0) + xScale.bandwidth() / 2}
            y={innerHeight + 20}
            textAnchor="middle"
            className="fill-text-secondary text-xs"
          >
            {d.fiscalYear}
          </text>
        ))}
      </g>
    </svg>
  )
}
```

### Pattern 2: Next.js Static Generation for Dynamic Routes
**What:** Replace `force-dynamic` with `generateStaticParams` to pre-render all 35 department pages at build time.
**When to use:** The department `[slug]` page.
**Example:**
```tsx
// Source: Context7 Next.js v16.1.6 docs
import prisma from '@/lib/prisma'

// Remove: export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  const departments = await prisma.departments.findMany({
    select: { slug: true },
  })
  return departments.map((dept) => ({ slug: dept.slug }))
}

// params is a Promise in Next.js 16
export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // ... fetch and render
}
```

### Pattern 3: AI Pipeline with Human Review Gate
**What:** Generate descriptions to JSON files, allow human review/editing, then seed to database as a separate step.
**When to use:** The AI description generation pipeline.
**Example:**
```python
# Source: Anthropic Python SDK docs
from anthropic import Anthropic
import pydantic
import json

class DepartmentDescription(pydantic.BaseModel):
    summary: str          # 2-3 sentences
    detailed_description: str  # 1-2 paragraphs
    key_changes: str      # What changed from prior year

client = Anthropic()

def generate_description(dept_name: str, budget_data: dict) -> DepartmentDescription:
    parsed = client.messages.parse(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        output_format=DepartmentDescription,
        system="You are a civic communications writer for Miami-Dade County...",
        messages=[{
            "role": "user",
            "content": f"Write a plain-English description for {dept_name}..."
        }]
    )
    return parsed.parsed_output

# Generate all, save to JSON for review
descriptions = {}
for dept in departments:
    desc = generate_description(dept["name"], dept["budget"])
    descriptions[dept["slug"]] = desc.model_dump()

with open("pipeline/data/descriptions/fy_2025_26_descriptions.json", "w") as f:
    json.dump(descriptions, f, indent=2)
# Human reviews JSON, then runs: python -m pipeline seed-descriptions
```

### Pattern 4: Horizontal Bar Chart (Expenditure Breakdown)
**What:** Use `scaleBand` on the Y-axis (category names) and `scaleLinear` on the X-axis (dollar amounts) for a horizontal bar chart ranked by amount.
**When to use:** The expenditure category breakdown component.
**Example:**
```tsx
const yScale = scaleBand()
  .domain(sortedData.map(d => d.categoryName))
  .range([0, innerHeight])
  .padding(0.25)

const xScale = scaleLinear()
  .domain([0, Math.max(...sortedData.map(d => toChartValue(d.amount)))])
  .nice()
  .range([0, innerWidth])

// Opacity gradient: largest bar = full opacity, smaller = lighter
const maxAmount = Math.max(...sortedData.map(d => toChartValue(d.amount)))

{sortedData.map((d, i) => {
  const opacity = 0.4 + 0.6 * (toChartValue(d.amount) / maxAmount)
  const barWidth = Math.max(xScale(toChartValue(d.amount)), 4) // min-width for <1%
  return (
    <rect
      key={d.categoryName}
      x={0}
      y={yScale(d.categoryName)}
      width={barWidth}
      height={yScale.bandwidth()}
      fill={areaColor}
      opacity={opacity}
      rx={2}
    />
  )
})}
```

### Anti-Patterns to Avoid
- **Runtime AI generation:** Never call Claude API from Next.js server components or API routes. All descriptions are pre-seeded.
- **`d3.select().append()` in React:** Do not use D3's DOM manipulation. Use D3 for math, JSX for rendering. This is the established project pattern.
- **Storing dollars as floats:** All monetary values are BigInt cents in the database, serialized as strings, and converted via `toChartValue()` only at chart render time.
- **Using `force-dynamic` on department pages:** The stub currently uses `force-dynamic` -- this must be replaced with `generateStaticParams` for static generation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI description structure validation | Manual string parsing of Claude output | Anthropic SDK `messages.parse()` with Pydantic models | Guarantees structured output (summary, detailed_description, key_changes) without brittle regex parsing |
| Responsive chart sizing | Manual window resize listeners | ChartContainer (already built) with render prop | Handles ResizeObserver, loading state, debouncing |
| Accessible chart fallback | Custom screen reader handling | DataTableToggle (already built) with sr-only table | Always renders screen-reader table alongside chart |
| BigInt serialization | Custom number formatting | `toChartValue()` / `centsToDollars()` / `formatDollarsAbbreviated()` (already built) | Handles cents-to-dollars conversion safely within JS Number range |
| Fiscal year YoY computation | Application-level LAG calculation | `v_department_yoy` SQL view (already built) | Database-level LAG window function is more efficient and correct |
| Department name resolution across fiscal years | Hardcoded mapping tables | `department_aliases` table + `resolve_department()` (already built) | Handles renamed departments across historical fiscal years |

**Key insight:** The codebase has excellent infrastructure -- the database schema, SQL views, chart components, formatting utilities, and historical data pipeline are all already in place. Phase 4 is primarily about composing existing pieces together with two new chart components and the AI pipeline.

## Common Pitfalls

### Pitfall 1: BigInt Serialization in Server Components
**What goes wrong:** Prisma returns BigInt values that cannot be serialized to JSON. Next.js Server Components pass data to Client Components as serialized props.
**Why it happens:** JavaScript BigInt is not JSON-serializable. Passing raw Prisma results to client components throws "BigInt value can't be serialized."
**How to avoid:** Always convert BigInt to string in the data access layer (queries.ts) before passing to components. The project already does this pattern -- follow it for all new queries (department detail, expenditures, YoY data).
**Warning signs:** Build-time errors mentioning "BigInt" or "serialization."

### Pitfall 2: Missing `generateStaticParams` Causes Dynamic Rendering
**What goes wrong:** Without `generateStaticParams`, the department page renders dynamically at request time, defeating the static generation requirement.
**Why it happens:** Next.js defaults dynamic routes to dynamic rendering. The existing stub uses `export const dynamic = 'force-dynamic'` which must be removed.
**How to avoid:** Export `generateStaticParams` that returns all 35 department slugs. Remove `force-dynamic`. Verify with `next build` output showing "Static" for department routes.
**Warning signs:** Build output shows "(Dynamic)" next to `/department/[slug]` routes.

### Pitfall 3: AI Descriptions That Sound Like Corporate Jargon
**What goes wrong:** Claude defaults to formal, corporate language ("The department leverages synergies to optimize resource allocation...").
**Why it happens:** The system prompt doesn't explicitly ban jargon or provide the right tone examples.
**How to avoid:** System prompt must: (1) specify "county newsletter" tone, (2) ban specific jargon words, (3) require specific dollar amounts and employee counts, (4) provide 1-2 examples of good output. Include a few-shot example in the prompt.
**Warning signs:** Descriptions that a non-budget-savvy resident wouldn't understand.

### Pitfall 4: Zero-Amount Expenditure Categories Showing in Chart
**What goes wrong:** Departments that don't have all 9 expenditure categories show empty/zero bars cluttering the chart.
**Why it happens:** Not all 35 departments use all 9 categories (e.g., not every department has Court Costs or Capital).
**How to avoid:** Filter out categories with $0 amount before passing to chart component. The CONTEXT.md explicitly states "Hide categories with $0 budget."
**Warning signs:** Charts showing many tiny or empty bars for small departments.

### Pitfall 5: Batch API Timeout vs Sequential Approach
**What goes wrong:** Using the Batch API for 35 descriptions results in waiting hours for processing, blocking the pipeline workflow.
**Why it happens:** The Batch API is asynchronous and designed for large-scale processing (100K+ requests). For 35 requests, sequential is faster.
**How to avoid:** Use sequential `messages.create` or `messages.parse` calls with a small delay between them. 35 requests at ~3 seconds each = ~2 minutes. Use Batch API only if running this at scale or needing the 50% cost discount.
**Warning signs:** Pipeline script runs for hours instead of minutes.

### Pitfall 6: `params` Not Awaited in Next.js 16
**What goes wrong:** TypeScript error or runtime error accessing `params.slug` directly.
**Why it happens:** In Next.js 16 with App Router, `params` is a `Promise` that must be awaited. The existing stub already does this correctly (`const { slug } = await params`).
**How to avoid:** Always `await params` before destructuring. The type is `params: Promise<{ slug: string }>`.
**Warning signs:** Type error: "Property 'slug' does not exist on type 'Promise<{ slug: string }>'."

## Code Examples

### Query: Get Department Detail with Budget + Description + Area
```typescript
// Source: Adapted from existing getAreaWithDepartments pattern
export async function getDepartmentDetail(slug: string): Promise<DepartmentDetail | null> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })
  if (!fy) return null

  const dept = await prisma.departments.findFirst({
    where: { slug },
    include: {
      strategic_areas: true,
      department_budgets: {
        where: { fiscal_year_id: fy.id },
      },
    },
  })
  if (!dept) return null

  const description = await prisma.budget_descriptions.findFirst({
    where: {
      fiscal_year_id: fy.id,
      entity_type: 'department',
      entity_id: dept.id,
    },
  })

  const budget = dept.department_budgets[0]
  return {
    id: dept.id,
    name: dept.name,
    slug: dept.slug,
    area: {
      name: dept.strategic_areas.name,
      slug: dept.strategic_areas.slug,
      color: dept.strategic_areas.color,
    },
    operatingBudget: budget?.operating_budget?.toString() ?? '0',
    capitalBudget: budget?.capital_budget?.toString() ?? '0',
    totalBudget: budget?.total_budget?.toString() ?? '0',
    employeeCount: budget?.employee_count ?? null,
    description: description ? {
      summary: description.summary,
      detailedDescription: description.detailed_description,
      keyChanges: description.key_changes,
      generatedAt: description.generated_at?.toISOString() ?? null,
      fiscalYear: fy.label,
      modelVersion: description.model_version,
    } : null,
  }
}
```

### Query: Get Department Expenditures
```typescript
export async function getDepartmentExpenditures(deptId: number): Promise<SerializedExpenditure[]> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })
  if (!fy) return []

  const expenditures = await prisma.department_expenditures.findMany({
    where: {
      fiscal_year_id: fy.id,
      department_id: deptId,
    },
    include: { expenditure_categories: true },
    orderBy: { amount: 'desc' },
  })

  const total = expenditures.reduce((sum, e) => sum + Number(e.amount), 0)

  return expenditures
    .filter(e => Number(e.amount) > 0)  // Hide $0 categories
    .map(e => ({
      categoryName: e.expenditure_categories.name,
      amount: e.amount.toString(),
      percentage: total > 0 ? (Number(e.amount) / total) * 100 : 0,
    }))
}
```

### Query: Get Department YoY History
```typescript
export async function getDepartmentYoY(deptId: number): Promise<SerializedYoYData[]> {
  const budgets = await prisma.department_budgets.findMany({
    where: {
      department_id: deptId,
      is_actual: false,
    },
    include: { fiscal_years: true },
    orderBy: { fiscal_years: { start_date: 'asc' } },
    take: 5,  // Max 5 fiscal years
  })

  // Find the most recent fiscal year to mark as "current"
  const currentFyLabel = 'FY 2025-26'

  return budgets.map(b => ({
    fiscalYear: b.fiscal_years.label,
    totalBudget: b.total_budget?.toString() ?? '0',
    operatingBudget: b.operating_budget?.toString() ?? '0',
    capitalBudget: b.capital_budget?.toString() ?? '0',
    isCurrent: b.fiscal_years.label === currentFyLabel,
  }))
}
```

### AI Pipeline: System Prompt Pattern
```python
SYSTEM_PROMPT = """You are a civic communications writer for Miami-Dade County.
Write in plain English that any resident can understand -- no jargon, no acronyms,
no budget-speak. Think "county newsletter" tone.

Rules:
- Use specific dollar amounts (e.g., "$1.2 billion") and employee counts
- Never use words like: leverage, synergy, optimize, stakeholder, utilize
- Write as if explaining to a neighbor who has never seen a budget document
- Be factual and neutral -- no political commentary or value judgments
- Reference the fiscal year in descriptions (e.g., "In FY 2025-26...")
"""
```

### Expand/Collapse Component Pattern
```tsx
'use client'
import { useState } from 'react'

type AiDescriptionProps = {
  summary: string
  detailedDescription: string | null
  fiscalYear: string
  generatedAt: string | null
}

export function AiDescription({ summary, detailedDescription, fiscalYear, generatedAt }: AiDescriptionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <p className="text-text-primary leading-relaxed">{summary}</p>
      {detailedDescription && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-mdc-blue hover:underline"
            aria-expanded={expanded}
          >
            {expanded ? 'Read less' : 'Read more'}
          </button>
          {expanded && (
            <div className="mt-3 text-text-primary leading-relaxed">
              {detailedDescription}
            </div>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-text-tertiary">
        Based on {fiscalYear} adopted budget.
        {generatedAt && ` Generated ${new Date(generatedAt).toLocaleDateString()}.`}
      </p>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getStaticProps` / `getStaticPaths` (Pages Router) | `generateStaticParams` (App Router) | Next.js 13+ (2023) | Must use App Router pattern since project is on Next.js 16 App Router |
| `params: { slug: string }` (sync) | `params: Promise<{ slug: string }>` (async) | Next.js 15+ (2024) | Params must be awaited -- existing stub already does this correctly |
| Anthropic SDK `completion()` | `messages.create()` / `messages.parse()` | SDK v0.20+ (2024) | Use Messages API exclusively; Completion API is deprecated |
| Manual JSON extraction from Claude | `messages.parse()` with Pydantic | SDK 2025 | Structured output ensures reliable field extraction without regex |

**Deprecated/outdated:**
- `getStaticProps`/`getStaticPaths` -- Pages Router only, not available in App Router
- Anthropic `completions.create()` -- deprecated, use `messages.create()` or `messages.parse()`
- `force-static` export -- while valid, `generateStaticParams` is preferred for dynamic routes because it explicitly enumerates paths

## Open Questions

1. **Anthropic API key for pipeline**
   - What we know: The Python pipeline uses `python-dotenv` and `.env` files. The `ANTHROPIC_API_KEY` needs to be available in the pipeline environment.
   - What's unclear: Whether the developer already has an Anthropic API key provisioned for this project.
   - Recommendation: Add `ANTHROPIC_API_KEY` to `.env` with instructions. Use `claude-sonnet-4-5-20250929` for cost-effective generation (~$0.50 for all 35 departments).

2. **Historical data completeness for YoY**
   - What we know: `seed_historical.py` can seed prior fiscal year data. `department_budgets` supports multi-year via `fiscal_year_id`.
   - What's unclear: How many prior fiscal years are actually seeded in the database. The YoY chart shows "only years with data" (max 5).
   - Recommendation: The chart handles sparse data gracefully (show note "Data available from FY YYYY-YY"). Verify data availability at build time and degrade gracefully.

3. **Human review workflow for AI descriptions**
   - What we know: Descriptions should be generated to JSON, reviewed, then seeded. The pipeline already has a pattern (historical CSVs reviewed before seeding).
   - What's unclear: The exact review workflow (CLI tool? Edit JSON directly? Web interface?).
   - Recommendation: Keep it simple -- generate to JSON file, developer reviews/edits in text editor, then runs seed command. No web interface needed for 35 descriptions.

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js/v16.1.6` -- `generateStaticParams` API, static generation patterns, `params` as Promise
- Context7 `/anthropics/anthropic-sdk-python` -- `messages.create`, `messages.parse` with Pydantic, batch API, system prompts
- Context7 `/websites/d3js` -- `scaleBand`, `scaleLinear`, band padding configuration
- Context7 `/recharts/recharts/v3.3.0` -- BarChart with Cell for conditional coloring (reference, not primary approach)
- Project codebase: `budget-explorer-schema.sql`, `prisma/schema.prisma`, existing chart components, `queries.ts`

### Secondary (MEDIUM confidence)
- D3 v4 `scaleBand` verified installed via `node_modules/d3-scale/package.json` (v4.0.2)
- Anthropic Batch API pricing (50% discount) from SDK documentation

### Tertiary (LOW confidence)
- None -- all findings verified via primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are already installed and version-verified; Anthropic SDK patterns verified via Context7
- Architecture: HIGH -- follows established project patterns (D3-for-math, JSX-for-render, ChartContainer render prop, BigInt-as-string serialization); `generateStaticParams` verified for Next.js 16
- Pitfalls: HIGH -- all pitfalls derived from actual codebase analysis (existing `force-dynamic`, BigInt handling, expenditure zero filtering) and verified patterns

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable -- libraries are pinned, patterns are established)
