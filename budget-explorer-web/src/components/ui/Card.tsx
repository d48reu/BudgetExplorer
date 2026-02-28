import clsx from 'clsx'

type CardProps = {
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ header, footer, children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-border bg-surface',
        className
      )}
    >
      {header && (
        <div className="border-b border-border px-(--spacing-card) py-3">
          {header}
        </div>
      )}
      <div className="px-(--spacing-card) py-(--spacing-card)">
        {children}
      </div>
      {footer && (
        <div className="border-t border-border px-(--spacing-card) py-3">
          {footer}
        </div>
      )}
    </div>
  )
}
