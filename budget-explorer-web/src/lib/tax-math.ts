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
 * A school district levy is excluded from the second homestead exemption tier.
 */
export function isSchoolLevy(authority: string): boolean {
  return /school/i.test(authority)
}

/**
 * Taxable value under the Florida homestead exemption (Fla. Stat. 196.031).
 * The first $25,000 applies to all taxing authorities. The second $25,000
 * applies only to non-school levies and phases in on the portion of assessed
 * value between $50,000 and $75,000.
 */
export function homesteadTaxableValue(
  assessedValue: number,
  schoolLevy: boolean,
): number {
  const firstExemption = Math.min(25_000, assessedValue)
  const secondExemption = schoolLevy
    ? 0
    : Math.min(25_000, Math.max(0, assessedValue - 50_000))
  return Math.max(0, assessedValue - firstExemption - secondExemption)
}

/**
 * Calculate tax breakdown by authority.
 * Formula: taxAmount = taxableValue * millageRate / 1000, rounded to nearest cent.
 * With homestead, each authority taxes its own taxable value because school
 * levies are exempt from the second exemption tier.
 */
export function calculateTaxBreakdown(
  assessedValue: number,
  homesteadExempt: boolean,
  rates: MillageRate[],
): TaxByAuthority[] {
  const results = rates.map(rate => {
    const taxableValue = homesteadExempt
      ? homesteadTaxableValue(assessedValue, isSchoolLevy(rate.authority))
      : assessedValue
    return {
      authority: rate.authority,
      millageRate: rate.millageRate,
      taxAmount: Math.round(taxableValue * rate.millageRate / 1000 * 100) / 100,
      percentage: 0,
      isCounty: rate.isCounty,
    }
  })

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
