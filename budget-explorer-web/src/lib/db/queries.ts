import { cache } from 'react'
import prisma from '@/lib/prisma'
import type {
  SerializedFiscalYear,
  SerializedStrategicArea,
  SerializedMillageRate,
  SerializedDepartment,
  SerializedDepartmentDetail,
  SerializedExpenditure,
  SerializedYoYData,
  SerializedRevenueSource,
  QuickStats,
  ProposedBudgetOverview,
  SerializedBudgetRelease,
  SerializedDepartmentChange,
} from '@/types/budget'

const CURRENT_FY_LABEL = 'FY 2025-26'
const PROPOSED_FY_LABEL = 'FY 2026-27'

/**
 * The current fiscal_years row, deduped per request with React cache() so
 * the query functions share one lookup instead of each issuing their own.
 */
const getCurrentFiscalYearRow = cache(async () => {
  return prisma.fiscal_years.findFirst({
    where: { label: CURRENT_FY_LABEL },
  })
})

/**
 * A department can have several department_budgets rows per fiscal year:
 * one per strategic area it operates in, plus capital-only rows from
 * Appendix J. Any query that shows "the department's budget" must sum
 * these slices — taking a single row shows an arbitrary partial amount.
 */
type BudgetRowAmounts = {
  operating_budget: bigint | null
  capital_budget: bigint | null
  total_budget: bigint | null
  employee_count: number | null
}

function sumBudgetRows(rows: BudgetRowAmounts[]) {
  let operating = BigInt(0)
  let capital = BigInt(0)
  let total = BigInt(0)
  let employees: number | null = null
  for (const row of rows) {
    operating += row.operating_budget ?? BigInt(0)
    capital += row.capital_budget ?? BigInt(0)
    total += row.total_budget ?? BigInt(0)
    if (row.employee_count != null) {
      employees = (employees ?? 0) + row.employee_count
    }
  }
  return { operating, capital, total, employees }
}

/**
 * A budget row belongs to a strategic area via its own strategic_area_id,
 * falling back to the department's home area when the row has none.
 * This matches the pipeline's verification model (checker.py / migration 003).
 */
function areaMembershipFilter(areaId: number) {
  return [
    { strategic_area_id: areaId },
    { strategic_area_id: null, departments: { strategic_area_id: areaId } },
  ]
}

/**
 * Get the current fiscal year (FY 2025-26) with all BigInt fields
 * converted to strings for safe JSON serialization.
 */
export async function getCurrentFiscalYear(): Promise<SerializedFiscalYear | null> {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return null

  return {
    id: fy.id,
    label: fy.label,
    totalOperating: fy.total_operating?.toString() ?? '0',
    totalCapital: fy.total_capital?.toString() ?? '0',
    totalBudget: fy.total_budget?.toString() ?? '0',
    totalEmployees: fy.total_employees,
  }
}

/** Release-level adopted totals used by the shared adopted/proposed visuals. */
export async function getAdoptedBudgetRelease(): Promise<SerializedBudgetRelease | null> {
  const release = await prisma.budget_releases.findFirst({
    where: {
      stage: 'adopted',
      fiscal_years: { label: CURRENT_FY_LABEL },
    },
    include: { fiscal_years: true },
  })
  if (!release) return null

  const millage = await prisma.millage_rates.findFirst({
    where: {
      fiscal_year_id: release.fiscal_year_id,
      stage: 'adopted',
      authority: 'Total to County',
    },
    select: { millage_rate: true },
  })

  return {
    fiscalYear: release.fiscal_years.label,
    stage: 'adopted',
    asOfDate: release.as_of_date?.toISOString().slice(0, 10) ?? null,
    netOperating: release.total_operating?.toString() ?? '0',
    grossOperating: release.gross_operating?.toString() ?? '0',
    interagencyTransfers: release.interagency_transfers?.toString() ?? '0',
    capital: release.total_capital?.toString() ?? '0',
    total: release.total_budget?.toString() ?? '0',
    employees: release.total_employees,
    countyMillage: millage ? Number(millage.millage_rate) : null,
  }
}

