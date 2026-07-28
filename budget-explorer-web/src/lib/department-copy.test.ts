import { describe, expect, it } from 'vitest'
import { getServiceSummary } from './department-copy'

describe('getServiceSummary', () => {
  it('removes repeated budget and staffing facts', () => {
    expect(
      getServiceSummary(
        'The department runs county libraries. In FY 2025-26, it operates with a $40 million budget and 300 employees.'
      )
    ).toBe('The department runs county libraries.')
  })

  it('keeps multiple service sentences', () => {
    expect(
      getServiceSummary(
        'The department maintains roads. It operates traffic signals and manages construction projects. In FY 2025-26, the budget is $2 billion.'
      )
    ).toBe(
      'The department maintains roads. It operates traffic signals and manages construction projects.'
    )
  })

  it('does not remove a service reference to preparing budgets', () => {
    expect(
      getServiceSummary(
        'The department prepares budgets and tracks county spending. The office has a budget of $10 million.'
      )
    ).toBe('The department prepares budgets and tracks county spending.')
  })

  it('replaces a known stale service description', () => {
    expect(
      getServiceSummary(
        "The Sheriff's Office runs the county's jail system.",
        'sheriff'
      )
    ).toBe(
      'The Miami-Dade Sheriff’s Office provides police services, specialized law-enforcement support, and countywide sheriff services.'
    )
  })
})
