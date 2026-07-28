import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
        Error 404
      </p>
      <h1 className="mt-3 text-4xl font-heading font-bold text-text-primary">
        Page not found
      </h1>
      <p className="mt-4 text-lg text-text-secondary max-w-md">
        The address may be incorrect, or the page may have moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-mdc-blue px-6 py-3 text-sm font-medium text-white hover:bg-mdc-blue/90 transition-colors"
        >
          Adopted budget
        </Link>
        <Link
          href="/explorer"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
        >
          Browse departments
        </Link>
      </div>
    </div>
  )
}
