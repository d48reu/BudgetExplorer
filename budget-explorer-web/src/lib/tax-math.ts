/**
 * Pure tax calculation functions.
 * No React dependencies, no side effects, no DB access.
 * All monetary values are in dollars (not cents).
 * Formatting happens at the display layer only.
 */

export type MillageRate = {
  authority: string
  millageRate: number    // e.g., 4.574
  isCounty: boolean
  displayOrder: number
}

export type TaxByAuthority = {
  authority: string
  millageRate: number
  taxAmount: number      // dollars, rounded to nearest cent
  percentage: number     // 0-100
  isCounty: boolean
}

export type StrategicAreaAllocation = {
  name: string
  slug: string
  color: string | null
  dollarAmount: number
  percentage: number     // 0-100
}

/**
 * Apply Florida homestead exemption (simplified flat $50K reduction).
 * Per user decision: single flat reduction, NOT the two-tier Florida approach.
 */
export function applyHomesteadExemption(assessedValue: number): number {
  return Math.max(0, assessedValue - 50_000)
}

/**
 * Calculate tax breakdown by authority.
 * Formula: taxAmount = taxableValue * millageRate / 1000, rounded to nearest cent.
 */
export function calculateTaxBreakdown(
  assessedValue: number,
  homesteadExempt: boolean,
  rates: MillageRate[],
): TaxByAuthority[] {
  const taxableValue = homesteadExempt
    ? applyHomesteadExemption(assessedValue)
    : assessedValue

  const results = rates.map(rate => ({
    authority: rate.authority,
    millageRate: rate.millageRate,
    taxAmount: Math.round(taxableValue * rate.millageRate / 1000 * 100) / 100,
    percentage: 0,
    isCounty: rate.isCounty,
  }))

  const total = results.reduce((sum, r) => sum + r.taxAmount, 0)

  return results.map(r => ({
    ...r,
    percentage: total > 0 ? (r.taxAmount / total) * 100 : 0,
  }))
}

/**
 * Split county tax total across strategic areas by centsPerDollar proportions.
 * Areas with null centsPerDollar are excluded from the split.
 */
export function calculateCountyAllocation(
  countyTaxTotal: number,
  areas: { name: string; slug: string; color: string | null; centsPerDollar: number | null }[],
): StrategicAreaAllocation[] {
  const validAreas = areas.filter(a => a.centsPerDollar != null && a.centsPerDollar > 0)
  const totalCents = validAreas.reduce((sum, a) => sum + (a.centsPerDollar ?? 0), 0)

  if (totalCents === 0) {
    return validAreas.map(a => ({
      name: a.name,
      slug: a.slug,
      color: a.color,
      dollarAmount: 0,
      percentage: 0,
    }))
  }

  return validAreas.map(a => {
    const share = (a.centsPerDollar ?? 0) / totalCents
    return {
      name: a.name,
      slug: a.slug,
      color: a.color,
      dollarAmount: Math.round(share * countyTaxTotal * 100) / 100,
      percentage: share * 100,
    }
  })
}

/**
 * Sum all authority tax amounts.
 */
export function getTotalTax(breakdown: TaxByAuthority[]): number {
  return breakdown.reduce((sum, r) => sum + r.taxAmount, 0)
}

/**
 * Sum only county authority tax amounts.
 */
export function getCountyTotal(breakdown: TaxByAuthority[]): number {
  return breakdown.filter(r => r.isCounty).reduce((sum, r) => sum + r.taxAmount, 0)
}
