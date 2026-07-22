import Link from 'next/link'

type ReleaseSwitcherProps = {
  activeStage: 'adopted' | 'proposed'
}

const releases = [
  {
    stage: 'adopted' as const,
    label: 'Adopted',
    fiscalYear: 'FY 2025–26',
    href: '/',
  },
  {
    stage: 'proposed' as const,
    label: 'Proposed',
    fiscalYear: 'FY 2026–27',
    href: '/proposed',
  },
]

export function ReleaseSwitcher({ activeStage }: ReleaseSwitcherProps) {
  return (
    <nav
      aria-label="Budget release"
      className="grid border-y border-text-primary sm:grid-cols-[9rem_1fr]"
    >
      <p className="flex items-center py-3 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary sm:border-r sm:border-text-primary sm:pr-5">
        Budget release
      </p>
      <div className="grid grid-cols-2 border-t border-text-primary sm:border-t-0">
        {releases.map((release) => {
          const isActive = release.stage === activeStage
          return (
            <Link
              key={release.stage}
              href={release.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-baseline justify-between gap-3 border-b-4 px-3 py-3 transition-colors sm:px-5 ${
                isActive
                  ? 'border-mdc-blue text-text-primary'
                  : 'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary'
              }`}
            >
              <span className="font-heading font-bold">{release.label}</span>
              <span className="text-xs tabular-nums">{release.fiscalYear}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
