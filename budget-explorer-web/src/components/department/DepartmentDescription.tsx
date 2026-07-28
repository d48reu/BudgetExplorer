import { getServiceSummary } from '@/lib/department-copy'

type DepartmentDescriptionProps = {
  summary: string
  slug: string
  fiscalYear: string
}

export function DepartmentDescription({
  summary,
  slug,
  fiscalYear,
}: DepartmentDescriptionProps) {
  return (
    <div>
      <p className="text-text-primary leading-relaxed">
        {getServiceSummary(summary, slug)}
      </p>
      <p className="mt-2 text-xs text-text-tertiary">
        Computer-generated service summary based on the {fiscalYear} adopted
        budget.
      </p>
    </div>
  )
}
