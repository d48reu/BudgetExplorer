'use client'

import { useMemo, useState } from 'react'
import { pie, arc } from 'd3-shape'
import { scaleOrdinal } from 'd3-scale'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'
import { formatPercentage } from '@/lib/chart-utils'

type RevenueItem = {
  name: string
  amount: string       // cents as string
  percentage: number | null
}

type DonutChartProps = {
  data: RevenueItem[]
  width: number
  height: number
}

/**
 * Revenue-specific color palette.
 * NOT strategic area colors -- these are for revenue sources only.
 * Property Tax maps to the first color (blue, dominant).
 */
const REVENUE_COLORS = [
  '#2563EB', // Property Tax (blue, dominant)
  '#7C3AED', // purple
  '#059669', // green
  '#D97706', // amber
  '#DC2626', // red
  '#0891B2', // cyan
  '#4B5563', // gray
]

/**
 * D3 donut/pie chart for revenue sources.
 * Shows 7 revenue categories with amounts and percentages.
 * Hover highlights a slice and shows details in center.
 */
export function DonutChart({ data, width, height }: DonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null)

  const chartSize = Math.min(width, height)
  const radius = chartSize / 2
  const innerRadius = radius * 0.55
  const outerRadius = radius
  const hoverOuterRadius = outerRadius + 6

  const colorScale = useMemo(
    () => scaleOrdinal<string, string>().domain(data.map(d => d.name)).range(REVENUE_COLORS),
    [data]
  )

  const arcs = useMemo(() => {
    const pieGenerator = pie<RevenueItem>()
      .value(d => toChartValue(d.amount))
      .sort(null) // preserve data order

    const arcGenerator = arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)

    const hoverArcGenerator = arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerRadius)
      .outerRadius(hoverOuterRadius)

    const pieData = pieGenerator(data)

    return pieData.map(d => ({
      name: d.data.name,
      amount: d.data.amount,
      percentage: d.data.percentage,
      path: arcGenerator(d) ?? '',
      hoverPath: hoverArcGenerator(d) ?? '',
      centroid: arcGenerator.centroid(d),
    }))
  }, [data, innerRadius, outerRadius, hoverOuterRadius])

  // Total revenue for center label when nothing is hovered
  const totalRevenue = useMemo(
    () => data.reduce((sum, d) => sum + toChartValue(d.amount), 0),
    [data]
  )

  // Determine center label content
  const hoveredItem = hoveredSlice
    ? data.find(d => d.name === hoveredSlice)
    : null

  return (
    <div>
      <svg
        width={width}
        height={chartSize}
        role="img"
        aria-label="Revenue sources donut chart"
        className="mx-auto"
      >
        <title>Revenue sources donut chart showing breakdown by category</title>
        <g transform={`translate(${width / 2}, ${chartSize / 2})`}>
          {/* Donut slices */}
          {arcs.map(a => {
            const isHovered = hoveredSlice === a.name
            const isDimmed = hoveredSlice !== null && !isHovered
            return (
              <path
                key={a.name}
                d={isHovered ? a.hoverPath : a.path}
                fill={colorScale(a.name)}
                stroke="#ffffff"
                strokeWidth={2}
                opacity={isDimmed ? 0.6 : 1}
                style={{ transition: 'opacity 150ms ease' }}
                onMouseEnter={() => setHoveredSlice(a.name)}
                onMouseLeave={() => setHoveredSlice(null)}
                role="presentation"
              />
            )
          })}

          {/* Center label */}
          {hoveredItem ? (
            <g className="pointer-events-none" textAnchor="middle">
              <text
                y={-16}
                className="fill-text-primary text-sm font-bold"
                dominantBaseline="central"
              >
                {hoveredItem.name}
              </text>
              <text
                y={4}
                className="fill-text-primary text-lg font-bold"
                dominantBaseline="central"
              >
                {formatDollarsAbbreviated(hoveredItem.amount)}
              </text>
              <text
                y={24}
                className="fill-text-secondary text-sm"
                dominantBaseline="central"
              >
                {hoveredItem.percentage != null
                  ? formatPercentage(hoveredItem.percentage)
                  : ''}
              </text>
            </g>
          ) : (
            <g className="pointer-events-none" textAnchor="middle">
              <text
                y={-8}
                className="fill-text-secondary text-sm"
                dominantBaseline="central"
              >
                Total Revenue
              </text>
              <text
                y={14}
                className="fill-text-primary text-lg font-bold"
                dominantBaseline="central"
              >
                {formatDollarsAbbreviated(totalRevenue)}
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {data.map(d => (
          <div
            key={d.name}
            className="flex items-center gap-2"
            onMouseEnter={() => setHoveredSlice(d.name)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: colorScale(d.name) }}
              aria-hidden="true"
            />
            <span className="text-text-primary truncate">{d.name}</span>
            <span className="text-text-secondary ml-auto">
              {d.percentage != null ? formatPercentage(d.percentage) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
