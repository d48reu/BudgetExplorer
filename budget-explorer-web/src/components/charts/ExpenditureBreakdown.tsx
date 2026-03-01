'use client'

import type { SerializedExpenditure } from '@/types/budget'

type ExpenditureBreakdownProps = {
  data: SerializedExpenditure[]
  areaColor: string
}

/**
 * Expenditure category breakdown horizontal bar chart.
 * Placeholder -- full implementation in Task 3.
 */
export function ExpenditureBreakdown({ data, areaColor }: ExpenditureBreakdownProps) {
  return (
    <div className="text-text-secondary text-sm">
      Loading expenditure breakdown...
    </div>
  )
}
