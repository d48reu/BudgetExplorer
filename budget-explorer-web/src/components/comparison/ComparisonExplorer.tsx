'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import { formatDollarsAbbreviated } from '@/lib/format'
import type { SerializedDepartmentChange } from '@/types/budget'

type ComparisonMetric = 'operating' | 'workforce' | 'capital'
type DirectionFilter = 'all' | 'increase' | 'decrease'

type ComparisonExplorerProps = {
  changes: SerializedDepartmentChange[]
  initialDepartment?: string
}

const metricOptions: Array<{
  value: ComparisonMetric
  label: string
}> = [
  { value: 'operating', label: 'Operating change' },
  { value: 'workforce', label: 'Funded position change' },
  { value: 'capital', label: 'Proposed capital plan' },
]

function metricValue(
  change: SerializedDepartmentChange,
  metric: ComparisonMetric
) {
  if (metric === 'workforce') return change.employeeChange ?? 0
  if (metric === 'capital') return Number(change.proposedCapital)
  return Number(change.operatingChange)
}

function formatMetric(value: number, metric: ComparisonMetric) {
  if (metric === 'workforce') {
    return `${value > 0 ? '+' : ''}${value.toLocaleString('en-US')}`
  }
  const amount = formatDollarsAbbreviated(Math.abs(value))
  return metric === 'capital' ? amount : `${value > 0 ? '+' : value < 0 ? '−' : ''}${amount}`
}

export function ComparisonExplorer({
  changes,
  initialDepartment = '',
}: ComparisonExplorerProps) {
  const [metric, setMetric] = useState<ComparisonMetric>('operating')
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [query, setQuery] = useState(
    changes.find((change) => change.slug === initialDepartment)?.name ??
      initialDepartment
  )
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const maximum = useMemo(
    () =>
      Math.max(
        ...changes.map((change) => Math.abs(metricValue(change, metric))),
        1
      ),
    [changes, metric]
  )

  const filtered = useMemo(() => {
    return changes
      .filter((change) => {
        if (
          deferredQuery &&
          !change.name.toLowerCase().includes(deferredQuery) &&
          !change.slug.toLowerCase().includes(deferredQuery)
        ) {
          return false
        }
        if (metric === 'capital' || direction === 'all') return true
        const value = metricValue(change, metric)
        return direction === 'increase' ? value > 0 : value < 0
      })
      .sort((a, b) => {
        const difference =
          Math.abs(metricValue(b, metric)) -
          Math.abs(metricValue(a, metric))
        return difference || a.name.localeCompare(b.name)
      })
  }, [changes, deferredQuery, direction, metric])

  return (
    <div>
      <div
        className={`grid gap-4 border-y border-text-primary py-5 ${
          metric === 'capital' ? 'md:grid-cols-2' : 'md:grid-cols-3'
        }`}
      >
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Department
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search departments"
            className="mt-2 w-full border border-text-primary bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
            Measure
          </span>
          <select
            value={metric}
            onChange={(event) => {
              setMetric(event.target.value as ComparisonMetric)
              setDirection('all')
            }}
            className="mt-2 w-full border border-text-primary bg-transparent px-3 py-2 text-sm text-text-primary"
          >
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {metric !== 'capital' && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
              Direction
            </span>
            <select
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as DirectionFilter)
              }
              className="mt-2 w-full border border-text-primary bg-transparent px-3 py-2 text-sm text-text-primary"
            >
              <option value="all">All changes</option>
              <option value="increase">Increases</option>
              <option value="decrease">Decreases</option>
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-text-primary py-4 text-xs font-bold uppercase tracking-[0.1em] text-text-secondary">
        <p aria-live="polite">
          {filtered.length} department{filtered.length === 1 ? '' : 's'}
        </p>
        {metric === 'capital' ? (
          <p>Green · proposed multi-year program</p>
        ) : (
          <p>
            <span className="text-change-increase">Blue · increase</span>
            <span className="mx-2 text-text-muted">/</span>
            <span className="text-change-decrease">Orange · decrease</span>
          </p>
        )}
      </div>

      <div role="list" aria-label={`${metricOptions.find((option) => option.value === metric)?.label} by department`}>
        {filtered.map((change) => {
          const value = metricValue(change, metric)
          const width = (Math.abs(value) / maximum) * (metric === 'capital' ? 100 : 50)
          const colorClass =
            metric === 'capital'
              ? 'bg-mdc-green'
              : value < 0
                ? 'bg-change-decrease'
                : 'bg-change-increase'
          const valueColor =
            metric === 'capital'
              ? 'text-text-primary'
              : value < 0
                ? 'text-change-decrease'
                : 'text-change-increase'

          return (
            <article
              key={change.id}
              role="listitem"
              className="grid gap-3 border-b border-border-strong py-5 md:grid-cols-[minmax(13rem,0.9fr)_minmax(18rem,1.4fr)_9rem] md:items-center md:gap-7"
            >
              <div>
                <Link
                  href={`/department/${change.slug}`}
                  className="font-heading text-base font-bold text-text-primary hover:text-mdc-blue"
                >
                  {change.name}
                </Link>
                <p className="mt-1 text-xs tabular-nums text-text-muted">
                  {metric === 'operating' &&
                    `${formatDollarsAbbreviated(change.baselineOperating)} → ${formatDollarsAbbreviated(change.proposedOperating)}`}
                  {metric === 'workforce' &&
                    `${change.baselineEmployees?.toLocaleString('en-US') ?? '—'} → ${change.proposedEmployees?.toLocaleString('en-US') ?? '—'} positions`}
                  {metric === 'capital' && 'Proposed multi-year capital program'}
                </p>
              </div>
              <div
                className="relative h-3 bg-border"
                role="img"
                aria-label={`${change.name}: ${formatMetric(value, metric)}`}
              >
                {metric !== 'capital' && (
                  <span
                    className="absolute bottom-[-0.3rem] left-1/2 top-[-0.3rem] w-px bg-text-primary"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`absolute inset-y-0 ${colorClass}`}
                  style={
                    metric === 'capital'
                      ? { left: 0, width: `${width}%` }
                      : value < 0
                        ? { right: '50%', width: `${width}%` }
                        : { left: '50%', width: `${width}%` }
                  }
                  aria-hidden="true"
                />
              </div>
              <p className={`font-heading text-xl font-bold tabular-nums md:text-right ${valueColor}`}>
                {formatMetric(value, metric)}
              </p>
            </article>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="border-b border-text-primary py-10 text-center text-text-secondary">
          No departments match these filters.
        </p>
      )}
    </div>
  )
}
