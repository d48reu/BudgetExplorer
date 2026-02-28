'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { NAV_ITEMS } from '@/lib/nav-config'

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-nav flex h-16 items-center justify-around border-t border-border bg-surface md:hidden"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center gap-1 text-xs font-medium transition-colors',
              isActive
                ? 'text-mdc-blue'
                : 'text-text-secondary hover:text-text-primary'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
