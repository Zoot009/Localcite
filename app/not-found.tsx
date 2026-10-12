import { Header } from '@/components/Header'
import SiteNotFound from './(site)/not-found'

// URLs that no route matches render here, outside the (site) layout, so this adds the header itself.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <SiteNotFound />
      </main>
    </>
  )
}
