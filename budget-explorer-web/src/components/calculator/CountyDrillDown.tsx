'use client'

import { useMemo } from 'react'
import type { StrategicAreaAllocation } from '@/lib/tax-math'

type CountyDrillDownProps = {
  allocations: StrategicAreaAllocation[]
  countyTotal: number
}

const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

/**
 * Fallback color for strategic areas without a defined color.
 */
const FALLBACK_COLOR = '#6B7280'

/**
 * County drill-down section: shows how the county tax portion is allocated
 * across strategic areas with inline CSS percentage bars.
 */
export function CountyDrillDown({ allocations, countyTotal }: CountyDrillDownProps) {
  // Sort by dollarAmount descending (largest first)
  const sorted = useMemo(
    () => [...allocations].sort((a, b) => b.dollarAmount - a.dollarAmount),
    [allocations]
  )

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
        County allocation
      </p>
      <h3 className="font-heading text-2xl font-bold text-text-primary">
        County portion by strategic area
      </h3>

      <p className="text-base text-text-secondary">
        {dollarFormatter.format(countyTotal)} of this estimate is levied by Miami-Dade County.
      </p>

      {/* Strategic area list with inline percentage bars */}
      <div className="space-y-1">
        {sorted.map((area) => (
          <div
            key={area.slug}
            className="flex items-center gap-3 py-2"
          >
            <span className="w-36 sm:w-48 text-sm text-text-primary truncate shrink-0">
              {area.name}
            </span>
            <div className="h-4 flex-1 overflow-hidden border border-text-primary/15 bg-white">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.max(area.percentage, 1)}%`,
                  backgroundColor: area.color ?? FALLBACK_COLOR,
                }}
              />
            </div>
            <span className="w-16 sm:w-20 text-sm text-right text-text-secondary tabular-nums shrink-0">
              {dollarFormatter.format(area.dollarAmount)}
            </span>
            <span className="w-12 text-sm text-right text-text-muted tabular-nums shrink-0">
              {area.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
