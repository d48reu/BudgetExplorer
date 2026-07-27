import Link from 'next/link'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedStrategicArea } from '@/types/budget'

type AreaWithDetails = SerializedStrategicArea & {
  description: string | null
  departmentCount: number
}

type StrategicAreaIndexProps = {
  areas: AreaWithDetails[]
  totalOperating: string
}

export function StrategicAreaIndex({
  areas,
  totalOperating,
}: StrategicAreaIndexProps) {
  const maximum = Math.max(
    ...areas.map((area) => Number(area.operatingBudget)),
    1
  )

  return (
    <ol className="border-t-2 border-text-primary">
      {areas.map((area, index) => {
        const share =
          Number(totalOperating) > 0
            ? (Number(area.operatingBudget) / Number(totalOperating)) * 100
            : 0
        const width = (Number(area.operatingBudget) / maximum) * 100

        return (
          <li key={area.id} className="border-b border-border-strong">
            <Link
              href={`/explorer/${area.slug}`}
              className="group grid gap-4 py-5 md:grid-cols-[2.5rem_minmax(12rem,1fr)_minmax(12rem,0.75fr)_8rem] md:items-center md:gap-6"
            >
              <span className="text-xs tabular-nums text-text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="flex items-center gap-3 font-heading text-lg font-bold text-text-primary group-hover:text-mdc-blue">
                  <span
                    className="h-3 w-3 shrink-0"
                    style={{ backgroundColor: area.color ?? '#6B7280' }}
                    aria-hidden="true"
                  />
                  {area.name}
                </span>
                <span className="mt-1 block text-sm leading-5 text-text-secondary">
                  {area.departmentCount} department
                  {area.departmentCount === 1 ? '' : 's'}
                  {area.description ? ` · ${area.description}` : ''}
                </span>
              </span>
              <span className="block">
                <span className="block h-2 bg-border" aria-hidden="true">
                  <span
                    className="block h-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: area.color ?? '#6B7280',
                    }}
                  />
                </span>
                <span className="mt-2 block text-xs text-text-muted">
                  {share.toFixed(1)}% of gross operating
                </span>
              </span>
              <span className="text-left md:text-right">
                <span className="block font-heading text-xl font-bold tabular-nums text-text-primary">
                  {formatDollarsAbbreviated(area.operatingBudget)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {area.centsPerDollar ?? 0}¢ per dollar
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
