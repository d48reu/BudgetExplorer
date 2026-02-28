import { Card } from '@/components/ui/Card'

type QuickStatsProps = {
  strategicAreaCount: number
  departmentCount: number
  totalEmployees: number
  fiscalYear: string
}

export function QuickStats({
  strategicAreaCount,
  departmentCount,
  totalEmployees,
  fiscalYear,
}: QuickStatsProps) {
  const stats = [
    { value: strategicAreaCount.toLocaleString('en-US'), label: 'Strategic Areas' },
    { value: departmentCount.toLocaleString('en-US'), label: 'Departments' },
    { value: totalEmployees.toLocaleString('en-US'), label: 'County Employees' },
    { value: fiscalYear, label: 'Budget Year' },
  ]

  return (
    <section aria-label="Key figures" className="max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="text-2xl md:text-3xl font-heading font-bold">
              {stat.value}
            </p>
            <p className="text-text-secondary text-sm mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
