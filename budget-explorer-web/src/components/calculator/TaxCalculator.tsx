'use client'

import { useState, useMemo } from 'react'
import type { SerializedMillageRate, SerializedStrategicArea } from '@/types/budget'
import {
  calculateTaxBreakdown,
  calculateCountyAllocation,
  getTotalTax,
  getCountyTotal,
} from '@/lib/tax-math'
import { PropertyValueInput } from '@/components/calculator/PropertyValueInput'
import { TaxSummaryHero } from '@/components/calculator/TaxSummaryHero'
import { AuthorityBreakdown } from '@/components/calculator/AuthorityBreakdown'
import { CountyDrillDown } from '@/components/calculator/CountyDrillDown'

type TaxCalculatorProps = {
  rates: SerializedMillageRate[]
  areas: SerializedStrategicArea[]
}

/**
 * Main client orchestrator for the tax calculator page.
 * Receives server-fetched data as props, manages input state,
 * and derives all tax calculations via useMemo.
 */
export function TaxCalculator({ rates, areas }: TaxCalculatorProps) {
  const [assessedValue, setAssessedValue] = useState<number>(0)
  const [homesteadExempt, setHomesteadExempt] = useState(false)

  // Convert SerializedMillageRate to MillageRate for tax-math functions
  const millageRates = useMemo(
    () =>
      rates.map((r) => ({
        authority: r.authority,
        millageRate: r.millageRate,
        isCounty: r.isCounty,
        displayOrder: r.displayOrder,
      })),
    [rates]
  )

  // Derive all tax calculations from the two state values
  const breakdown = useMemo(
    () => calculateTaxBreakdown(assessedValue, homesteadExempt, millageRates),
    [assessedValue, homesteadExempt, millageRates]
  )

  const totalTax = useMemo(() => getTotalTax(breakdown), [breakdown])
  const countyTotal = useMemo(() => getCountyTotal(breakdown), [breakdown])
  const monthlyEquivalent = totalTax / 12

  const countyAllocation = useMemo(
    () =>
      calculateCountyAllocation(
        countyTotal,
        areas.map((a) => ({
          name: a.name,
          slug: a.slug,
          color: a.color,
          centsPerDollar: a.centsPerDollar,
        }))
      ),
    [countyTotal, areas]
  )

  const hasValue = assessedValue > 0

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      {/* Input panel -- sticky on desktop */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
          <PropertyValueInput value={assessedValue} onChange={setAssessedValue} />

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={homesteadExempt}
              onChange={(e) => setHomesteadExempt(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-strong accent-mdc-blue"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">
                Homestead Exemption
              </span>
              <p className="text-text-muted text-xs mt-0.5">
                Florida homestead exemption reduces taxable value by up to
                $50,000 for primary residences ($25,000 for school taxes)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Results panel */}
      <div>
        {hasValue ? (
          <>
            <TaxSummaryHero
              totalTax={totalTax}
              monthlyEquivalent={monthlyEquivalent}
            />

            {/* Authority breakdown */}
            <section className="mt-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Tax Breakdown by Authority
              </h2>
              <AuthorityBreakdown breakdown={breakdown} totalTax={totalTax} />
            </section>

            {/* County drill-down */}
            <section className="mt-6">
              <CountyDrillDown
                allocations={countyAllocation}
                countyTotal={countyTotal}
              />
            </section>

            <p className="text-text-muted text-xs mt-8">
              This is an estimate based on FY 2025-26 millage rates. Actual
              taxes may vary based on municipality and special taxing districts.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <span className="text-2xl text-text-muted" aria-hidden="true">
                $
              </span>
            </div>
            <p className="text-text-secondary text-lg">
              Enter your property&apos;s assessed value to see your tax breakdown.
            </p>
            <p className="text-text-muted text-sm mt-1">
              Choose a preset or type a custom amount.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
