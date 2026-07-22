import { formatDollarsAbbreviated, formatYoYChange } from '@/lib/format'

type ComparisonCardProps = {
  label: string
  proposed: string
  adopted: string | null
  note: string
}

export function ComparisonCard({
  label,
  proposed,
  adopted,
  note,
}: ComparisonCardProps) {
  const change = adopted ? formatYoYChange(proposed, adopted) : null

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="mt-2 font-heading text-3xl font-bold text-text-primary">
        {formatDollarsAbbreviated(proposed)}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
        {change && (
          <span
            className={
              change.direction === 'increase'
                ? 'font-semibold text-change-increase'
                : 'font-semibold text-change-decrease'
            }
          >
            {change.value}
          </span>
        )}
        <span className="text-text-secondary">{note}</span>
      </div>
    </article>
  )
}
