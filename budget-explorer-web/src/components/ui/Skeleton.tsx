import clsx from 'clsx'

type SkeletonProps = {
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-surface-secondary',
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
