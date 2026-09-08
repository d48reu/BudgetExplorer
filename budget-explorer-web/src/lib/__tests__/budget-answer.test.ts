import { describe, expect, it } from 'vitest'
import sourceIndex from '@/data/answer-source-index.json'
import audit from '@/data/budget-audit.json'
import { classifyBudgetQuestion } from '@/lib/budget-answer'

describe('budget question classification', () => {
  it.each([
    ['How much of the budget goes to District 7?', 'district'],
    ['What changed at the first budget hearing?', 'amendments'],
    ['Which departments are proposed to lose positions?', 'ranking'],
    ['What are the largest adopted revenue sources?', 'revenue'],
    ['How does the proposed total compare with adopted?', 'release'],
    ['Why did the Law Library budget change?', 'department-or-unknown'],
  ])('routes “%s” to %s', (question, intent) => {
    expect(classifyBudgetQuestion(question)).toBe(intent)
  })
})

describe('answer citation index', () => {
  it('contains one source record for every passed audit check', () => {
    expect(sourceIndex).toHaveLength(audit.gate.passed)
    expect(sourceIndex.every((row) => row.sourceUrl.startsWith('https://'))).toBe(true)
  })

  it('retains exact department and source-page locators', () => {
    expect(sourceIndex).toContainEqual(expect.objectContaining({
      release: 'FY 2025-26',
      entity: 'Law Library — Public Safety',
      metric: 'operating budget',
      actual: '60600000',
      sourcePage: '4',
    }))
    expect(sourceIndex).toContainEqual(expect.objectContaining({
      release: 'FY 2026-27',
      entity: 'Transportation and Public Works — Investment in Infrastructure',
      metric: 'restated adopted positions',
      actual: '4241',
      sourcePage: '114',
    }))
  })
})
