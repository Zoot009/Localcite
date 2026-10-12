import Link from 'next/link'
import { SearchForm } from '@/components/ui'

// Pages that call notFound() (an unknown city, category or business) render this inside the (site) layout, header
// included. URLs no route matches at all get app/not-found.tsx, which wraps this in the header itself.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>🧭</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">We couldn’t find that page</h1>
      <p className="mt-2 text-zinc-600">The business or page may have moved. Try searching instead.</p>
      <div className="mt-8 text-left">
        <SearchForm />
      </div>
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">Back to home</Link>
    </div>
  )
}
