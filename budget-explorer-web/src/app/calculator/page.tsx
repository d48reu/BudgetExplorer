import { getMillageRates, getStrategicAreas } from '@/lib/db/queries'
import { TaxCalculator } from '@/components/calculator/TaxCalculator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Property Tax Estimate',
  description:
    'Estimate property taxes using Miami-Dade County FY 2025–26 millage rates.',
}

// Millage rates change once a year; the calculator itself is client-side.
export const revalidate = 86400

export default async function CalculatorPage() {
  const [rates, areas] = await Promise.all([
    getMillageRates(),
    getStrategicAreas(),
  ])

  return (
    <div className="px-(--spacing-page) py-6">
      <header className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-heading font-bold text-text-primary">
          Estimate property taxes
        </h1>
        <p className="mt-2 text-text-secondary">
          Enter a property’s assessed value to estimate taxes using FY 2025–26 millage rates.
        </p>
      </header>
      <TaxCalculator rates={rates} areas={areas} />
    </div>
  )
}
