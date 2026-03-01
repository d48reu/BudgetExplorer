import { getStrategicAreasWithDetails, getCurrentFiscalYear } from '@/lib/db/queries'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { Treemap } from '@/components/charts/Treemap'
import { AreaCard } from '@/components/explorer/AreaCard'
import { formatDollarsAbbreviated, formatDollarsFull } from '@/lib/format'
import { toChartValue, formatPercentage } from '@/lib/chart-utils'
import type { Metadata } from 'next'
import type { TableColumn, SerializedStrategicArea } from '@/types/budget'

export const metadata: Metadata = {
  title: 'Budget Explorer',
  description:
    "Explore Miami-Dade County's budget with an interactive treemap showing how $13.2 billion is allocated across 9 strategic areas.",
}

export const dynamic = 'force-dynamic'

type AreaWithDetails = SerializedStrategicArea & {
  description: string | null
  departmentCount: number
}

const tableColumns: TableColumn<AreaWithDetails>[] = [
  {
    key: 'name',
    label: 'Strategic Area',
    align: 'left',
  },
  {
    key: 'operatingBudget',
    label: 'Operating Budget',
    align: 'right',
    format: (value) => formatDollarsAbbreviated(value as string),
  },
  {
    key: 'centsPerDollar',
    label: 'Cents per Dollar',
    align: 'right',
    format: (value) => (value != null ? `${value}` : 'N/A'),
  },
]

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

  // Table data with percentage column added
  const tableData = areas.map((area) => ({
    ...area,
    percentOfTotal: Number(totalBudget) > 0
      ? formatPercentage((toChartValue(area.operatingBudget) / toChartValue(totalBudget)) * 100)
      : '0.0%',
  }))

  const tableColumnsWithPercent: TableColumn<typeof tableData[0]>[] = [
    ...tableColumns as TableColumn<typeof tableData[0]>[],
    {
      key: 'percentOfTotal' as keyof typeof tableData[0] & string,
      label: '% of Total',
      align: 'right' as const,
    },
  ]

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
        <DataTableToggle
          chartLabel="Strategic area budget treemap"
          data={tableData}
          columns={tableColumnsWithPercent}
        >
          <ChartContainer minHeight={400}>
            {({ width, height }) => (
              <Treemap
                items={treemapItems}
                width={width}
                height={height}
                linkPrefix="/explorer/"
                ariaLabel="Strategic area budget treemap. Click any area to explore its departments."
              />
            )}
          </ChartContainer>
        </DataTableToggle>
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
