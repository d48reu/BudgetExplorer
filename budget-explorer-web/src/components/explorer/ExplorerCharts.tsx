'use client'

import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import { Treemap } from '@/components/charts/Treemap'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'
import type { TableColumn, SerializedStrategicArea, SerializedDepartment } from '@/types/budget'

// --- Explorer overview page ---

type AreaWithDetails = SerializedStrategicArea & {
  description: string | null
  departmentCount: number
}

type AreaTableRow = AreaWithDetails & {
  percentOfTotal: string
}

const areaColumns: TableColumn<AreaTableRow>[] = [
  { key: 'name', label: 'Strategic Area', align: 'left' },
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
  {
    key: 'percentOfTotal',
    label: '% of Total',
    align: 'right',
  },
]

type TreemapItem = {
  name: string
  slug: string
  color: string | null
  value: string
}

export function ExplorerTreemap({
  areas,
  treemapItems,
  totalBudget,
}: {
  areas: AreaWithDetails[]
  treemapItems: TreemapItem[]
  totalBudget: string
}) {
  const tableData: AreaTableRow[] = areas.map((area) => ({
    ...area,
    percentOfTotal:
      Number(totalBudget) > 0
        ? formatPercentage(
            (Number(area.operatingBudget) / 100 / (Number(totalBudget) / 100)) * 100
          )
        : '0.0%',
  }))

  return (
    <DataTableToggle
      chartLabel="Strategic area budget treemap"
      data={tableData}
      columns={areaColumns}
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
  )
}

// --- Area detail page ---

const deptColumns: TableColumn<SerializedDepartment>[] = [
  { key: 'name', label: 'Department', align: 'left' },
  {
    key: 'operatingBudget',
    label: 'Operating Budget',
    align: 'right',
    format: (value) => formatDollarsAbbreviated(value as string),
  },
  {
    key: 'employeeCount',
    label: 'Employees',
    align: 'right',
    format: (value) => (value != null ? Number(value).toLocaleString() : 'N/A'),
  },
]

export function AreaDeptTreemap({
  areaName,
  departments,
  treemapItems,
}: {
  areaName: string
  departments: SerializedDepartment[]
  treemapItems: TreemapItem[]
}) {
  return (
    <DataTableToggle
      chartLabel={`${areaName} department budget treemap`}
      data={departments}
      columns={deptColumns}
    >
      <ChartContainer minHeight={350}>
        {({ width, height }) => (
          <Treemap
            items={treemapItems}
            width={width}
            height={height}
            linkPrefix="/department/"
            ariaLabel={`Department budget treemap for ${areaName}. Click any department to view details.`}
          />
        )}
      </ChartContainer>
    </DataTableToggle>
  )
}
