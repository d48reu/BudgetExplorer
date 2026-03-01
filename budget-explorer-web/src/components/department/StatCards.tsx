import { Card } from '@/components/ui/Card'
import { formatDollarsAbbreviated } from '@/lib/format'

type StatCardsProps = {
  operatingBudget: string
  capitalBudget: string
  employeeCount: number | null
  yoyChange: {
    value: string
    direction: 'increase' | 'decrease' | 'unchanged'
  } | null
}

const directionColors: Record<string, string> = {
  increase: 'text-[#0057B8]',
  decrease: 'text-[#F7941D]',
  unchanged: 'text-text-secondary',
}

export function StatCards({
  operatingBudget,
  capitalBudget,
  employeeCount,
  yoyChange,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <p className="text-xs text-text-secondary uppercase tracking-wider">
          Operating Budget
        </p>
        <p className="text-xl font-heading font-bold text-text-primary mt-1">
          {formatDollarsAbbreviated(operatingBudget)}
        </p>
      </Card>

      <Card>
        <p className="text-xs text-text-secondary uppercase tracking-wider">
          Capital Budget
        </p>
        <p className="text-xl font-heading font-bold text-text-primary mt-1">
          {formatDollarsAbbreviated(capitalBudget)}
        </p>
      </Card>

      <Card>
        <p className="text-xs text-text-secondary uppercase tracking-wider">
          Employees
        </p>
        <p className="text-xl font-heading font-bold text-text-primary mt-1">
          {employeeCount !== null ? employeeCount.toLocaleString() : 'N/A'}
        </p>
      </Card>

      <Card>
        <p className="text-xs text-text-secondary uppercase tracking-wider">
          YoY Change
        </p>
        <p
          className={`text-xl font-heading font-bold mt-1 ${
            yoyChange ? directionColors[yoyChange.direction] : 'text-text-secondary'
          }`}
        >
          {yoyChange ? yoyChange.value : 'N/A'}
        </p>
      </Card>
    </div>
  )
}
