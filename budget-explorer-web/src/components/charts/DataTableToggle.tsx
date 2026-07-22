'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { TableColumn } from '@/types/budget'

type DataTableToggleProps<T> = {
  /** Label describing the chart, used in aria-label for the data table region. */
  chartLabel: string
  /** Data rows for the table view. */
  data: T[]
  /** Column definitions for the table. */
  columns: TableColumn<T>[]
  /** Stable field used as the React key for each table row. */
  rowKey: keyof T & string
  /** The chart component to display. */
  children: React.ReactNode
  /** Initial view mode. Defaults to 'chart'. */
  defaultView?: 'chart' | 'table'
}

/**
 * Renders a table from the provided data and columns.
 * Used both for the visible table toggle and the screen-reader-only copy.
 */
function DataTable<T>({
  chartLabel,
  data,
  columns,
  rowKey,
  className,
}: {
  chartLabel: string
  data: T[]
  columns: TableColumn<T>[]
  rowKey: keyof T & string
  className?: string
}) {
  return (
    <div
      role="region"
      aria-label={`Data table: ${chartLabel}`}
      className={className}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'py-2 px-3 font-medium text-text-secondary border-b border-border',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={String(row[rowKey])}
              className="border-b border-border last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    'py-2 px-3',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.format
                    ? col.format(row[col.key as keyof T])
                    : String(row[col.key as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Toggle wrapper that switches between a chart view and an accessible data table.
 * When the chart is shown, a visually hidden (sr-only) copy of the table is
 * always rendered so screen readers have tabular access to the data.
 */
export function DataTableToggle<T>({
  chartLabel,
  data,
  columns,
  rowKey,
  children,
  defaultView = 'chart',
}: DataTableToggleProps<T>) {
  const [showTable, setShowTable] = useState(defaultView === 'table')

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="text-sm text-mdc-blue hover:underline"
          aria-pressed={showTable}
        >
          {showTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {showTable ? (
        <DataTable
          chartLabel={chartLabel}
          data={data}
          columns={columns}
          rowKey={rowKey}
        />
      ) : (
        <>
          {/* Chart view */}
          <div>{children}</div>
          {/* Screen-reader-only table for accessibility */}
          <DataTable
            chartLabel={chartLabel}
            data={data}
            columns={columns}
            rowKey={rowKey}
            className="sr-only"
          />
        </>
      )}
    </div>
  )
}
