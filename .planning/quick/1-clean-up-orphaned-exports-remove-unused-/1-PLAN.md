---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - budget-explorer-web/src/components/charts/ChartTooltip.tsx
  - budget-explorer-web/src/lib/chart-utils.ts
  - budget-explorer-web/src/lib/db/queries.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "No orphaned exports remain in chart-utils.ts, queries.ts, or charts/ directory"
    - "All remaining exports are actively imported by at least one consumer"
    - "Application builds without errors after removal"
  artifacts:
    - path: "budget-explorer-web/src/lib/chart-utils.ts"
      provides: "toChartValue and formatPercentage utilities (centsToDollars removed)"
      contains: "toChartValue"
    - path: "budget-explorer-web/src/lib/db/queries.ts"
      provides: "All active query functions (getDepartmentCount removed)"
  key_links: []
---

<objective>
Remove three orphaned exports identified in the v1.1 milestone audit: ChartTooltip component (never imported by any chart), centsToDollars utility (superseded by formatDollarsAbbreviated), and getDepartmentCount query (duplicated by inline prisma.departments.count in getQuickStats).

Purpose: Dead code cleanup to reduce maintenance surface and eliminate confusion about which utilities to use.
Output: Three files modified, one file deleted, zero functional changes.
</objective>

<execution_context>
@/home/d48reu/.claude/get-shit-done/workflows/execute-plan.md
@/home/d48reu/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@budget-explorer-web/src/components/charts/ChartTooltip.tsx
@budget-explorer-web/src/lib/chart-utils.ts
@budget-explorer-web/src/lib/db/queries.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove orphaned exports and delete ChartTooltip</name>
  <files>
    budget-explorer-web/src/components/charts/ChartTooltip.tsx
    budget-explorer-web/src/lib/chart-utils.ts
    budget-explorer-web/src/lib/db/queries.ts
  </files>
  <action>
1. DELETE the entire file `budget-explorer-web/src/components/charts/ChartTooltip.tsx`. This component is exported but never imported anywhere. BudgetTerm.tsx uses @floating-ui/react directly (not through ChartTooltip), so the dependency stays.

2. In `budget-explorer-web/src/lib/chart-utils.ts`, remove the `centsToDollars` function (lines 21-27: the JSDoc comment and the function). Keep `toChartValue` and `formatPercentage` which are actively used.

3. In `budget-explorer-web/src/lib/db/queries.ts`, remove the `getDepartmentCount` function (lines 94-99: the JSDoc comment and function body). The identical operation `prisma.departments.count()` is called inline within `getQuickStats()` on line 108, making this a dead duplicate.

Do NOT modify any other functions or exports. Do NOT remove @floating-ui/react from package.json (BudgetTerm.tsx still uses it).
  </action>
  <verify>
    <automated>cd /home/d48reu/BudgetExplorer/budget-explorer-web && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>ChartTooltip.tsx deleted. centsToDollars removed from chart-utils.ts (toChartValue and formatPercentage remain). getDepartmentCount removed from queries.ts (all other query exports remain). TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `grep -r "ChartTooltip\|centsToDollars\|getDepartmentCount" budget-explorer-web/src/ --include="*.ts" --include="*.tsx"` returns zero matches
- `npm run build` succeeds (if available)
</verification>

<success_criteria>
- ChartTooltip.tsx no longer exists
- chart-utils.ts exports only toChartValue and formatPercentage
- queries.ts no longer exports getDepartmentCount
- Application compiles and builds without errors
</success_criteria>

<output>
After completion, create `.planning/quick/1-clean-up-orphaned-exports-remove-unused-/1-SUMMARY.md`
</output>
