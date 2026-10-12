import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist } from 'next/font/google'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { SITE } from '@/lib/site'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const display = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'] }) // headings

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} – ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: 'Addresses, phone numbers, opening hours, directions and reviews for local businesses.',
  openGraph: { siteName: SITE.name, type: 'website' },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // data-theme is light by default; the inline script switches to a saved "dark" choice before the first paint.
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${geist.variable} ${display.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
