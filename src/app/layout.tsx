import type { Metadata } from 'next'
import { Geist, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { THEME_SCRIPT } from '@/components/landing/ThemeToggle'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = JetBrains_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const display = Instrument_Serif({
  variable: '--font-display',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Jev Landing Lab',
  description:
    'Describe a product. Jev makes the design decisions. Three interactive landing pages come back.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // The inline theme script sets data-theme before hydration; React must
      // not treat that as a mismatch.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-theme before first paint so the palette never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
