'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { toChartValue } from '@/lib/chart-utils'
import { formatDollarsAbbreviated } from '@/lib/format'

type TreemapItem = {
  name: string
  slug: string
  color: string | null
  value: string // cents as string
}

type TreemapProps = {
  items: TreemapItem[]
  width: number
  height: number
  linkPrefix: string // e.g., "/explorer/" or "/department/"
  ariaLabel: string
}

type TreemapRootData = {
  name: string
  children?: TreemapItem[]
}

/**
 * D3-powered treemap visualization with click navigation and hover highlighting.
 * Follows the "D3 computes, React renders" pattern: D3 calculates rectangle positions,
 * React renders all SVG elements declaratively.
 */
export function Treemap({ items, width, height, linkPrefix, ariaLabel }: TreemapProps) {
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const leaves = useMemo(() => {
    const root = hierarchy<TreemapRootData>({ name: 'root', children: items })
      .sum((d) => ('value' in d && d.value !== undefined) ? toChartValue((d as TreemapItem).value) : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    return treemap<TreemapRootData>()
      .size([width, height])
      .padding(3)
      .round(true)
      .tile(treemapSquarify)(root)
      .leaves()
  }, [items, width, height])

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      style={{ touchAction: 'manipulation' }}
    >
      <title>Miami-Dade County Budget Treemap</title>
      {leaves.map((leaf) => {
        const d = leaf.data as TreemapItem
        const w = leaf.x1 - leaf.x0
        const h = leaf.y1 - leaf.y0
        const isHovered = hoveredItem === d.slug
        const hasDimmedItems = hoveredItem !== null

        return (
          <g
            key={d.slug}
            onClick={() => router.push(`${linkPrefix}${d.slug}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.push(`${linkPrefix}${d.slug}`)
              }
            }}
            onMouseEnter={() => setHoveredItem(d.slug)}
            onMouseLeave={() => setHoveredItem(null)}
            role="button"
            tabIndex={0}
            aria-label={`${d.name}: ${formatDollarsAbbreviated(d.value)} operating budget`}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={leaf.x0}
              y={leaf.y0}
              width={w}
              height={h}
              fill={d.color ?? '#6B7280'}
              opacity={hasDimmedItems && !isHovered ? 0.5 : 1}
              rx={4}
              className="transition-opacity duration-150"
            />
            {/* Show name label if cell is large enough */}
            {w > 60 && h > 30 && (
              <text
                x={leaf.x0 + 8}
                y={leaf.y0 + 20}
                fill="white"
                fontSize={w > 120 ? 14 : 11}
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {d.name}
              </text>
            )}
            {/* Show dollar amount if cell is tall enough */}
            {w > 60 && h > 50 && (
              <text
                x={leaf.x0 + 8}
                y={leaf.y0 + 38}
                fill="rgba(255,255,255,0.8)"
                fontSize={12}
                style={{ pointerEvents: 'none' }}
              >
                {formatDollarsAbbreviated(d.value)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
