import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  fiscalYearsFindFirst: vi.fn(),
  strategicAreasFindMany: vi.fn(),
  strategicAreasCount: vi.fn(),
  departmentsFindMany: vi.fn(),
  departmentsCount: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    fiscal_years: { findFirst: db.fiscalYearsFindFirst },
    strategic_areas: {
      findMany: db.strategicAreasFindMany,
      count: db.strategicAreasCount,
    },
    departments: {
      findMany: db.departmentsFindMany,
      count: db.departmentsCount,
    },
  },
}))

import {
  getAdoptedDepartmentSlugs,
  getAdoptedStrategicAreaSlugs,
  getQuickStats,
  getStrategicAreas,
} from '@/lib/db/queries'

const fiscalYear = {
  id: 6,
  label: 'FY 2025-26',
  total_employees: 31_996,
}

beforeEach(() => {
  vi.clearAllMocks()
  db.fiscalYearsFindFirst.mockResolvedValue(fiscalYear)
  db.strategicAreasFindMany.mockResolvedValue([])
  db.departmentsFindMany.mockResolvedValue([])
  db.strategicAreasCount.mockResolvedValue(9)
  db.departmentsCount.mockResolvedValue(55)
})

describe('adopted release isolation', () => {
  it('scopes strategic-area navigation to adopted facts', async () => {
    await getStrategicAreas()

    expect(db.strategicAreasFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          strategic_area_budgets: {
            some: { fiscal_year_id: 6, stage: 'adopted' },
          },
        },
      })
    )
  })

  it('scopes homepage counts to adopted facts', async () => {
    await getQuickStats()

    expect(db.strategicAreasCount).toHaveBeenCalledWith({
      where: {
        strategic_area_budgets: {
          some: { fiscal_year_id: 6, stage: 'adopted' },
        },
      },
    })
    expect(db.departmentsCount).toHaveBeenCalledWith({
      where: {
        department_budgets: {
          some: { fiscal_year_id: 6, stage: 'adopted' },
        },
      },
    })
  })

  it('scopes static route slugs to adopted facts', async () => {
    db.departmentsFindMany.mockResolvedValue([{ slug: 'fire-rescue' }])
    db.strategicAreasFindMany.mockResolvedValue([{ slug: 'public-safety' }])

    await expect(getAdoptedDepartmentSlugs()).resolves.toEqual(['fire-rescue'])
    await expect(getAdoptedStrategicAreaSlugs()).resolves.toEqual(['public-safety'])

    expect(db.departmentsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          department_budgets: {
            some: { fiscal_year_id: 6, stage: 'adopted' },
          },
        },
      })
    )
    expect(db.strategicAreasFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          strategic_area_budgets: {
            some: { fiscal_year_id: 6, stage: 'adopted' },
          },
        },
      })
    )
  })
})
