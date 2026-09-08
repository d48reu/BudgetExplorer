import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Staff workspace',
  description: 'Internal issue briefs and source review.',
  robots: { index: false, follow: false, noarchive: true },
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children
}
