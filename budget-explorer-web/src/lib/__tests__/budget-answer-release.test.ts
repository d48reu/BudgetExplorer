import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ default: {} }))

vi.mock('@/lib/db/queries', () => ({
  getDepartmentDetail: vi.fn(),
  getDepartmentProposalChange: vi.fn(),
  getDepartmentYoY: vi.fn(),
  getProposedBudgetOverview: vi.fn().mockResolvedValue({
    proposed: {
      fiscalYear: 'FY 2026-27',
      stage: 'proposed',
      netOperating: '902167600000',
      capital: '523954800000',
      total: '1426122400000',
      employees: 31942,
    },
    adopted: {
      fiscalYear: 'FY 2025-26',
      stage: 'adopted',
      netOperating: '857560600000',
      capital: '465763200000',
      total: '1323323800000',
      employees: 31996,
    },
    priorities: [],
    departmentChanges: [],
    departmentCount: 0,
    sources: {},
  }),
}))

import { answerBudgetQuestion } from '@/lib/budget-answer'

describe('Countywide release answers', () => {
  it('answers every part of a multi-measure comparison', async () => {
    const answer = await answerBudgetQuestion(
      'How does the proposed County budget compare with the adopted budget for operating expenses, capital spending, total funding, and positions?'
    )

    expect(answer.status).toBe('answered')
    expect(answer.claims).toHaveLength(4)
    expect(answer.facts.map((fact) => fact.label)).toEqual([
      'Total budget',
      'Net operating budget',
      'Capital budget',
      'Positions',
    ])
    expect(answer.facts[0]).toMatchObject({
      value: '$14,261,224,000',
      detail: expect.stringContaining('$13,233,238,000'),
      citationIds: ['1', '2'],
    })
    expect(answer.citations).toHaveLength(2)
  })
})