/**
 * Return the proposed release alongside the currently adopted release.
 * This is the only public query that intentionally reads proposed-stage facts;
 * adopted explorer, search, and department routes remain stage-isolated.
 */
export async function getProposedBudgetOverview(): Promise<ProposedBudgetOverview | null> {
  const [proposedRelease, adoptedRelease] = await Promise.all([
    prisma.budget_releases.findFirst({
      where: {
        stage: 'proposed',
        fiscal_years: { label: PROPOSED_FY_LABEL },
      },
      include: { fiscal_years: true },
    }),
    prisma.budget_releases.findFirst({
      where: {
        stage: 'adopted',
        fiscal_years: { label: CURRENT_FY_LABEL },
      },
      include: { fiscal_years: true },
    }),
  ])

  if (!proposedRelease) return null

  const [priorityBudgets, departmentRows, proposedMillage, adoptedMillage] =
    await Promise.all([
      prisma.strategic_area_budgets.findMany({
        where: {
          fiscal_year_id: proposedRelease.fiscal_year_id,
          stage: 'proposed',
        },
        include: { strategic_areas: true },
        orderBy: { strategic_areas: { display_order: 'asc' } },
      }),
      prisma.department_budgets.findMany({
        where: {
          fiscal_year_id: proposedRelease.fiscal_year_id,
          stage: 'proposed',
        },
        select: {
          department_id: true,
          operating_budget: true,
          capital_budget: true,
          employee_count: true,
          baseline_operating_budget: true,
          baseline_employee_count: true,
          departments: { select: { name: true, slug: true } },
        },
      }),
      prisma.millage_rates.findFirst({
        where: {
          fiscal_year_id: proposedRelease.fiscal_year_id,
          stage: 'proposed',
          authority: 'Total to County',
        },
        select: { millage_rate: true },
      }),
      adoptedRelease
        ? prisma.millage_rates.findFirst({
            where: {
              fiscal_year_id: adoptedRelease.fiscal_year_id,
              stage: 'adopted',
              authority: 'Total to County',
            },
            select: { millage_rate: true },
          })
        : Promise.resolve(null),
    ])

  const serializeRelease = (
    release: NonNullable<typeof proposedRelease>,
    countyMillage: number | null
  ) => ({
    fiscalYear: release.fiscal_years.label,
    stage: release.stage as 'adopted' | 'proposed',
    asOfDate: release.as_of_date?.toISOString().slice(0, 10) ?? null,
    netOperating: release.total_operating?.toString() ?? '0',
    grossOperating: release.gross_operating?.toString() ?? '0',
    interagencyTransfers: release.interagency_transfers?.toString() ?? '0',
    capital: release.total_capital?.toString() ?? '0',
    total: release.total_budget?.toString() ?? '0',
    employees: release.total_employees,
    countyMillage,
  })

  const changesByDepartment = new Map<
    number,
    {
      id: number
      name: string
      slug: string
      baselineOperating: bigint
      proposedOperating: bigint
      proposedCapital: bigint
      baselineEmployees: number | null
      proposedEmployees: number | null
    }
  >()
  for (const row of departmentRows) {
    const change = changesByDepartment.get(row.department_id) ?? {
      id: row.department_id,
      name: row.departments.name,
      slug: row.departments.slug,
      baselineOperating: BigInt(0),
      proposedOperating: BigInt(0),
      proposedCapital: BigInt(0),
      baselineEmployees: null,
      proposedEmployees: null,
    }
    change.baselineOperating += row.baseline_operating_budget ?? BigInt(0)
    change.proposedOperating += row.operating_budget ?? BigInt(0)
    change.proposedCapital += row.capital_budget ?? BigInt(0)
    if (row.baseline_employee_count != null) {
      change.baselineEmployees =
        (change.baselineEmployees ?? 0) + row.baseline_employee_count
    }
    if (row.employee_count != null) {
      change.proposedEmployees =
        (change.proposedEmployees ?? 0) + row.employee_count
    }
    changesByDepartment.set(row.department_id, change)
  }

  const departmentChanges = Array.from(changesByDepartment.values())
    .map((change) => ({
      id: change.id,
      name: change.name,
      slug: change.slug,
      baselineOperating: change.baselineOperating.toString(),
      proposedOperating: change.proposedOperating.toString(),
      operatingChange: (
        change.proposedOperating - change.baselineOperating
      ).toString(),
      proposedCapital: change.proposedCapital.toString(),
      baselineEmployees: change.baselineEmployees,
      proposedEmployees: change.proposedEmployees,
      employeeChange:
        change.baselineEmployees != null && change.proposedEmployees != null
          ? change.proposedEmployees - change.baselineEmployees
          : null,
    }))
    .sort(
      (a, b) =>
        Math.abs(Number(b.operatingChange)) - Math.abs(Number(a.operatingChange))
    )

  return {
    proposed: serializeRelease(
      proposedRelease,
      proposedMillage ? Number(proposedMillage.millage_rate) : null
    ),
    adopted: adoptedRelease
      ? serializeRelease(
          adoptedRelease,
          adoptedMillage ? Number(adoptedMillage.millage_rate) : null
        )
      : null,
    priorities: priorityBudgets.map((budget) => ({
      id: budget.strategic_areas.id,
      name: budget.strategic_areas.name,
      slug: budget.strategic_areas.slug,
      description: budget.strategic_areas.description,
      color: budget.strategic_areas.color,
      centsPerDollar: budget.cents_per_dollar,
      operatingBudget: budget.operating_budget?.toString() ?? '0',
      capitalBudget: budget.capital_budget?.toString() ?? '0',
    })),
    departmentChanges,
    departmentCount: changesByDepartment.size,
    sources: {
      budgetInBrief: proposedRelease.budget_in_brief_url,
      volume1: proposedRelease.volume_1_url,
      volume2: proposedRelease.volume_2_url,
      volume3: proposedRelease.volume_3_url,
    },
  }
}

