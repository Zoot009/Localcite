import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { SITE } from '@/lib/site'
import './globals.css'

// One family for text, headings and the logo. Extra subsets cover place names like Kraków, Széchenyi and Hoàn Kiếm.
const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin', 'latin-ext', 'vietnamese'] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} – ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: 'Addresses, phone numbers, opening hours, directions and reviews for local businesses.',
  openGraph: { siteName: SITE.name, type: 'website' },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Each page brings its own header, <main> and footer: the home page its see-through header (app/page.tsx), the
            rest the white bar (app/(site)/layout.tsx). */}
        {children}
      </body>
    </html>
  )
}
