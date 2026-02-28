import { getCurrentFiscalYear } from '@/lib/db/queries'
import { formatDollarsFull } from '@/lib/format'

// This page queries the database at request time
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const fiscalYear = await getCurrentFiscalYear()

  return (
    <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">
        Miami-Dade County {fiscalYear?.label ?? 'FY 2025-26'} Total Budget
      </p>
      <h1 className="text-5xl md:text-7xl font-heading font-bold text-gray-900">
        {formatDollarsFull(fiscalYear?.totalBudget ?? '0')}
      </h1>
      <p className="mt-4 text-lg text-gray-600 max-w-2xl">
        See where your money goes. Explore Miami-Dade County&apos;s budget from
        the total down to individual departments.
      </p>
    </section>
  )
}
