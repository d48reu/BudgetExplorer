import { Inter } from 'next/font/google'
import { Navbar } from '@/components/layout/Navbar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { Footer } from '@/components/layout/Footer'
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
    "See where your tax dollars go. Explore Miami-Dade County's $13.2 billion budget with interactive visualizations.",
  openGraph: {
    title: 'Miami-Dade Budget Explorer',
    description: 'See where your tax dollars go.',
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
        {/* TODO: Add Umami analytics before public launch - self-hosted on Vercel, free tier */}
      </body>
    </html>
  )
}
