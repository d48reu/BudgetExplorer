import { describe, it, expect } from 'vitest'
import {
  applyHomesteadExemption,
  calculateTaxBreakdown,
  calculateCountyAllocation,
  getTotalTax,
  getCountyTotal,
} from '@/lib/tax-math'

const sampleRates = [
  { authority: 'County General', millageRate: 4.574, isCounty: true, displayOrder: 1 },
  { authority: 'School Board', millageRate: 3.302, isCounty: false, displayOrder: 2 },
  { authority: "Children's Trust", millageRate: 0.466, isCounty: false, displayOrder: 3 },
]

const sampleAreas = [
  { name: 'Public Safety', slug: 'public-safety', color: '#0057B8', centsPerDollar: 30 },
  { name: 'Transportation', slug: 'transportation', color: '#00A651', centsPerDollar: 20 },
  { name: 'Health Care', slug: 'health-care', color: '#F7941D', centsPerDollar: 10 },
]

describe('applyHomesteadExemption', () => {
  it('reduces assessed value by $50,000', () => {
    expect(applyHomesteadExemption(300000)).toBe(250000)
  })

  it('returns 0 when assessed value is below $50,000', () => {
    expect(applyHomesteadExemption(40000)).toBe(0)
  })

  it('returns 0 for exactly $50,000', () => {
    expect(applyHomesteadExemption(50000)).toBe(0)
  })

  it('handles 0 assessed value', () => {
    expect(applyHomesteadExemption(0)).toBe(0)
  })
})

describe('calculateTaxBreakdown', () => {
  it('calculates correct tax amounts without homestead', () => {
    const result = calculateTaxBreakdown(300000, false, sampleRates)
    expect(result).toHaveLength(3)

    // County General: 300000 * 4.574 / 1000 = 1372.20
    expect(result[0].taxAmount).toBeCloseTo(1372.20, 2)
    // School Board: 300000 * 3.302 / 1000 = 990.60
    expect(result[1].taxAmount).toBeCloseTo(990.60, 2)
    // Children's Trust: 300000 * 0.466 / 1000 = 139.80
    expect(result[2].taxAmount).toBeCloseTo(139.80, 2)
  })

  it('applies homestead exemption reducing taxable value by $50K', () => {
    const result = calculateTaxBreakdown(300000, true, sampleRates)
    // Taxable value: 250000
    // County General: 250000 * 4.574 / 1000 = 1143.50
    expect(result[0].taxAmount).toBeCloseTo(1143.50, 2)
    // School Board: 250000 * 3.302 / 1000 = 825.50
    expect(result[1].taxAmount).toBeCloseTo(825.50, 2)
    // Children's Trust: 250000 * 0.466 / 1000 = 116.50
    expect(result[2].taxAmount).toBeCloseTo(116.50, 2)
  })

  it('returns percentages that sum to approximately 100%', () => {
    const result = calculateTaxBreakdown(300000, false, sampleRates)
    const totalPct = result.reduce((sum, r) => sum + r.percentage, 0)
    expect(totalPct).toBeCloseTo(100, 1)
  })

  it('rounds tax amounts to nearest cent (2 decimal places)', () => {
    const result = calculateTaxBreakdown(300000, false, sampleRates)
    for (const r of result) {
      // Check that taxAmount has at most 2 decimal places
      // Use toBeCloseTo to avoid IEEE 754 floating-point noise
      const rounded = Math.round(r.taxAmount * 100) / 100
      expect(r.taxAmount).toBeCloseTo(rounded, 10)
    }
  })

  it('preserves authority metadata', () => {
    const result = calculateTaxBreakdown(300000, false, sampleRates)
    expect(result[0].authority).toBe('County General')
    expect(result[0].isCounty).toBe(true)
    expect(result[1].authority).toBe('School Board')
    expect(result[1].isCounty).toBe(false)
  })

  it('handles zero assessed value', () => {
    const result = calculateTaxBreakdown(0, false, sampleRates)
    for (const r of result) {
      expect(r.taxAmount).toBe(0)
      expect(r.percentage).toBe(0)
    }
  })
})

describe('calculateCountyAllocation', () => {
  it('splits county tax total by centsPerDollar proportions', () => {
    // Total cents: 30 + 20 + 10 = 60
    // Public Safety: (30/60) * 1200 = 600
    // Transportation: (20/60) * 1200 = 400
    // Health Care: (10/60) * 1200 = 200
    const result = calculateCountyAllocation(1200, sampleAreas)
    expect(result).toHaveLength(3)
    expect(result[0].dollarAmount).toBeCloseTo(600, 2)
    expect(result[1].dollarAmount).toBeCloseTo(400, 2)
    expect(result[2].dollarAmount).toBeCloseTo(200, 2)
  })

  it('returns correct percentages', () => {
    const result = calculateCountyAllocation(1200, sampleAreas)
    expect(result[0].percentage).toBeCloseTo(50, 1)
    expect(result[1].percentage).toBeCloseTo(33.33, 1)
    expect(result[2].percentage).toBeCloseTo(16.67, 1)
  })

  it('preserves area metadata', () => {
    const result = calculateCountyAllocation(1200, sampleAreas)
    expect(result[0].name).toBe('Public Safety')
    expect(result[0].slug).toBe('public-safety')
    expect(result[0].color).toBe('#0057B8')
  })

  it('handles null centsPerDollar by excluding that area', () => {
    const areasWithNull = [
      ...sampleAreas,
      { name: 'Unknown', slug: 'unknown', color: null, centsPerDollar: null },
    ]
    const result = calculateCountyAllocation(1200, areasWithNull)
    // Should still split among the 3 valid areas
    const totalAlloc = result.reduce((s, r) => s + r.dollarAmount, 0)
    expect(totalAlloc).toBeCloseTo(1200, 2)
  })
})

describe('getTotalTax', () => {
  it('sums all authority tax amounts', () => {
    const breakdown = calculateTaxBreakdown(300000, false, sampleRates)
    const total = getTotalTax(breakdown)
    // 1372.20 + 990.60 + 139.80 = 2502.60
    expect(total).toBeCloseTo(2502.60, 2)
  })
})

describe('getCountyTotal', () => {
  it('sums only county authority tax amounts', () => {
    const breakdown = calculateTaxBreakdown(300000, false, sampleRates)
    const countyTotal = getCountyTotal(breakdown)
    // Only County General: 1372.20
    expect(countyTotal).toBeCloseTo(1372.20, 2)
  })
})
