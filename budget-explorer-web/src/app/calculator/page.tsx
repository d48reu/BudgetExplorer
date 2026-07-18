import { getMillageRates, getStrategicAreas } from '@/lib/db/queries'
import { TaxCalculator } from '@/components/calculator/TaxCalculator'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tax Calculator',
  description:
    'See how your property taxes fund Miami-Dade County services.',
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
      <h1 className="text-2xl font-heading font-bold text-text-primary mb-6">
        Property Tax Calculator
      </h1>
      <TaxCalculator rates={rates} areas={areas} />
    </div>
  )
}
