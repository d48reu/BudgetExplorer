import prisma from '@/lib/prisma'
import type { SerializedFiscalYear, SerializedStrategicArea, QuickStats } from '@/types/budget'

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
