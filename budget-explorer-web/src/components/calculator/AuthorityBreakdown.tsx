'use client'

import { useMemo } from 'react'
import type { TaxByAuthority } from '@/lib/tax-math'
import type { TableColumn } from '@/types/budget'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTableToggle } from '@/components/charts/DataTableToggle'

type AuthorityBreakdownProps = {
  breakdown: TaxByAuthority[]
  totalTax: number
}

/**
 * Color palette for taxing authorities.
 * County authorities get blue shades (MDC brand), non-county get distinct hues.
 * Mapped by index as authorities arrive sorted by displayOrder (county first).
 */
const AUTHORITY_COLORS = [
  '#0057B8', // County primary (MDC blue)
  '#3B82F6', // County secondary
  '#1D4ED8', // County tertiary
  '#10B981', // School Board (green)
  '#14B8A6', // Children's Trust (teal)
  '#8B5CF6', // Water Management (purple)
  '#F59E0B', // Other (amber)
  '#EF4444', // Overflow (red)
  '#6366F1', // Overflow (indigo)
]

function getAuthorityColor(index: number): string {
  return AUTHORITY_COLORS[index % AUTHORITY_COLORS.length]
}

/**
 * Horizontal stacked bar chart rendered as SVG.
 * Each segment represents one taxing authority proportional to its share.
 */
function StackedBar({
  segments,
  width,
}: {
  segments: { authority: string; taxAmount: number; color: string }[]
  width: number
}) {
  const total = segments.reduce((s, seg) => s + seg.taxAmount, 0)
  const barHeight = 40

  // Build cumulative offsets without mutating render-local state.
  const bars = segments.reduce<
    Array<(typeof segments)[number] & { x0: number; barWidth: number }>
  >((result, seg) => {
    const previous = result.at(-1)
    const x0 = previous ? previous.x0 + previous.barWidth : 0
    const barWidth = total > 0 ? (seg.taxAmount / total) * width : 0
    return [...result, { ...seg, x0, barWidth }]
  }, [])

  return (
    <svg
      width={width}
      height={barHeight}
      role="img"
      aria-label="Tax breakdown by taxing authority"
    >
      {bars.map((bar) => (
        <rect
          key={bar.authority}
          x={bar.x0}
          y={0}
          width={Math.max(bar.barWidth, 2)}
          height={barHeight}
          fill={bar.color}
          rx={0}
        />
      ))}
    </svg>
  )
}

/**
 * Formats a dollar amount for display in the authority table.
 */
function formatDollarAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Authority breakdown section: horizontal stacked bar chart + visible detail table.
 * The stacked bar chart is wrapped in DataTableToggle for screen reader accessibility.
 * The detail table is always visible below.
 */
export function AuthorityBreakdown({ breakdown, totalTax }: AuthorityBreakdownProps) {
  // Assign colors to each authority by index
  const coloredBreakdown = useMemo(
    () => breakdown.map((item, i) => ({ ...item, color: getAuthorityColor(i) })),
    [breakdown]
  )

  // Accessible table columns for DataTableToggle sr-only table
  const accessibleColumns: TableColumn<TaxByAuthority>[] = [
    { key: 'authority', label: 'Authority', align: 'left' },
    {
      key: 'taxAmount',
      label: 'Tax Amount',
      align: 'right',
      format: (v) => `$${(v as number).toFixed(2)}`,
    },
    {
      key: 'percentage',
      label: 'Share',
      align: 'right',
      format: (v) => `${(v as number).toFixed(1)}%`,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Stacked bar chart wrapped in DataTableToggle for accessibility */}
      <DataTableToggle
        chartLabel="Tax breakdown by taxing authority"
        data={breakdown}
        columns={accessibleColumns}
        rowKey="authority"
      >
        <ChartContainer minHeight={40} className="max-h-[60px]">
          {({ width }) => (
            <StackedBar
              segments={coloredBreakdown.map((b) => ({
                authority: b.authority,
                taxAmount: b.taxAmount,
                color: b.color,
              }))}
              width={width}
            />
          )}
        </ChartContainer>
      </DataTableToggle>

      {/* Educational note about millage rates */}
      <p className="border-l-2 border-mdc-blue pl-3 text-xs text-text-secondary">
        One mill equals $1 of tax per $1,000 of assessed value.
      </p>

      {/* Visible authority detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border-b border-text-primary px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                Authority
              </th>
              <th className="border-b border-text-primary px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                Millage rate
              </th>
              <th className="border-b border-text-primary px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                Estimated tax
              </th>
              <th className="border-b border-text-primary px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {coloredBreakdown.map((item) => (
              <tr
                key={item.authority}
                className="border-b border-text-primary/20 last:border-0 even:bg-white/55"
              >
                <td className="py-2 px-3 text-left">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    {item.authority}
                  </span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {item.millageRate.toFixed(4)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {formatDollarAmount(item.taxAmount)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {item.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="border-t-2 border-text-primary font-bold">
              <td className="py-2 px-3 text-left">Total</td>
              <td className="py-2 px-3 text-right tabular-nums">
                {breakdown.reduce((sum, b) => sum + b.millageRate, 0).toFixed(4)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {formatDollarAmount(totalTax)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {totalTax > 0 ? '100.0%' : '0.0%'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