/**
 * Proposed operating, staffing, and capital context for one adopted department.
 * Operating and staffing comparisons use Appendix A's restated baseline.
 * Capital is proposal-only because the source does not publish a restated
 * adopted capital baseline in the new priority structure.
 */
export const getDepartmentProposalChange = cache(
  async (slug: string): Promise<SerializedDepartmentChange | null> => {
    const release = await prisma.budget_releases.findFirst({
      where: {
        stage: 'proposed',
        fiscal_years: { label: PROPOSED_FY_LABEL },
      },
      select: { fiscal_year_id: true },
    })
    if (!release) return null

    const rows = await prisma.department_budgets.findMany({
      where: {
        fiscal_year_id: release.fiscal_year_id,
        stage: 'proposed',
        departments: { slug },
      },
      select: {
        department_id: true,
        operating_budget: true,
        capital_budget: true,
        employee_count: true,
        baseline_operating_budget: true,
        baseline_employee_count: true,
        departments: { select: { name: true, slug: true } },
      },
    })
    if (rows.length === 0) return null

    const first = rows[0]
    const totals = rows.reduce(
      (result, row) => ({
        baselineOperating:
          result.baselineOperating +
          (row.baseline_operating_budget ?? BigInt(0)),
        proposedOperating:
          result.proposedOperating + (row.operating_budget ?? BigInt(0)),
        proposedCapital:
          result.proposedCapital + (row.capital_budget ?? BigInt(0)),
        baselineEmployees:
          row.baseline_employee_count == null
            ? result.baselineEmployees
            : (result.baselineEmployees ?? 0) + row.baseline_employee_count,
        proposedEmployees:
          row.employee_count == null
            ? result.proposedEmployees
            : (result.proposedEmployees ?? 0) + row.employee_count,
      }),
      {
        baselineOperating: BigInt(0),
        proposedOperating: BigInt(0),
        proposedCapital: BigInt(0),
        baselineEmployees: null as number | null,
        proposedEmployees: null as number | null,
      }
    )

    return {
      id: first.department_id,
      name: first.departments.name,
      slug: first.departments.slug,
      baselineOperating: totals.baselineOperating.toString(),
      proposedOperating: totals.proposedOperating.toString(),
      operatingChange: (
        totals.proposedOperating - totals.baselineOperating
      ).toString(),
      proposedCapital: totals.proposedCapital.toString(),
      baselineEmployees: totals.baselineEmployees,
      proposedEmployees: totals.proposedEmployees,
      employeeChange:
        totals.baselineEmployees != null && totals.proposedEmployees != null
          ? totals.proposedEmployees - totals.baselineEmployees
          : null,
    }
  }
)

