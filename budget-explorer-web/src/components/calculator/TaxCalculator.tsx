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
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-14">
      {/* Input panel -- sticky on desktop */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-6 border-t-4 border-text-primary bg-white/55 p-5">
          <PropertyValueInput value={assessedValue} onChange={setAssessedValue} />

          <label className="flex cursor-pointer items-start gap-3 border-t border-text-primary pt-5">
            <input
              type="checkbox"
              checked={homesteadExempt}
              onChange={(e) => setHomesteadExempt(e.target.checked)}
              className="mt-0.5 h-4 w-4 border-text-primary accent-mdc-blue"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">
                Homestead exemption
              </span>
              <p className="text-text-muted text-xs mt-0.5">
                Florida homestead exemption reduces taxable value by up to
                $50,000 for a primary residence. The school-tax exemption is $25,000.
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
            <section className="mt-10 border-t-2 border-text-primary pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
                By taxing authority
              </p>
              <h2 className="mb-5 mt-2 font-heading text-2xl font-bold text-text-primary">
                Estimated tax by authority
              </h2>
              <AuthorityBreakdown breakdown={breakdown} totalTax={totalTax} />
            </section>

            {/* County drill-down */}
            <section className="mt-10 border-t-2 border-text-primary pt-5">
              <CountyDrillDown
                allocations={countyAllocation}
                countyTotal={countyTotal}
              />
            </section>

            <p className="mt-8 border-t border-text-primary pt-4 text-xs leading-5 text-text-secondary">
              Estimate based on FY 2025–26 millage rates. The final bill may
              include municipal and special-district taxes not shown here.
            </p>
          </>
        ) : (
          <div className="border-y-2 border-text-primary py-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
              Waiting for a value
            </p>
            <p className="mt-3 font-heading text-2xl font-bold text-text-primary">
              Enter the property&apos;s assessed value.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Choose a common value or type an exact amount.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
