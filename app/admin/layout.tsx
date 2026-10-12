import type { Metadata } from 'next'

// Private: no public header or footer, and kept out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <div className="flex flex-1 flex-col bg-zinc-50">{children}</div>
}
