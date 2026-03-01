'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedStrategicArea } from '@/types/budget'

type AreaCardProps = {
  area: SerializedStrategicArea & { description: string | null; departmentCount: number }
  totalBudget: string // total operating budget of all areas, cents as string
}

/**
 * Mobile fallback card for the explorer page.
 * Displays area name, color indicator, operating budget, and percentage of total.
 * Tapping navigates to the area detail page.
 * Sorting by budget size is done in the parent page, not here.
 */
export function AreaCard({ area, totalBudget }: AreaCardProps) {
  const percentage = Number(totalBudget) > 0
    ? ((Number(area.operatingBudget) / Number(totalBudget)) * 100).toFixed(1)
    : '0.0'

  return (
    <Link href={`/explorer/${area.slug}`} className="block">
      <Card className="hover:border-mdc-blue transition-colors">
        <div className="flex items-center gap-3">
          {/* Color indicator */}
          <div
            className="w-4 h-4 rounded-sm shrink-0"
            style={{ backgroundColor: area.color ?? '#6B7280' }}
            aria-hidden="true"
          />

          {/* Area info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary truncate">{area.name}</p>
            <p className="text-sm text-text-secondary">
              {area.departmentCount} department{area.departmentCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Budget + percentage */}
          <div className="text-right shrink-0">
            <p className="font-semibold text-text-primary">
              {formatDollarsAbbreviated(area.operatingBudget)}
            </p>
            <p className="text-sm text-text-secondary">{percentage}%</p>
          </div>

          {/* Arrow indicator */}
          <span className="text-text-muted ml-1 shrink-0" aria-hidden="true">
            &rsaquo;
          </span>
        </div>
      </Card>
    </Link>
  )
}
