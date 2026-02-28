import clsx from 'clsx'

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  className?: string
}

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: never
  }

type ButtonAsLink = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string
  }

type ButtonProps = ButtonAsButton | ButtonAsLink

const baseStyles =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-heading font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mdc-blue disabled:opacity-50 disabled:cursor-not-allowed'

const variantStyles = {
  primary: 'bg-mdc-blue text-white hover:bg-mdc-blue/90',
  secondary:
    'border border-border text-text-primary hover:bg-surface-secondary',
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(baseStyles, variantStyles[variant], className)

  if ('href' in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  )
}
