import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  fiscalYearsFindFirst: vi.fn(),
  strategicAreasFindMany: vi.fn(),
  strategicAreasCount: vi.fn(),
  departmentsFindMany: vi.fn(),
  departmentsCount: vi.fn(),
  budgetReleasesFindFirst: vi.fn(),
  strategicAreaBudgetsFindMany: vi.fn(),
  departmentBudgetsFindMany: vi.fn(),
  millageRatesFindMany: vi.fn(),
  millageRatesFindFirst: vi.fn(),
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
    budget_releases: { findFirst: db.budgetReleasesFindFirst },
    strategic_area_budgets: { findMany: db.strategicAreaBudgetsFindMany },
    department_budgets: { findMany: db.departmentBudgetsFindMany },
    millage_rates: {
      findMany: db.millageRatesFindMany,
      findFirst: db.millageRatesFindFirst,
    },
  },
}))

import {
  getAdoptedDepartmentSlugs,
  getAdoptedStrategicAreaSlugs,
  getDepartmentProposalChange,
  getQuickStats,
  getProposedBudgetOverview,
  getMillageRates,
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
  db.budgetReleasesFindFirst.mockResolvedValue(null)
  db.strategicAreaBudgetsFindMany.mockResolvedValue([])
  db.departmentBudgetsFindMany.mockResolvedValue([])
  db.millageRatesFindMany.mockResolvedValue([])
  db.millageRatesFindFirst.mockResolvedValue(null)
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

  it('reads proposed facts only through the dedicated proposed overview', async () => {
    const baseRelease = {
      id: 1,
      as_of_date: new Date('2026-07-15T00:00:00Z'),
      published_at: null,
      total_operating: BigInt(9),
      gross_operating: BigInt(10),
      interagency_transfers: BigInt(1),
      total_capital: BigInt(5),
      total_budget: BigInt(14),
      total_employees: 100,
      budget_in_brief_url: 'https://example.com/bib.pdf',
      volume_1_url: null,
      volume_2_url: null,
      volume_3_url: null,
      created_at: null,
      updated_at: null,
    }
    db.budgetReleasesFindFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.stage === 'proposed'
          ? {
              ...baseRelease,
              fiscal_year_id: 7,
              stage: 'proposed',
              fiscal_years: { label: 'FY 2026-27' },
            }
          : {
              ...baseRelease,
              fiscal_year_id: 6,
              stage: 'adopted',
              fiscal_years: { label: 'FY 2025-26' },
            }
      )
    )
    db.departmentBudgetsFindMany.mockResolvedValue([
      {
        department_id: 42,
        operating_budget: BigInt(600),
        capital_budget: BigInt(90),
        employee_count: 7,
        baseline_operating_budget: BigInt(500),
        baseline_employee_count: 6,
        departments: { name: 'Transit', slug: 'transit' },
      },
      {
        department_id: 42,
        operating_budget: BigInt(500),
        capital_budget: BigInt(10),
        employee_count: 5,
        baseline_operating_budget: BigInt(400),
        baseline_employee_count: 4,
        departments: { name: 'Transit', slug: 'transit' },
      },
    ])

    await expect(getProposedBudgetOverview()).resolves.toMatchObject({
      proposed: { fiscalYear: 'FY 2026-27', stage: 'proposed' },
      adopted: { fiscalYear: 'FY 2025-26', stage: 'adopted' },
      departmentChanges: [
        {
          name: 'Transit',
          baselineOperating: '900',
          proposedOperating: '1100',
          operatingChange: '200',
          proposedCapital: '100',
          baselineEmployees: 10,
          proposedEmployees: 12,
          employeeChange: 2,
        },
      ],
    })

    expect(db.strategicAreaBudgetsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscal_year_id: 7, stage: 'proposed' },
      })
    )
    expect(db.departmentBudgetsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fiscal_year_id: 7, stage: 'proposed' },
      })
    )
  })

  it('aggregates one department against the restated proposal baseline', async () => {
    db.budgetReleasesFindFirst.mockResolvedValue({ fiscal_year_id: 7 })
    db.departmentBudgetsFindMany.mockResolvedValue([
      {
        department_id: 42,
        operating_budget: BigInt(600),
        capital_budget: BigInt(90),
        employee_count: 7,
        baseline_operating_budget: BigInt(500),
        baseline_employee_count: 6,
        departments: { name: 'Transit', slug: 'transit' },
      },
      {
        department_id: 42,
        operating_budget: BigInt(500),
        capital_budget: BigInt(10),
        employee_count: 5,
        baseline_operating_budget: BigInt(400),
        baseline_employee_count: 4,
        departments: { name: 'Transit', slug: 'transit' },
      },
    ])

    await expect(getDepartmentProposalChange('transit')).resolves.toEqual({
      id: 42,
      name: 'Transit',
      slug: 'transit',
      baselineOperating: '900',
      proposedOperating: '1100',
      operatingChange: '200',
      proposedCapital: '100',
      baselineEmployees: 10,
      proposedEmployees: 12,
      employeeChange: 2,
    })

    expect(db.departmentBudgetsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fiscal_year_id: 7,
          stage: 'proposed',
          departments: { slug: 'transit' },
        },
      })
    )
  })

  it('excludes the county subtotal from calculator millage rows', async () => {
    await getMillageRates()

    expect(db.millageRatesFindMany).toHaveBeenCalledWith({
      where: {
        fiscal_year_id: 6,
        stage: 'adopted',
        authority: { not: 'Total to County' },
      },
      orderBy: { display_order: 'asc' },
    })
  })
})
