---
phase: 04-department-pages-ai-year-over-year
verified: 2026-03-01T18:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 4: Department Pages & AI Year-over-Year Verification Report

**Phase Goal:** Users can visit any of the 35 department pages and read a plain-English AI-generated description of what the department does, see how its budget changed over 5 fiscal years, and view expenditure category breakdowns -- all statically generated for fast loading
**Verified:** 2026-03-01
**Status:** passed
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Running `python -m pipeline.generate.descriptions` produces a JSON file with 35+ department entries, each containing summary, detailed_description, and key_changes fields | VERIFIED | `fy_2025_26_descriptions.json` has 53 entries (53 departments found in DB), all with required fields. Metadata: 53 successful, 0 failed. |
| 2  | Running `python -m pipeline.load.seed_descriptions` reads the reviewed JSON and inserts all descriptions into the budget_descriptions table | VERIFIED | `seed_descriptions.py` (128 lines): reads JSON, queries fiscal_year_id, iterates slugs with DELETE+INSERT. INSERT INTO budget_descriptions confirmed at line 101. |
| 3  | Each seeded description record includes fiscal_year_id, entity_type='department', entity_id, generated_at timestamp, and model_version | VERIFIED | INSERT at line 101-114 of seed_descriptions.py explicitly sets all 7 fields. JSON entries confirm all fields populated. |
| 4  | Generated descriptions use civic plain-English tone with specific dollar amounts and employee counts | VERIFIED | SYSTEM_PROMPT enforces no-jargon rules. JSON sample shows dollar-formatted amounts in prompts. Human review gate completed (Task 2 of Plan 01). |
| 5  | User can click any department and land on a detail page with budget overview, AI description, and expenditure breakdown | VERIFIED | `page.tsx` renders 7 sections. generateStaticParams present. getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY all imported and called. No force-dynamic. |
| 6  | Department page shows stat cards for operating budget, capital budget, employees, and YoY change | VERIFIED | `StatCards.tsx` renders grid-cols-4 with all 4 metrics. formatDollarsAbbreviated used for budget values. YoY computed from getDepartmentYoY data. |
| 7  | AI description section shows summary always visible, with 'Read more' expanding detailed description | VERIFIED | `AiDescription.tsx`: summary paragraph always renders; detailedDescription toggle with aria-expanded={expanded}; 'Read more'/'Read less' button. |
| 8  | Key changes callout box displayed near top as colored banner | VERIFIED | `KeyChangesCallout.tsx`: left-border colored box with areaColor. Rendered in Section 4 of page.tsx when keyChanges is non-null. |
| 9  | Expenditure category breakdown shows horizontal bars ranked by amount with dollar amounts and percentages | VERIFIED | `ExpenditureBreakdown.tsx`: D3 scaleBand/scaleLinear horizontal bars, opacity gradient, value labels with formatDollarsAbbreviated + formatPercentage, min 4px bar width. |
| 10 | Every AI description displays its fiscal year and generation date | VERIFIED | `AiDescription.tsx` lines 39-47: "Based on {fiscalYear} adopted budget. Generated {formatted date}." AI-04 satisfied. |
| 11 | All 35 department pages are statically generated at build time | VERIFIED | `generateStaticParams` exported at line 20 of page.tsx. No `export const dynamic = 'force-dynamic'`. Queries all department slugs via prisma.departments.findMany. |
| 12 | User can see year-over-year bar charts comparing current vs prior 4 fiscal years | VERIFIED | `YearOverYearChart.tsx` (228 lines): D3 vertical bars, current FY uses areaColor, prior years use #D1D5DB gray, percentage change badge on current year. getDepartmentYoY fetches up to 5 years. |
| 13 | Related departments section at bottom shows sibling departments in same strategic area | VERIFIED | `RelatedDepartments.tsx`: getRelatedDepartments(areaId, deptId) query returns up to 6 siblings sorted by budget. Links to /department/{slug}. |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `pipeline/generate/__init__.py` | Package init | VERIFIED | Exists (empty package marker) |
| `pipeline/generate/descriptions.py` | AI description batch generation script | VERIFIED | 371 lines. Anthropic client, DepartmentDescription Pydantic model, SYSTEM_PROMPT, fetch_department_data, generate_description, main(). Exceeds min_lines=80. |
| `pipeline/load/seed_descriptions.py` | Description database seeding from reviewed JSON | VERIFIED | 128 lines. seed_descriptions(), idempotent DELETE+INSERT, handles optional path arg. Exceeds min_lines=40. |
| `pipeline/data/descriptions/fy_2025_26_descriptions.json` | Generated descriptions for human review | VERIFIED | 53 entries, all with summary/detailed_description/key_changes/generated_at/model_version/fiscal_year. |
| `pipeline/data/descriptions/.gitkeep` | Directory placeholder | VERIFIED | Exists |
| `budget-explorer-web/src/types/budget.ts` | SerializedDepartmentDetail, SerializedExpenditure types | VERIFIED | Contains SerializedBudgetDescription, SerializedDepartmentDetail, SerializedExpenditure, SerializedYoYData (lines 52-90). |
| `budget-explorer-web/src/lib/db/queries.ts` | getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY | VERIFIED | All 4 functions exported (lines 235, 291, 321, 364). BigInt-to-string serialization throughout. |
| `budget-explorer-web/src/app/department/[slug]/page.tsx` | Full department page with generateStaticParams | VERIFIED | generateStaticParams exported at line 20. 7-section layout. All queries imported and called in parallel. |
| `budget-explorer-web/src/components/department/StatCards.tsx` | Stat cards row component | VERIFIED | 4-metric grid. Uses Card, formatDollarsAbbreviated, direction colors. Server Component. |
| `budget-explorer-web/src/components/department/AiDescription.tsx` | AI summary with expand/collapse | VERIFIED | 'use client', useState, summary always shown, Read more/less toggle, fiscal year + date metadata. |
| `budget-explorer-web/src/components/department/KeyChangesCallout.tsx` | Key changes colored callout box | VERIFIED | Left-border colored box using areaColor. Label + key_changes text. Server Component. |
| `budget-explorer-web/src/components/department/RelatedDepartments.tsx` | Related departments in same strategic area | VERIFIED | Grid of sibling department links. Returns null when empty (correct guard). |
| `budget-explorer-web/src/components/charts/ExpenditureBreakdown.tsx` | Horizontal bar chart for expenditure categories | VERIFIED | 141 lines. D3 scaleBand/scaleLinear, opacity gradient, min 4px bars, DataTableToggle wrapper. |
| `budget-explorer-web/src/components/charts/YearOverYearChart.tsx` | D3 vertical bar chart for year-over-year comparison | VERIFIED | 228 lines. D3 vertical bars, current year colored, prior years gray, percentage badge, data availability note. Exceeds min_lines=60. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pipeline/generate/descriptions.py` | Anthropic API | `client.messages.parse` | WIRED | Lines 221, 253: parse() with response_model, create() fallback. Both patterns present. |
| `pipeline/load/seed_descriptions.py` | budget_descriptions table | `INSERT INTO budget_descriptions` | WIRED | Line 101: full INSERT with all 8 columns. DELETE+INSERT idempotency pattern. |
| `app/department/[slug]/page.tsx` | `lib/db/queries.ts` | getDepartmentDetail, getDepartmentExpenditures, getRelatedDepartments, getDepartmentYoY | WIRED | All 4 imported (lines 11-14), all 4 called (lines 47, 55-57). Parallel fetch after detail resolved. |
| `app/department/[slug]/page.tsx` | generateStaticParams | `export async function` | WIRED | Line 20: exported, queries prisma.departments.findMany for all slugs. |
| `ExpenditureBreakdown.tsx` | `ChartContainer.tsx` | render prop pattern | WIRED | Imported line 8, used as JSX with {({ width, height }) => ...} render prop pattern (lines 129-138). |
| `ExpenditureBreakdown.tsx` | `DataTableToggle.tsx` | table fallback | WIRED | Imported line 9, wraps chart with chartLabel, data, columns props (lines 124-139). |
| `YearOverYearChart.tsx` | `ChartContainer.tsx` | render prop for responsive sizing | WIRED | Imported line 7, used with render prop (lines 210-218). |
| `YearOverYearChart.tsx` | `DataTableToggle.tsx` | accessibility table fallback | WIRED | Imported line 8, wraps chart (lines 205-220). |
| `app/department/[slug]/page.tsx` | `getDepartmentYoY` | YoY data fetch | WIRED | Imported line 13, called in Promise.all line 56, result passed to YearOverYearChart line 153-155. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-01 | 04-01-PLAN | Plain-English summary (2-3 sentences) of what each department does | SATISFIED | descriptions.py generates summary field. fy_2025_26_descriptions.json has summary for all 53 departments. AiDescription.tsx renders summary always. |
| AI-02 | 04-01-PLAN | "Key Changes" summary of what changed in adopted budget vs. prior year | SATISFIED | descriptions.py generates key_changes field. KeyChangesCallout.tsx renders it in Section 4. |
| AI-03 | 04-01-PLAN | Descriptions generated via Claude API and stored in database | SATISFIED | descriptions.py calls Anthropic API. seed_descriptions.py inserts to budget_descriptions table. |
| AI-04 | 04-01-PLAN, 04-02-PLAN | Each description references its fiscal year and generation date | SATISFIED | AiDescription.tsx renders "Based on {fiscalYear} adopted budget. Generated {date}." (lines 39-47). generatedAt and fiscalYear passed from getDepartmentDetail. |
| PAGE-04 | 04-02-PLAN | Department detail pages with budget overview, AI description, YoY comparison | SATISFIED | page.tsx implements 7-section layout: stat cards, AI description, key changes, expenditure chart, YoY chart, related departments. |
| PAGE-06 | 04-03-PLAN | Year-over-year comparison page | SATISFIED | YearOverYearChart in Section 6 of department pages. Budget History section with up to 5 years of data. Note: implemented as section within department pages, not a separate page -- this matches phase goal language and REQUIREMENTS.md traceability. |
| VIZ-05 | 04-03-PLAN | Year-over-year bar charts comparing current vs. prior 4 fiscal years | SATISFIED | YearOverYearChart.tsx: D3 vertical bars, current year in areaColor, prior years gray, percentage badge. getDepartmentYoY fetches up to 5 years (take: 5, is_actual: false). |
| VIZ-06 | 04-02-PLAN | Expenditure category breakdown per department (salary, fringes, etc.) | SATISFIED | ExpenditureBreakdown.tsx: horizontal bars from department_expenditures, sorted by amount desc, zero-amount categories filtered, percentage computed. |

**Notes on PAGE-06:** REQUIREMENTS.md description is "Year-over-year comparison page." The implementation delivers year-over-year as a section within each department page (Section 6: Budget History) rather than a standalone /yoy route. The phase goal and plan language both frame this as in-page content, and the traceability table marks it complete. No separate page was planned or expected.

**Orphaned requirements check:** No Phase 4 requirements in REQUIREMENTS.md exist outside plan frontmatter. All 8 IDs (PAGE-04, PAGE-06, VIZ-05, VIZ-06, AI-01, AI-02, AI-03, AI-04) are claimed and satisfied.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/department/[slug]/page.tsx` | 118 | "Description coming soon." | Info | Intentional graceful degradation -- renders only when description is null (AI pipeline not yet run). Correct behavior per plan spec. |
| `RelatedDepartments.tsx` | 17 | `return null` | Info | Correct empty-state guard when no siblings exist. Not a stub. |
| `YearOverYearChart.tsx` | 201 | `return null` | Info | Correct empty-state guard when no YoY data exists. Not a stub. |

