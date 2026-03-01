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

/** Column definition for DataTableToggle */
export type TableColumn<T> = {
  key: keyof T & string
  label: string
  format?: (value: unknown) => string
  align?: 'left' | 'right'
}
