'use client'

import { useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'
import type { SerializedYoYData, TableColumn } from '@/types/budget'

type YearOverYearChartProps = {
  data: SerializedYoYData[]
  areaColor: string
}

/** Table column definitions for the accessible data table fallback. */
const tableColumns: TableColumn<SerializedYoYData>[] = [
  { key: 'fiscalYear', label: 'Fiscal Year', align: 'left' },
  {
    key: 'totalBudget',
    label: 'Total Budget',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
  {
    key: 'operatingBudget',
    label: 'Operating',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
  {
    key: 'capitalBudget',
    label: 'Capital',
    align: 'right',
    format: (v) => formatDollarsAbbreviated(v as string),
  },
]

/** Color for the percentage change badge based on direction. */
function badgeColor(direction: 'increase' | 'decrease' | 'unchanged'): string {
  if (direction === 'increase') return '#0057B8'
  if (direction === 'decrease') return '#F7941D'
  return '#6B7280'
}

type InnerChartProps = {
  data: SerializedYoYData[]
  areaColor: string
  width: number
  height: number
}

function InnerChart({ data, areaColor, width, height }: InnerChartProps) {
  const margin = { top: 30, right: 20, bottom: 40, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const { xScale, yScale, ticks } = useMemo(() => {
    const amounts = data.map((d) => toChartValue(d.totalBudget))
    const max = Math.max(...amounts, 1)

    const x = scaleBand()
      .domain(data.map((d) => d.fiscalYear))
      .range([0, innerWidth])
      .padding(0.3)

    const y = scaleLinear().domain([0, max]).nice().range([innerHeight, 0])

    return { xScale: x, yScale: y, ticks: y.ticks(4) }
  }, [data, innerWidth, innerHeight])

  // Find current and prior year for percentage badge
  const currentEntry = data.find((d) => d.isCurrent)
  const currentIndex = data.findIndex((d) => d.isCurrent)
  const priorEntry = currentIndex > 0 ? data[currentIndex - 1] : null

  const yoyChange =
    currentEntry && priorEntry
      ? formatYoYChange(currentEntry.totalBudget, priorEntry.totalBudget)
      : null

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Year-over-year budget comparison"
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Horizontal grid lines */}
        {ticks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={0}
            x2={innerWidth}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke="#E5E7EB"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
        {ticks.map((tick) => (
          <text
            key={`y-${tick}`}
            x={-12}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="central"
            className="fill-text-secondary text-xs"
          >
            {formatDollarsAbbreviated(tick * 100)}
          </text>
        ))}

        {/* Bars */}
        {data.map((d) => {
          const amount = toChartValue(d.totalBudget)
          const barX = xScale(d.fiscalYear) ?? 0
          const barY = yScale(amount)
          const barHeight = innerHeight - barY

          return (
            <g key={d.fiscalYear}>
              <rect
                x={barX}
                y={barY}
                width={xScale.bandwidth()}
                height={barHeight}
                fill={d.isCurrent ? areaColor : '#D1D5DB'}
                rx={2}
              />

              {/* Value label above bar */}
              <text
                x={barX + xScale.bandwidth() / 2}
                y={barY - 8}
                textAnchor="middle"
                className="fill-text-primary text-xs font-medium"
              >
                {formatDollarsAbbreviated(d.totalBudget)}
              </text>

              {/* X-axis label below bar */}
              <text
                x={barX + xScale.bandwidth() / 2}
                y={innerHeight + 24}
                textAnchor="middle"
                className="fill-text-secondary text-xs"
              >
                {d.fiscalYear}
              </text>
            </g>
          )
        })}

        {/* Percentage change badge on current year */}
        {yoyChange && currentEntry && (() => {
          const cx = (xScale(currentEntry.fiscalYear) ?? 0) + xScale.bandwidth() / 2
          const currentAmount = toChartValue(currentEntry.totalBudget)
          const badgeY = yScale(currentAmount) - 28
          const labelWidth = yoyChange.value.length * 7 + 12

          return (
            <g>
              <rect
                x={cx - labelWidth / 2}
                y={badgeY - 10}
                width={labelWidth}
                height={20}
                rx={4}
                fill={badgeColor(yoyChange.direction)}
              />
              <text
                x={cx}
                y={badgeY + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                className="text-xs font-medium"
              >
                {yoyChange.value}
              </text>
            </g>
          )
        })()}
      </g>
    </svg>
  )
}

/**
 * Year-over-year budget comparison as vertical bar chart.
 * Shows up to 5 fiscal years with the current year highlighted
 * using the department's strategic area color and a percentage
 * change badge. Prior years are neutral gray. Wrapped in
 * DataTableToggle for accessibility.
 */
export function YearOverYearChart({ data, areaColor }: YearOverYearChartProps) {
  if (data.length === 0) return null

  return (
    <div>
      <DataTableToggle
        chartLabel="Year-over-year budget chart"
        data={data}
        columns={tableColumns}
      >
        <ChartContainer minHeight={320}>
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
      {data.length < 5 && (
        <p className="text-xs text-text-tertiary mt-2">
          Data available from {data[0].fiscalYear}
        </p>
      )}
    </div>
  )
}
