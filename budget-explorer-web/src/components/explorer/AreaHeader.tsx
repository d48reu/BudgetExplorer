import { formatDollarsFull } from '@/lib/format'
import type { SerializedStrategicArea } from '@/types/budget'

type AreaHeaderProps = {
  area: SerializedStrategicArea & { description: string | null; departmentCount: number }
}

/**
 * Area detail page header showing area name, color swatch, budget stats, and description.
 * Server-compatible component (no 'use client' needed).
 */
export function AreaHeader({ area }: AreaHeaderProps) {
  return (
    <div className="mb-8">
      {/* Name + color swatch */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-5 h-5 rounded-sm shrink-0"
          style={{ backgroundColor: area.color ?? '#6B7280' }}
          aria-hidden="true"
        />
        <h1 className="text-2xl font-heading font-bold text-text-primary">
          {area.name}
        </h1>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary mb-4">
        <span className="font-medium text-text-primary text-base">
          {formatDollarsFull(area.operatingBudget)}
        </span>
        <span>
          {area.departmentCount} department{area.departmentCount !== 1 ? 's' : ''}
        </span>
        {area.centsPerDollar != null && (
          <span>
            {area.centsPerDollar} cent{area.centsPerDollar !== 1 ? 's' : ''} of every dollar
          </span>
        )}
      </div>

      {/* Description */}
      {area.description && (
        <p className="text-text-secondary leading-relaxed max-w-prose">
          {area.description}
        </p>
      )}
    </div>
  )
}
