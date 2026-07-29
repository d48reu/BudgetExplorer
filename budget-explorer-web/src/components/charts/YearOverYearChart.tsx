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
    key: 'stage',
    label: 'Figure type',
    align: 'left',
    format: (v) => v === 'actual' ? 'Actual spending' : 'Adopted budget',
  },
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
  if (direction === 'increase') return 'var(--color-change-increase)'
  if (direction === 'decrease') return 'var(--color-change-decrease)'
  return 'var(--color-text-secondary)'
}

type InnerChartProps = {
  data: SerializedYoYData[]
  areaColor: string
  width: number
  height: number
}

function InnerChart({ data, areaColor, width, height }: InnerChartProps) {
  const isCompact = width < 560
  const margin = isCompact
    ? { top: 30, right: 8, bottom: 60, left: 55 }
    : { top: 30, right: 20, bottom: 60, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const { xScale, yScale, ticks } = useMemo(() => {
    const amounts = data.map((d) => toChartValue(d.totalBudget))
    const max = Math.max(...amounts, 1)

    const x = scaleBand()
      .domain(data.map((d) => d.fiscalYear))
      .range([0, innerWidth])
      .padding(isCompact ? 0.18 : 0.3)

    const y = scaleLinear().domain([0, max]).nice().range([innerHeight, 0])

    return { xScale: x, yScale: y, ticks: y.ticks(4) }
  }, [data, innerWidth, innerHeight, isCompact])

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
      aria-label="Department budget history with every year labeled as actual spending or an adopted budget"
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
            stroke="var(--color-border)"
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
            {formatDollarsAbbreviated(tick)}
          </text>
        ))}

        {/* Bars */}
        {data.map((d) => {
          const amount = toChartValue(d.totalBudget)
          const barX = xScale(d.fiscalYear) ?? 0
          const barY = yScale(amount)
          const barHeight = innerHeight - barY
          const stageLabel = d.stage === 'actual' ? 'ACTUAL' : 'ADOPTED'
          const fiscalYearLabel = isCompact
            ? d.fiscalYear.replace(/^FY 20(\d{2})-(\d{2})$/, '$1–$2')
            : d.fiscalYear

          return (
            <g key={d.fiscalYear}>
              <rect
                x={barX}
                y={barY}
                width={xScale.bandwidth()}
                height={barHeight}
                fill={d.stage === 'actual' ? 'var(--color-text-primary)' : areaColor}
                fillOpacity={d.isCurrent ? 1 : 0.78}
                rx={2}
              />

              {/* Value label above bar */}
              <text
                x={barX + xScale.bandwidth() / 2}
                y={barY - 8}
                textAnchor="middle"
                className="fill-text-primary font-medium"
                fontSize={isCompact ? 9 : 12}
              >
                {formatDollarsAbbreviated(d.totalBudget)}
              </text>

              {/* X-axis label below bar */}
              <text
                x={barX + xScale.bandwidth() / 2}
                y={innerHeight + 24}
                textAnchor="middle"
                className="fill-text-secondary"
                fontSize={isCompact ? 10 : 12}
              >
                {fiscalYearLabel}
              </text>
              <text
                x={barX + xScale.bandwidth() / 2}
                y={innerHeight + 43}
                textAnchor="middle"
                fill={d.stage === 'actual' ? 'var(--color-text-primary)' : areaColor}
                fontSize={isCompact ? 7.5 : 9}
                fontWeight={700}
                letterSpacing={isCompact ? '0.03em' : '0.08em'}
              >
                {stageLabel}
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
                fill="var(--color-surface)"
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
 * Shows up to 5 fiscal years with actual spending in dark neutral
 * and adopted budgets in the department's strategic-area color.
 * Every bar and table row carries its figure type. The current year
 * also receives a percentage-change badge. Wrapped in DataTableToggle
 * for accessibility.
 */
export function YearOverYearChart({ data, areaColor }: YearOverYearChartProps) {
  if (data.length === 0) return null

  return (
    <div>
      <div
        className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-text-primary py-3 text-xs font-bold uppercase tracking-[0.12em]"
        aria-label="Figure types"
      >
        <span className="inline-flex items-center gap-2 text-text-primary">
          <span className="h-3 w-3 bg-text-primary" aria-hidden="true" />
          Actual spending
        </span>
        <span className="inline-flex items-center gap-2" style={{ color: areaColor }}>
          <span className="h-3 w-3" style={{ backgroundColor: areaColor }} aria-hidden="true" />
          Adopted budget
        </span>
      </div>
      <DataTableToggle
        chartLabel="Year-over-year budget chart"
        data={data}
        columns={tableColumns}
        rowKey="fiscalYear"
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
