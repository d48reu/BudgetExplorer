'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { NAV_ITEMS } from '@/lib/nav-config'

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-nav hidden md:block border-b border-border bg-surface">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="font-heading text-lg font-semibold text-text-primary"
        >
          Miami-Dade Budget Explorer
        </Link>
        <ul className="flex items-center gap-3 lg:gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-mdc-blue'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
