import type { ReactNode } from 'react'
import { Header } from '@/components/Header'

// Every page except the home page: the white header bar on top. The home page draws its own see-through header
// (app/page.tsx), so the right one is in the page from the first byte, with nothing to swap after it loads.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
    </>
  )
}
