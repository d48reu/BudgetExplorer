'use client'

import { useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import type { SerializedExpenditure, TableColumn } from '@/types/budget'

type ExpenditureBreakdownProps = {
  data: SerializedExpenditure[]
  areaColor: string
}

/** Table column definitions for the accessible data table fallback. */
const tableColumns: TableColumn<SerializedExpenditure>[] = [
  { key: 'categoryName', label: 'Category', align: 'left' },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
  {
    key: 'percentage',
    label: 'Share',
    align: 'right',
    format: (v) => formatPercentage(v as number),
  },
]

type InnerChartProps = {
  data: SerializedExpenditure[]
  areaColor: string
  width: number
  height: number
}

function InnerChart({ data, areaColor, width, height }: InnerChartProps) {
  const margin = { top: 10, right: 20, bottom: 20, left: 160 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const { yScale, xScale, maxAmount } = useMemo(() => {
    const amounts = data.map((d) => toChartValue(d.amount))
    const max = Math.max(...amounts, 1)

    const y = scaleBand()
      .domain(data.map((d) => d.categoryName))
      .range([0, innerHeight])
      .padding(0.25)

    const x = scaleLinear().domain([0, max]).nice().range([0, innerWidth])

    return { yScale: y, xScale: x, maxAmount: max }
  }, [data, innerWidth, innerHeight])

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Expenditure category breakdown"
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {data.map((d) => {
          const amount = toChartValue(d.amount)
          const opacity = 0.4 + 0.6 * (amount / maxAmount)
          const barWidth = Math.max(xScale(amount), 4)
          const yPos = yScale(d.categoryName) ?? 0

          return (
            <g key={d.categoryName}>
              {/* Horizontal bar */}
              <rect
                x={0}
                y={yPos}
                width={barWidth}
                height={yScale.bandwidth()}
                fill={areaColor}
                opacity={opacity}
                rx={2}
              />
              {/* Category name label (left of bar) */}
              <text
                x={-8}
                y={yPos + yScale.bandwidth() / 2}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-text-primary text-xs"
              >
                {d.categoryName}
              </text>
              {/* Value label (right of bar) */}
              <text
                x={barWidth + 8}
                y={yPos + yScale.bandwidth() / 2}
                textAnchor="start"
                dominantBaseline="central"
                className="fill-text-secondary text-xs"
              >
                {formatDollarsAbbreviated(d.amount)} ({formatPercentage(d.percentage)})
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

/**
 * Expenditure category breakdown as horizontal bar chart.
 * Bars are ranked by amount (largest at top) with opacity gradient
 * using the department's strategic area color. Minimum 4px bar width
 * for categories under 1%. Wrapped in DataTableToggle for accessibility.
 */
export function ExpenditureBreakdown({ data, areaColor }: ExpenditureBreakdownProps) {
  const chartHeight = Math.max(300, data.length * 44)

  return (
    <DataTableToggle
      chartLabel="Expenditure breakdown chart"
      data={data}
      columns={tableColumns}
    >
      <ChartContainer minHeight={chartHeight}>
        {({ width, height }) => (
          <InnerChart
            data={data}
            areaColor={areaColor}
            width={width}
            height={height}
          />
        )}
      </ChartContainer>
    </DataTableToggle>
  )
}
