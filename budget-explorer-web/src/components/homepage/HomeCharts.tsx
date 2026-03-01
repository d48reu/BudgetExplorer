'use client'

import { WaffleChart } from '@/components/charts/WaffleChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'
import type { TableColumn } from '@/types/budget'

// --- Waffle chart types & columns ---

type WaffleArea = {
  name: string
  slug: string
  color: string
  centsPerDollar: number
  operatingBudget: string
}

type WaffleTableRow = {
  name: string
  centsPerDollar: number
  operatingBudget: string
}

const waffleColumns: TableColumn<WaffleTableRow>[] = [
  { key: 'name', label: 'Strategic Area' },
  {
    key: 'centsPerDollar',
    label: 'Cents per Dollar',
    align: 'right',
    format: (v) => `${v as number}\u00A2`,
  },
  {
    key: 'operatingBudget',
    label: 'Operating Budget',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
]

// --- Revenue donut types & columns ---

type RevenueTableRow = {
  name: string
  amount: string
  percentage: number | null
}

const revenueColumns: TableColumn<RevenueTableRow>[] = [
  { key: 'name', label: 'Revenue Source' },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
  {
    key: 'percentage',
    label: 'Percentage',
    align: 'right',
    format: (v) => (v != null ? formatPercentage(v as number) : ''),
  },
]

// --- Exported components ---

export function WaffleSection({
  areas,
  fiscalYearLabel,
}: {
  areas: WaffleArea[]
  fiscalYearLabel: string | null
}) {
  const tableData: WaffleTableRow[] = areas.map((a) => ({
    name: a.name,
    centsPerDollar: a.centsPerDollar,
    operatingBudget: a.operatingBudget,
  }))

  return (
    <section
      aria-label="Where each dollar goes"
      className="py-(--spacing-section) px-4 max-w-4xl mx-auto"
    >
      <h2 className="text-2xl font-heading font-bold mb-2">
        Where Each Dollar Goes
      </h2>
      {fiscalYearLabel && (
        <p className="text-text-secondary mb-6">
          Of every dollar in the {fiscalYearLabel} budget...
        </p>
      )}
      {areas.length > 0 ? (
        <DataTableToggle
          chartLabel="Where each dollar goes"
          data={tableData}
          columns={waffleColumns}
        >
          <WaffleChart areas={areas} />
        </DataTableToggle>
      ) : (
        <p className="text-text-muted text-center py-8">
          Budget data loading...
        </p>
      )}
    </section>
  )
}

export function RevenueSection({
  data,
  fiscalYearLabel,
}: {
  data: RevenueTableRow[]
  fiscalYearLabel: string | null
}) {
  return (
    <section
      aria-label="Where the money comes from"
      className="py-(--spacing-section) px-4 max-w-4xl mx-auto"
    >
      <h2 className="text-2xl font-heading font-bold mb-2">
        Where the Money Comes From
      </h2>
      {fiscalYearLabel && (
        <p className="text-text-secondary mb-6">
          Revenue sources for {fiscalYearLabel}
        </p>
      )}
      {data.length > 0 ? (
        <DataTableToggle
          chartLabel="Revenue sources"
          data={data}
          columns={revenueColumns}
        >
          <ChartContainer aspectRatio={1} minHeight={300}>
            {({ width, height }) => (
              <DonutChart data={data} width={width} height={height} />
            )}
          </ChartContainer>
        </DataTableToggle>
      ) : (
        <p className="text-text-muted text-center py-8">
          Revenue data coming soon.
        </p>
      )}
    </section>
  )
}