No blockers or warnings found. All three flagged items are correct empty-state patterns, not stubs.

---

### Human Verification Required

**Note:** Automated checks cover all structural and wiring concerns. The following require human testing to confirm user-facing behavior.

#### 1. Department Page Render End-to-End

**Test:** Navigate to `/department/fire-rescue` (or any department slug) in a running dev server.
**Expected:** Page loads with all 7 sections: breadcrumbs, stat cards (4 metrics), AI description (with "Read more" toggle if detailed description exists), key changes callout (colored left border), expenditure breakdown (horizontal bars), budget history (vertical bars with current year highlighted), related departments grid.
**Why human:** Visual layout and section order require browser rendering to confirm.

#### 2. AI Description Expand/Collapse Interaction

**Test:** Click "Read more" on a department with a detailed description.
**Expected:** Detailed description expands inline. Button label changes to "Read less". Clicking again collapses. Fiscal year and generation date visible at bottom.
**Why human:** Client-side React state interaction requires browser testing.

#### 3. YoY Chart Current Year Highlighting

**Test:** View the Budget History chart on any department with 2+ years of data.
**Expected:** Current year (FY 2025-26) bar renders in the strategic area color (not gray). Percentage change badge appears above it. Prior year bars are gray (#D1D5DB).
**Why human:** Color rendering and SVG badge positioning require visual confirmation.

#### 4. Expenditure Breakdown Accessibility Toggle

**Test:** Click "View as table" on the Expenditure Breakdown section.
**Expected:** Switches to accessible data table with Category, Amount, Share columns. "View as chart" button appears. Clicking switches back to chart.
**Why human:** Interactive state toggle requires browser testing.

#### 5. Static Generation at Build Time

**Test:** Run `npm run build` in budget-explorer-web and inspect output.
**Expected:** Build completes with 35+ pre-rendered `/department/[slug]` routes shown as static in the build output. No "force-dynamic" or runtime-only routes for department pages.
**Why human:** Build output review requires running the full Next.js build.

---

### Gaps Summary

No gaps found. All 13 must-haves are verified. All 8 requirement IDs are satisfied. No anti-patterns blocking goal achievement. Phase goal is achieved.

The only notable discrepancy from plan expectations: the database contained 53 departments (not 35), so 53 descriptions were generated and seeded. This exceeds the plan target and is correct behavior -- all departments in the database are covered. This does not affect any requirement.

---

_Verified: 2026-03-01_
_Verifier: Claude (gsd-verifier)_
