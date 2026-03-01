import prisma from '@/lib/prisma'
import type {
  SerializedFiscalYear,
  SerializedStrategicArea,
  SerializedDepartment,
  SerializedRevenueSource,
  QuickStats,
} from '@/types/budget'

/**
 * Get the current fiscal year (FY 2025-26) with all BigInt fields
 * converted to strings for safe JSON serialization.
 */
export async function getCurrentFiscalYear(): Promise<SerializedFiscalYear | null> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

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

/**
 * Get all 9 strategic areas with their budget data for FY 2025-26.
 * Joins strategic_area_budgets to get operating budget and cents_per_dollar.
 */
export async function getStrategicAreas(): Promise<SerializedStrategicArea[]> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

  if (!fy) return []

  const areas = await prisma.strategic_areas.findMany({
    include: {
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id },
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
 * Get the count of departments.
 */
export async function getDepartmentCount(): Promise<number> {
  return prisma.departments.count()
}

/**
 * Get aggregated quick stats for the homepage.
 */
export async function getQuickStats(): Promise<QuickStats> {
  const [fy, strategicAreaCount, departmentCount] = await Promise.all([
    getCurrentFiscalYear(),
    prisma.strategic_areas.count(),
    prisma.departments.count(),
  ])

  return {
    strategicAreaCount,
    departmentCount,
    totalEmployees: fy?.totalEmployees ?? 0,
    fiscalYear: fy?.label ?? 'FY 2025-26',
  }
}

/**
 * Get a strategic area by slug with its departments and their FY 2025-26 budgets.
 * Returns area details plus a list of departments sorted by operating budget descending.
 */
export async function getAreaWithDepartments(areaSlug: string): Promise<{
  area: SerializedStrategicArea & { description: string | null; departmentCount: number }
  departments: SerializedDepartment[]
} | null> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

  if (!fy) return null

  const area = await prisma.strategic_areas.findFirst({
    where: { slug: areaSlug },
    include: {
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id },
      },
      departments: {
        include: {
          department_budgets: {
            where: { fiscal_year_id: fy.id },
          },
        },
      },
    },
  })

  if (!area) return null

  const budget = area.strategic_area_budgets[0]

  // Sort departments by operating budget descending
  const departments: SerializedDepartment[] = area.departments
    .map((dept) => {
      const deptBudget = dept.department_budgets[0]
      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        description: dept.description,
        strategicAreaId: dept.strategic_area_id,
        operatingBudget: deptBudget?.operating_budget?.toString() ?? '0',
        capitalBudget: deptBudget?.capital_budget?.toString() ?? '0',
        employeeCount: deptBudget?.employee_count ?? null,
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
      departmentCount: area.departments.length,
    },
    departments,
  }
}

/**
 * Get all revenue sources for FY 2025-26.
 * Joins revenue_by_source with revenue_sources, sorted by display_order.
 */
export async function getRevenueSources(): Promise<SerializedRevenueSource[]> {
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

  if (!fy) return []

  const revenues = await prisma.revenue_by_source.findMany({
    where: { fiscal_year_id: fy.id },
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
  const fy = await prisma.fiscal_years.findFirst({
    where: { label: 'FY 2025-26' },
  })

  if (!fy) return []

  const areas = await prisma.strategic_areas.findMany({
    include: {
      strategic_area_budgets: {
        where: { fiscal_year_id: fy.id },
      },
      _count: {
        select: { departments: true },
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
      description: area.description,
      operatingBudget: budget?.operating_budget?.toString() ?? '0',
      capitalBudget: budget?.capital_budget?.toString() ?? '0',
      centsPerDollar: budget?.cents_per_dollar ?? null,
      departmentCount: area._count.departments,
    }
  })
}
