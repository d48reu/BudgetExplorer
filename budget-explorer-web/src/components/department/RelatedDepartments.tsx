import Link from 'next/link'
import { Card } from '@/components/ui/Card'
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
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          More in {areaName}
        </h2>
        <Link
          href={`/explorer/${areaSlug}`}
          className="text-sm text-mdc-blue hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Link key={dept.id} href={`/department/${dept.slug}`}>
            <Card className="hover:border-text-secondary transition-colors">
              <p className="font-medium text-text-primary">{dept.name}</p>
              <p className="text-sm text-text-secondary mt-1">
                {formatDollarsAbbreviated(dept.operatingBudget)}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
