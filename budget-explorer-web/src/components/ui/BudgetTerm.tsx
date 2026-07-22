'use client'

/* eslint-disable react-hooks/refs -- Floating UI exposes callback ref setters on `refs`; these are not reads of mutable ref state. */

import { useState } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'

type BudgetTermProps = {
  term: string
  definition: string
  children: React.ReactNode
}

export function BudgetTerm({ term, definition, children }: BudgetTermProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, { move: false })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="border-b border-dotted border-text-secondary cursor-help"
        tabIndex={0}
        aria-describedby={isOpen ? `tooltip-${term}` : undefined}
      >
        {children}
      </span>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            id={`tooltip-${term}`}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-tooltip max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
            role="tooltip"
          >
            <strong className="font-heading">{term}</strong>
            <p className="mt-1 text-text-secondary">{definition}</p>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
