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
      <h3 className="text-lg font-semibold text-text-primary">
        Your County Tax: Where It Goes
      </h3>

      <p className="text-lg font-semibold text-text-secondary">
        {dollarFormatter.format(countyTotal)} of your taxes go to Miami-Dade County
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
            <div className="flex-1 h-4 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
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