/**
 * Get millage rates for FY 2025-26.
 * Converts Prisma Decimal to JavaScript number and nullable boolean to definite boolean.
 */
export async function getMillageRates(): Promise<SerializedMillageRate[]> {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return []

  const rates = await prisma.millage_rates.findMany({
    where: {
      fiscal_year_id: fy.id,
      stage: 'adopted',
      // This row is a published subtotal of the five county levies above it.
      // Excluding it prevents the property-tax calculator from double counting.
      authority: { not: 'Total to County' },
    },
    orderBy: { display_order: 'asc' },
  })

  return rates.map((rate) => ({
    id: rate.id,
    authority: rate.authority,
    millageRate: Number(rate.millage_rate),
    isCounty: rate.is_county ?? true,
    displayOrder: rate.display_order ?? 0,
  }))
}

/**
 * Get all 9 strategic areas with their budget data for FY 2025-26.
 * Joins strategic_area_budgets to get operating budget and cents_per_dollar.
 */
export async function getStrategicAreas(): Promise<SerializedStrategicArea[]> {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return []

  const areas = await prisma.strategic_areas.findMany({
    where: {
      strategic_area_budgets: {
        some: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    include: {
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    orderBy: { display_order: 'asc' },
  })

  return areas.map((area) => {
    const budget = area.strategic_area_budgets[0]
    return {
      id: area.id,
      name: area.name,
      slug: area.slug,
      color: area.color,
      operatingBudget: budget?.operating_budget?.toString() ?? '0',
      capitalBudget: budget?.capital_budget?.toString() ?? '0',
      centsPerDollar: budget?.cents_per_dollar ?? null,
    }
  })
}

/**
 * Get aggregated quick stats for the homepage.
 */
export async function getQuickStats(): Promise<QuickStats> {
  const fyRow = await getCurrentFiscalYearRow()

  if (!fyRow) {
    return {
      strategicAreaCount: 0,
      departmentCount: 0,
      totalEmployees: 0,
      fiscalYear: CURRENT_FY_LABEL,
    }
  }

  const [strategicAreaCount, departmentCount] = await Promise.all([
    prisma.strategic_areas.count({
      where: {
        strategic_area_budgets: {
          some: { fiscal_year_id: fyRow.id, stage: 'adopted' },
        },
      },
    }),
    prisma.departments.count({
      where: {
        department_budgets: {
          some: { fiscal_year_id: fyRow.id, stage: 'adopted' },
        },
      },
    }),
  ])

  return {
    strategicAreaCount,
    departmentCount,
    totalEmployees: fyRow.total_employees ?? 0,
    fiscalYear: fyRow.label,
  }
}

/**
 * Get a strategic area by slug with its departments and their FY 2025-26 budgets.
 * Returns area details plus a list of departments sorted by operating budget descending.
 */
export const getAreaWithDepartments = cache(async (areaSlug: string): Promise<{
  area: SerializedStrategicArea & { description: string | null; departmentCount: number }
  departments: SerializedDepartment[]
} | null> => {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return null

  const area = await prisma.strategic_areas.findFirst({
    where: {
      slug: areaSlug,
      strategic_area_budgets: {
        some: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    include: {
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
  })

  if (!area) return null

  const budget = area.strategic_area_budgets[0]

  // Pull the budget rows that belong to THIS area (not the departments whose
  // home area this is), so multi-area departments show their slice within
  // this area and the list sums to the area subtotal.
  const rows = await prisma.department_budgets.findMany({
    where: {
      fiscal_year_id: fy.id,
      stage: 'adopted',
      OR: areaMembershipFilter(area.id),
    },
    include: { departments: true },
  })

  const rowsByDept = new Map<number, typeof rows>()
  for (const row of rows) {
    const list = rowsByDept.get(row.department_id)
    if (list) {
      list.push(row)
    } else {
      rowsByDept.set(row.department_id, [row])
    }
  }

  // Sort departments by operating budget descending
  const departments: SerializedDepartment[] = Array.from(rowsByDept.values())
    .map((deptRows) => {
      const dept = deptRows[0].departments
      const sums = sumBudgetRows(deptRows)
      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        strategicAreaId: dept.strategic_area_id,
        operatingBudget: sums.operating.toString(),
        capitalBudget: sums.capital.toString(),
        employeeCount: sums.employees,
      }
    })
    .sort((a, b) => Number(b.operatingBudget) - Number(a.operatingBudget))

  return {
    area: {
      id: area.id,
      name: area.name,
      slug: area.slug,
      color: area.color,
      description: area.description,
      operatingBudget: budget?.operating_budget?.toString() ?? '0',
      capitalBudget: budget?.capital_budget?.toString() ?? '0',
      centsPerDollar: budget?.cents_per_dollar ?? null,
      departmentCount: departments.length,
    },
    departments,
  }
})

/**
 * Get all revenue sources for FY 2025-26.
 * Joins revenue_by_source with revenue_sources, sorted by display_order.
 */
export async function getRevenueSources(): Promise<SerializedRevenueSource[]> {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return []

  const revenues = await prisma.revenue_by_source.findMany({
    where: { fiscal_year_id: fy.id, stage: 'adopted' },
    include: {
      revenue_sources: true,
    },
    orderBy: {
      revenue_sources: { display_order: 'asc' },
    },
  })

  return revenues.map((rev) => ({
    id: rev.revenue_sources.id,
    name: rev.revenue_sources.name,
    slug: rev.revenue_sources.slug,
    amount: rev.amount.toString(),
    percentage: rev.percentage ? Number(rev.percentage) : null,
  }))
}

/**
 * Get all strategic areas with descriptions and department counts for FY 2025-26.
 * Extended version of getStrategicAreas() with additional detail fields.
 */
export async function getStrategicAreasWithDetails(): Promise<
  (SerializedStrategicArea & { description: string | null; departmentCount: number })[]
> {
  const fy = await getCurrentFiscalYearRow()

  if (!fy) return []

  const [areas, departmentBudgetRows] = await Promise.all([
    prisma.strategic_areas.findMany({
      where: {
        strategic_area_budgets: {
          some: { fiscal_year_id: fy.id, stage: 'adopted' },
        },
      },
      include: {
        strategic_area_budgets: {
          where: { fiscal_year_id: fy.id, stage: 'adopted' },
        },
      },
      orderBy: { display_order: 'asc' },
    }),
    prisma.department_budgets.findMany({
      where: { fiscal_year_id: fy.id, stage: 'adopted' },
      select: {
        department_id: true,
        strategic_area_id: true,
        departments: { select: { strategic_area_id: true } },
      },
    }),
  ])

  const departmentIdsByArea = new Map<number, Set<number>>()
  for (const row of departmentBudgetRows) {
    const areaId = row.strategic_area_id ?? row.departments.strategic_area_id
    const departmentIds = departmentIdsByArea.get(areaId) ?? new Set<number>()
    departmentIds.add(row.department_id)
    departmentIdsByArea.set(areaId, departmentIds)
  }

  return areas.map((area) => {
    const budget = area.strategic_area_budgets[0]
    return {
      id: area.id,
      name: area.name,
      slug: area.slug,
      color: area.color,
      description: area.description,
      operatingBudget: budget?.operating_budget?.toString() ?? '0',
      capitalBudget: budget?.capital_budget?.toString() ?? '0',
      centsPerDollar: budget?.cents_per_dollar ?? null,
      departmentCount: departmentIdsByArea.get(area.id)?.size ?? 0,
    }
  })
}

/**
 * Get a single department with its budget, AI description, and strategic area
 * for the current fiscal year. Returns null if not found.
 */
export const getDepartmentDetail = cache(async (slug: string): Promise<SerializedDepartmentDetail | null> => {
  const fy = await getCurrentFiscalYearRow()
  if (!fy) return null

  const dept = await prisma.departments.findFirst({
    where: {
      slug,
      department_budgets: {
        some: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    include: {
      strategic_areas: true,
      department_budgets: {
        where: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
  })
  if (!dept) return null

  const description = await prisma.budget_descriptions.findFirst({
    where: {
      fiscal_year_id: fy.id,
      entity_type: 'department',
      entity_id: dept.id,
      stage: 'adopted',
    },
  })

  const sums = sumBudgetRows(dept.department_budgets)

  return {
    id: dept.id,
    name: dept.name,
    slug: dept.slug,
    area: {
      id: dept.strategic_areas.id,
      name: dept.strategic_areas.name,
      slug: dept.strategic_areas.slug,
      color: dept.strategic_areas.color,
    },
    operatingBudget: sums.operating.toString(),
    capitalBudget: sums.capital.toString(),
    totalBudget: sums.total.toString(),
    employeeCount: sums.employees,
    description: description ? {
      summary: description.summary,
      detailedDescription: description.detailed_description,
      keyChanges: description.key_changes,
      generatedAt: description.generated_at?.toISOString() ?? null,
      fiscalYear: fy.label,
      modelVersion: description.model_version,
    } : null,
  }
})

/** Slugs that are part of the currently published adopted release. */
export async function getAdoptedDepartmentSlugs(): Promise<string[]> {
  const fy = await getCurrentFiscalYearRow()
  if (!fy) return []

  const departments = await prisma.departments.findMany({
    where: {
      department_budgets: {
        some: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    select: { slug: true },
  })
  return departments.map((department) => department.slug)
}

/** Strategic-area slugs that are part of the currently published adopted release. */
export async function getAdoptedStrategicAreaSlugs(): Promise<string[]> {
  const fy = await getCurrentFiscalYearRow()
  if (!fy) return []

  const areas = await prisma.strategic_areas.findMany({
    where: {
      strategic_area_budgets: {
        some: { fiscal_year_id: fy.id, stage: 'adopted' },
      },
    },
    select: { slug: true },
  })
  return areas.map((area) => area.slug)
}

/**
 * Get expenditure category breakdown for a department in FY 2025-26.
 * Returns categories sorted by amount descending, with $0 categories excluded.
 */
export async function getDepartmentExpenditures(deptId: number): Promise<SerializedExpenditure[]> {
  const fy = await getCurrentFiscalYearRow()
  if (!fy) return []

  const expenditures = await prisma.department_expenditures.findMany({
    where: {
      fiscal_year_id: fy.id,
      department_id: deptId,
      stage: 'adopted',
    },
    include: { expenditure_categories: true },
    orderBy: { amount: 'desc' },
  })

  const total = expenditures.reduce((sum, e) => sum + Number(e.amount), 0)

  return expenditures
    .filter(e => Number(e.amount) > 0)
    .map(e => ({
      categoryName: e.expenditure_categories.name,
      amount: e.amount.toString(),
      percentage: total > 0 ? (Number(e.amount) / total) * 100 : 0,
    }))
}

/**
 * Get sibling departments in the same strategic area, excluding the current department.
 * Sorted by operating budget descending, limited to 6 results.
 */
export async function getRelatedDepartments(
  areaId: number,
  excludeDeptId: number
): Promise<SerializedDepartment[]> {
  const fy = await getCurrentFiscalYearRow()
  if (!fy) return []

  const rows = await prisma.department_budgets.findMany({
    where: {
      fiscal_year_id: fy.id,
      stage: 'adopted',
      department_id: { not: excludeDeptId },
      OR: areaMembershipFilter(areaId),
    },
    include: { departments: true },
  })

  const rowsByDept = new Map<number, typeof rows>()
  for (const row of rows) {
    const list = rowsByDept.get(row.department_id)
    if (list) {
      list.push(row)
    } else {
      rowsByDept.set(row.department_id, [row])
    }
  }

  return Array.from(rowsByDept.values())
    .map(deptRows => {
      const dept = deptRows[0].departments
      const sums = sumBudgetRows(deptRows)
      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        strategicAreaId: dept.strategic_area_id,
        operatingBudget: sums.operating.toString(),
        capitalBudget: sums.capital.toString(),
        employeeCount: sums.employees,
      }
    })
    .sort((a, b) => Number(b.operatingBudget) - Number(a.operatingBudget))
    .slice(0, 6)
}

/**
 * Get year-over-year budget history for a department.
 * Returns up to 5 fiscal years of adopted budget data, sorted by date ascending.
 */
export async function getDepartmentYoY(deptId: number): Promise<SerializedYoYData[]> {
  const budgets = await prisma.department_budgets.findMany({
    where: { department_id: deptId },
    include: { fiscal_years: true },
    orderBy: { fiscal_years: { start_date: 'asc' } },
  })

  // Collapse per-area rows into one point per fiscal year. Early fiscal years
  // are seeded as actual spending (stage='actual') while recent years carry
  // adopted budgets (stage='adopted'); when a year has both, prefer adopted.
  // Proposed-stage rows are draft figures and never appear in history charts.
  type YearSums = { total: bigint; operating: bigint; capital: bigint }
  const adopted = new Map<string, YearSums>()
  const actual = new Map<string, YearSums>()
  const yearLabels: string[] = []

  for (const b of budgets) {
    const label = b.fiscal_years.label
    if (b.stage === 'proposed') continue
    if (!adopted.has(label) && !actual.has(label)) {
      yearLabels.push(label)
    }
    const byYear = b.stage === 'actual' ? actual : adopted
    const entry = byYear.get(label) ?? {
      total: BigInt(0),
      operating: BigInt(0),
      capital: BigInt(0),
    }
    entry.total += b.total_budget ?? BigInt(0)
    entry.operating += b.operating_budget ?? BigInt(0)
    entry.capital += b.capital_budget ?? BigInt(0)
    byYear.set(label, entry)
  }

  // Rows are sorted ascending by start_date, so the last 5 labels are the
  // 5 most recent fiscal years.
  return yearLabels
    .slice(-5)
    .map((label) => {
      const sums = adopted.get(label) ?? actual.get(label)!
      return {
        fiscalYear: label,
        totalBudget: sums.total.toString(),
        operatingBudget: sums.operating.toString(),
        capitalBudget: sums.capital.toString(),
        isCurrent: label === CURRENT_FY_LABEL,
      }
    })
}

// --- Search ---

export type SearchResult = {
  entity_type: 'department' | 'strategic_area' | 'glossary'
  entity_id: number
  title: string
  slug: string
  snippet: string
  area_name: string | null
  area_color: string | null
  area_slug: string | null
  operating_budget: string | null
  cents_per_dollar: number | null
  rank: number
}

/**
 * Full-text search across departments, strategic areas, and glossary terms.
 * Uses the search_index materialized view with weighted tsvector ranking.
 * Returns results ordered by relevance, limited to 50.
 */
export async function searchBudget(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const rawResults = await prisma.$queryRaw<
    Array<{
      entity_type: string
      entity_id: number
      title: string
      slug: string
      snippet: string
      area_name: string | null
      area_color: string | null
      area_slug: string | null
      operating_budget: bigint | null
      cents_per_dollar: number | null
      rank: number
    }>
  >`
    SELECT
      entity_type,
      entity_id,
      title,
      slug,
      snippet,
      area_name,
      area_color,
      area_slug,
      operating_budget,
      cents_per_dollar,
      ts_rank(search_vector, websearch_to_tsquery('english', ${trimmed})) AS rank
    FROM search_index
    WHERE search_vector @@ websearch_to_tsquery('english', ${trimmed})
    ORDER BY rank DESC
    LIMIT 50
  `

  // Convert BigInt operating_budget to string for safe JSON serialization
  return rawResults.map(r => ({
    entity_type: r.entity_type as SearchResult['entity_type'],
    entity_id: r.entity_id,
    title: r.title,
    slug: r.slug,
    snippet: r.snippet,
    area_name: r.area_name,
    area_color: r.area_color,
    area_slug: r.area_slug,
    operating_budget: r.operating_budget?.toString() ?? null,
    cents_per_dollar: r.cents_per_dollar,
    rank: Number(r.rank),
  }))
}
