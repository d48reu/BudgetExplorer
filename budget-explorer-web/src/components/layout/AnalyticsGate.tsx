'use client'

import { Analytics } from '@vercel/analytics/next'
import { usePathname } from 'next/navigation'

export function AnalyticsGate() {
  const pathname = usePathname()
  return pathname.startsWith('/staff') ? null : <Analytics />
}
