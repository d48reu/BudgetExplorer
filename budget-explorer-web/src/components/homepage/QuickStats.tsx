'use client'

import { Card } from '@/components/ui/Card'
import { BudgetTerm } from '@/components/ui/BudgetTerm'
import { GLOSSARY_TERMS } from '@/lib/glossary'

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
  const strategicAreaTerm = GLOSSARY_TERMS.find((t) => t.term === 'Strategic Area')

  const stats: { value: string; label: React.ReactNode; key: string }[] = [
    {
      value: strategicAreaCount.toLocaleString('en-US'),
      label: strategicAreaTerm ? (
        <BudgetTerm term={strategicAreaTerm.term} definition={strategicAreaTerm.definition}>
          Strategic Areas
        </BudgetTerm>
      ) : (
        'Strategic Areas'
      ),
      key: 'strategic-areas',
    },
    { value: departmentCount.toLocaleString('en-US'), label: 'Departments', key: 'departments' },
    { value: totalEmployees.toLocaleString('en-US'), label: 'County Employees', key: 'employees' },
    { value: fiscalYear, label: 'Budget Year', key: 'budget-year' },
  ]

  return (
    <section aria-label="Key figures" className="max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.key} className="text-center">
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
