'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDollarsAbbreviated } from '@/lib/format'

type WaffleArea = {
  name: string
  slug: string
  color: string
  centsPerDollar: number
  operatingBudget: string   // cents as string
}

type WaffleSquare = {
  name: string
  slug: string
  color: string
  centsPerDollar: number
  operatingBudget: string
}

type WaffleChartProps = {
  areas: WaffleArea[]
}

/**
 * 10x10 CSS Grid waffle chart for penny visualization.
 * Shows how each dollar is split by strategic area.
 *
 * Rounding correction: if total cents != 100, the difference is
 * added to or subtracted from the largest area to ensure exactly
 * 100 squares are rendered.
 */
export function WaffleChart({ areas }: WaffleChartProps) {
  const router = useRouter()
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)

  const squares = useMemo(() => {
    if (areas.length === 0) return []

    // Copy areas to avoid mutating props
    const adjusted = areas.map(a => ({ ...a }))

    // Calculate total cents
    const total = adjusted.reduce((sum, a) => sum + a.centsPerDollar, 0)

    // Rounding correction: adjust the largest area so total is exactly 100
    if (total !== 100) {
      const largestIdx = adjusted.reduce(
        (maxIdx, a, i) => (a.centsPerDollar > adjusted[maxIdx].centsPerDollar ? i : maxIdx),
        0
      )
      adjusted[largestIdx] = {
        ...adjusted[largestIdx],
        centsPerDollar: adjusted[largestIdx].centsPerDollar + (100 - total),
      }
    }

    // Build 100 squares: N copies per area based on centsPerDollar
    const result: WaffleSquare[] = []
    for (const area of adjusted) {
      for (let i = 0; i < area.centsPerDollar; i++) {
        result.push({
          name: area.name,
          slug: area.slug,
          color: area.color,
          centsPerDollar: area.centsPerDollar,
          operatingBudget: area.operatingBudget,
        })
      }
    }

    return result
  }, [areas])

  // Tooltip content for hovered area
  const hoveredInfo = hoveredArea
    ? areas.find(a => a.name === hoveredArea)
    : null

  return (
    <div>
      {/* Tooltip display above the grid */}
      <div
        className="h-12 mb-2 flex items-center justify-center text-sm"
        aria-live="polite"
      >
        {hoveredInfo ? (
          <div className="text-center">
            <span className="font-bold text-text-primary">{hoveredInfo.name}</span>
            <span className="text-text-secondary mx-2">
              {hoveredInfo.centsPerDollar}&#162; per dollar
            </span>
            <span className="text-text-secondary">
              ({formatDollarsAbbreviated(hoveredInfo.operatingBudget)})
            </span>
          </div>
        ) : (
          <span className="text-text-muted">Hover over a square to see details</span>
        )}
      </div>

      {/* 10x10 Grid */}
      <div
        className="grid grid-cols-10 gap-1 mx-auto"
        style={{ maxWidth: 'fit-content' }}
        role="img"
        aria-label="Where each dollar goes: penny allocation by strategic area"
      >
        {squares.map((sq, i) => {
          const isDimmed = hoveredArea !== null && hoveredArea !== sq.name
          return (
            <button
              key={i}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm border-0 cursor-pointer"
              style={{
                backgroundColor: sq.color,
                opacity: isDimmed ? 0.3 : 1,
                transition: 'opacity 150ms ease',
              }}
              aria-label={`${sq.name}: ${sq.centsPerDollar} cents`}
              onMouseEnter={() => setHoveredArea(sq.name)}
              onMouseLeave={() => setHoveredArea(null)}
              onClick={() => router.push(`/explorer/${sq.slug}`)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm list-none p-0">
        {areas.map(a => (
          <li
            key={a.slug}
            className="flex items-center gap-2"
            onMouseEnter={() => setHoveredArea(a.name)}
            onMouseLeave={() => setHoveredArea(null)}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: a.color }}
              aria-hidden="true"
            />
            <span className="text-text-primary truncate">{a.name}</span>
            <span className="text-text-secondary ml-auto">
              {a.centsPerDollar}&#162;
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
