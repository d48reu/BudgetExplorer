import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-7xl font-heading font-bold text-text-primary">
        404
      </h1>
      <p className="mt-4 text-lg text-text-secondary max-w-md">
        This page doesn&apos;t exist in the budget. It may have been moved or
        the URL might be incorrect.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-mdc-blue px-6 py-3 text-sm font-medium text-white hover:bg-mdc-blue/90 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/explorer"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
        >
          Explore Budget
        </Link>
      </div>
    </div>
  )
}
