'use client'

import { useRef, useState, useEffect } from 'react'
import clsx from 'clsx'
import { Skeleton } from '@/components/ui/Skeleton'

type ChartContainerProps = {
  /** Desired width/height ratio (e.g., 16/9). If omitted, uses minHeight-based calculation. */
  aspectRatio?: number
  /** Minimum chart height in pixels. Defaults to 300. */
  minHeight?: number
  /** Additional CSS classes for the outer wrapper. */
  className?: string
  /** Render prop: receives measured dimensions to size the chart. */
  children: (dimensions: { width: number; height: number }) => React.ReactNode
}

/**
 * Responsive chart wrapper that measures its container via ResizeObserver
 * and passes width/height to children via render prop. Shows a Skeleton
 * loading placeholder until dimensions are measured.
 */
export function ChartContainer({
  aspectRatio,
  minHeight = 300,
  className,
  children,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      if (width === 0) return
      const height = aspectRatio
        ? width / aspectRatio
        : Math.max(minHeight, width * 0.6)
      setDimensions({ width, height })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [aspectRatio, minHeight])

  return (
    <div ref={containerRef} className={clsx('w-full', className)}>
      {dimensions
        ? children(dimensions)
        : <Skeleton className="w-full" height={`${minHeight}px`} />
      }
    </div>
  )
}
