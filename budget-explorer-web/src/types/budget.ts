/**
 * Serialized types for budget data.
 * All BigInt values are converted to strings in the data access layer
 * to prevent JSON serialization errors when passing to Client Components.
 */

export type SerializedFiscalYear = {
  id: number
  label: string
  totalOperating: string  // cents as string
  totalCapital: string    // cents as string
  totalBudget: string     // cents as string
  totalEmployees: number | null
}

export type SerializedStrategicArea = {
  id: number
  name: string
  slug: string
  color: string | null
  operatingBudget: string  // cents as string
  capitalBudget: string    // cents as string
  centsPerDollar: number | null
}

export type QuickStats = {
  strategicAreaCount: number
  departmentCount: number
  totalEmployees: number
  fiscalYear: string
}

export type SerializedDepartment = {
  id: number
  name: string
  slug: string
  description: string | null
  strategicAreaId: number
  operatingBudget: string   // cents as string
  capitalBudget: string     // cents as string
  employeeCount: number | null
}

export type SerializedRevenueSource = {
  id: number
  name: string
  slug: string
  amount: string           // cents as string
  percentage: number | null
}

export type SerializedBudgetDescription = {
  summary: string
  detailedDescription: string | null
  keyChanges: string | null
  generatedAt: string | null      // ISO date string
  fiscalYear: string              // e.g., "FY 2025-26"
  modelVersion: string | null
}

export type SerializedDepartmentDetail = {
  id: number
  name: string
  slug: string
  area: {
    id: number
    name: string
    slug: string
    color: string | null
  }
  operatingBudget: string         // cents as string
  capitalBudget: string           // cents as string
  totalBudget: string             // cents as string
  employeeCount: number | null
  description: SerializedBudgetDescription | null
}

export type SerializedExpenditure = {
  categoryName: string
  amount: string                  // cents as string
  percentage: number              // 0-100
}

export type SerializedYoYData = {
  fiscalYear: string
  totalBudget: string             // cents as string
  operatingBudget: string         // cents as string
  capitalBudget: string           // cents as string
  isCurrent: boolean
}

export type SerializedMillageRate = {
  id: number
  authority: string
  millageRate: number    // Prisma Decimal converted to JS number
  isCounty: boolean
  displayOrder: number
}

/** Column definition for DataTableToggle */
export type TableColumn<T> = {
  key: keyof T & string
  label: string
  format?: (value: unknown) => string
  align?: 'left' | 'right'
}
