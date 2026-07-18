import { getStrategicAreasWithDetails, getCurrentFiscalYear } from '@/lib/db/queries'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AreaCard } from '@/components/explorer/AreaCard'
import { ExplorerTreemap } from '@/components/explorer/ExplorerCharts'
import { formatDollarsFull } from '@/lib/format'
import { toChartValue } from '@/lib/chart-utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Budget Explorer',
  description:
    "Explore Miami-Dade County's budget with an interactive treemap showing how $13.2 billion is allocated across 9 strategic areas.",
}

// Static with daily revalidation; the underlying data changes only when
// the pipeline reseeds.
export const revalidate = 86400

export default async function ExplorerPage() {
  const [areas, fiscalYear] = await Promise.all([
    getStrategicAreasWithDetails(),
    getCurrentFiscalYear(),
  ])

  const totalBudget = areas
    .reduce((sum, a) => sum + toChartValue(a.operatingBudget), 0)
    .toString()

  // Sort by operating budget descending for mobile cards
  const sortedAreas = [...areas].sort(
    (a, b) => toChartValue(b.operatingBudget) - toChartValue(a.operatingBudget)
  )

  // Build treemap items
  const treemapItems = areas.map((area) => ({
    name: area.name,
    slug: area.slug,
    color: area.color,
    value: area.operatingBudget,
  }))

  return (
    <div className="px-(--spacing-page) py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Explorer' },
        ]}
      />

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-heading font-bold text-text-primary">
          Budget Explorer
        </h1>
        <p className="text-text-secondary mt-1">
          {fiscalYear?.label ?? 'FY 2025-26'} &middot;{' '}
          {formatDollarsFull(totalBudget)} total operating budget
        </p>
      </div>

      {/* Desktop: treemap with data table toggle */}
      <div className="hidden md:block">
        <ExplorerTreemap
          areas={areas}
          treemapItems={treemapItems}
          totalBudget={totalBudget}
        />
      </div>

      {/* Mobile: stacked cards sorted by budget */}
      <div className="md:hidden space-y-3">
        {sortedAreas.map((area) => (
          <AreaCard key={area.id} area={area} totalBudget={totalBudget} />
        ))}
      </div>
    </div>
  )
}
