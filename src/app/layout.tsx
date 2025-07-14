import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ScrollLater - Capture and Schedule Your Ideas',
  description: 'A mobile-first platform to capture links, ideas, and tasks from various sources and intelligently schedule time to revisit them.',
  keywords: 'productivity, content management, scheduling, AI, bookmarks',
  authors: [{ name: 'ScrollLater Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 