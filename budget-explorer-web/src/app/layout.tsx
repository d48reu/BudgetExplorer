import { Inter } from 'next/font/google'
import './globals.css'

import type { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
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
      <body className="font-body antialiased">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
