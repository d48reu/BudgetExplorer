'use client'

import { DonutChart } from '@/components/charts/DonutChart'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'
import type { TableColumn } from '@/types/budget'

type RevenueTableRow = {
  name: string
  amount: string
  percentage: number | null
}

const revenueColumns: TableColumn<RevenueTableRow>[] = [
  { key: 'name', label: 'Revenue source' },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    format: (value) => formatDollarsAbbreviated(value as string),
  },
  {
    key: 'percentage',
    label: 'Share',
    align: 'right',
    format: (value) => (value != null ? formatPercentage(value as number) : ''),
  },
]

type RevenueVisualizationProps = {
  data: RevenueTableRow[]
}

export function RevenueVisualization({ data }: RevenueVisualizationProps) {
  if (data.length === 0) {
    return <p className="py-8 text-text-muted">Revenue data is not available.</p>
  }

  return (
    <DataTableToggle
      chartLabel="Revenue sources"
      data={data}
      columns={revenueColumns}
      rowKey="name"
    >
      <div className="border-y-2 border-text-primary py-6">
        <ChartContainer aspectRatio={1.35} minHeight={320}>
          {({ width, height }) => (
            <DonutChart data={data} width={width} height={height} />
          )}
        </ChartContainer>
      </div>
    </DataTableToggle>
  )
}
