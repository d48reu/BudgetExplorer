import Link from 'next/link'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedDepartment } from '@/types/budget'

type RelatedDepartmentsProps = {
  departments: SerializedDepartment[]
  areaName: string
  areaSlug: string
}

export function RelatedDepartments({
  departments,
  areaName,
  areaSlug,
}: RelatedDepartmentsProps) {
  if (departments.length === 0) return null

  return (
    <div>
      <ol className="grid border-t-2 border-text-primary sm:grid-cols-2 sm:gap-x-8">
        {departments.map((dept) => (
          <li key={dept.id} className="border-b border-border-strong">
            <Link
              href={`/department/${dept.slug}`}
              className="flex items-baseline justify-between gap-4 py-4 font-heading font-bold text-text-primary hover:text-mdc-blue"
            >
              <span>{dept.name}</span>
              <span className="shrink-0 tabular-nums text-text-secondary">
                {formatDollarsAbbreviated(dept.operatingBudget)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href={`/explorer/${areaSlug}`}
        className="mt-5 inline-block font-heading text-sm font-bold underline decoration-mdc-blue decoration-2 underline-offset-4 hover:text-mdc-blue"
      >
        View every department in {areaName} <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
