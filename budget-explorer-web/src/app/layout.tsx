import { Inter } from 'next/font/google'
import { Navbar } from '@/components/layout/Navbar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { Footer } from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/next'
import { CANONICAL_DOMAIN } from '@/lib/constants'
import './globals.css'

import type { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_DOMAIN),
  title: {
    default: 'Miami-Dade Budget Explorer',
    template: '%s | Miami-Dade Budget Explorer',
  },
  description:
    "Miami-Dade County budget figures by department, strategic area, revenue source, and tax rate.",
  openGraph: {
    title: 'Miami-Dade Budget Explorer',
    description: 'Miami-Dade County adopted and proposed budget data.',
    siteName: 'Miami-Dade Budget Explorer',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface text-text-primary font-body antialiased">
        <Navbar />
        <main className="min-h-screen pb-16 md:pt-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
        <Analytics />
      </body>
    </html>
  )
}
