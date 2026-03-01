'use client'

import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

type ChartTooltipProps = {
  /** Tooltip body content. */
  content: React.ReactNode
  /** The trigger element (e.g., a chart cell or slice wrapper). */
  children: React.ReactNode
  /** Controlled open state -- the parent chart manages hover/focus. */
  open: boolean
  /** Callback when open state should change. */
  onOpenChange: (open: boolean) => void
}

/**
 * Shared controlled tooltip for chart elements.
 * Uses @floating-ui/react with the same styling as BudgetTerm:
 *   z-tooltip max-w-xs rounded-md border border-border bg-surface
 *   px-3 py-2 text-sm text-text-primary shadow-sm
 *
 * The parent chart component manages open/close state (because chart
 * elements handle their own hover/focus) and passes `open` and
 * `onOpenChange` to control visibility.
 */
export function ChartTooltip({
  content,
  children,
  open,
  onOpenChange,
}: ChartTooltipProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })

  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    dismiss,
    role,
  ])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        style={{ display: 'contents' }}
      >
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-tooltip max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
            role="tooltip"
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
