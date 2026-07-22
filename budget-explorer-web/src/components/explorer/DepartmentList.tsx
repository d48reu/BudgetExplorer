'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedDepartment } from '@/types/budget'

type SortField = 'name' | 'operatingBudget' | 'employeeCount'
type SortDirection = 'asc' | 'desc'

type DepartmentListProps = {
  departments: SerializedDepartment[]
  areaColor: string | null
}

type SortIndicatorProps = {
  field: SortField
  activeField: SortField
  direction: SortDirection
}

function SortIndicator({ field, activeField, direction }: SortIndicatorProps) {
  if (activeField !== field) return null
  return (
    <span className="ml-1" aria-hidden="true">
      {direction === 'asc' ? '\u25B2' : '\u25BC'}
    </span>
  )
}

/**
 * Sortable department list table. Click column headers to toggle sort.
 * Department names link to /department/[slug].
 */
export function DepartmentList({ departments, areaColor }: DepartmentListProps) {
  const [sortField, setSortField] = useState<SortField>('operatingBudget')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sorted = useMemo(() => {
    const copy = [...departments]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'operatingBudget':
          cmp = toChartValue(a.operatingBudget) - toChartValue(b.operatingBudget)
          break
        case 'employeeCount':
          cmp = (a.employeeCount ?? 0) - (b.employeeCount ?? 0)
          break
      }
      return sortDirection === 'desc' ? -cmp : cmp
    })
    return copy
  }, [departments, sortField, sortDirection])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'name' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th
              className="py-2 px-3 font-medium text-text-secondary text-left border-b border-border"
              aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className="w-full cursor-pointer select-none text-left hover:text-text-primary"
                onClick={() => handleSort('name')}
              >
                Department
                <SortIndicator field="name" activeField={sortField} direction={sortDirection} />
              </button>
            </th>
            <th
              className="py-2 px-3 font-medium text-text-secondary text-right border-b border-border"
              aria-sort={sortField === 'operatingBudget' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className="w-full cursor-pointer select-none text-right hover:text-text-primary"
                onClick={() => handleSort('operatingBudget')}
              >
                Operating Budget
                <SortIndicator field="operatingBudget" activeField={sortField} direction={sortDirection} />
              </button>
            </th>
            <th
              className="py-2 px-3 font-medium text-text-secondary text-right border-b border-border"
              aria-sort={sortField === 'employeeCount' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className="w-full cursor-pointer select-none text-right hover:text-text-primary"
                onClick={() => handleSort('employeeCount')}
              >
                Employees
                <SortIndicator field="employeeCount" activeField={sortField} direction={sortDirection} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((dept) => (
            <tr key={dept.id} className="border-b border-border last:border-0 hover:bg-surface-secondary">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: areaColor ?? '#6B7280' }}
                    aria-hidden="true"
                  />
                  <Link
                    href={`/department/${dept.slug}`}
                    className="text-mdc-blue hover:underline"
                  >
                    {dept.name}
                  </Link>
                </div>
              </td>
              <td className="py-2 px-3 text-right">
                {formatDollarsAbbreviated(dept.operatingBudget)}
              </td>
              <td className="py-2 px-3 text-right">
                {dept.employeeCount != null ? dept.employeeCount.toLocaleString() : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
